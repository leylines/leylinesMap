"use strict";

import * as geometry from "./createGeometry.js";
import * as html from "./createHTML.js";
import * as kml from "./createKml.js";
import * as czml from "./createCzml.js";

export async function pgCreatePoint(
  pool,
  schema,
  table,
  filterField,
  type,
  image
) {
  const client = await pool.connect();
  let rows;

  try {
    const escapedSchema = client.escapeIdentifier(schema);
    const escapedTable = client.escapeIdentifier(table);
    const fullTableName = `${escapedSchema}.${escapedTable}`;

    const escapedFilter = filterField
      ? client.escapeIdentifier(filterField)
      : null;

    const sql = `
      SELECT * FROM ${fullTableName}
      ${escapedFilter && type ? `WHERE ${escapedFilter} = $1` : ""}`;

    const result =
      escapedFilter && type
        ? await client.query(sql, [type])
        : await client.query(sql);

    rows = result.rows;
  } catch (error) {
    console.error("Database Error in pgCreatePoint:", error);
    throw error;
  } finally {
    client.release();
  }

  let iconFolderBase, defaultIconName, initialScale;
  let scaleSymbols = false;
  const pixelOffset = [0, 0];

  if (
    schema === "interfaithmary" ||
    schema === "sacredsites" ||
    schema === "unesco" ||
    schema === "starcities" ||
    schema === "cartedeshautslieux"
  ) {
    defaultIconName = image;
    initialScale = 0;
    scaleSymbols = true;
  } else if (image) {
    iconFolderBase = "icons";
    defaultIconName = image;
    initialScale = 0.2;
  } else if (schema === "leylines") {
    iconFolderBase = "poi";
    defaultIconName = type;
    initialScale = 0.04;
    scaleSymbols = true;
  } else if (schema === "ramar") {
    iconFolderBase = `${schema}`;
    defaultIconName = type;
    initialScale = 0.5;
  } else {
    iconFolderBase = `${schema}`;
    defaultIconName = type;
    initialScale = 0.5;
    scaleSymbols = true;
  }

  const newPackets = [];

  for (let i = 0; i < rows.length; i++) {
    let importance = 10;
    const row = rows[i];
    const featureDescription = html.createFeatureInfo(row, schema, "internal");
    const activeIconName = String(
      row.icon || defaultIconName || "default"
    ).toLowerCase();
    const finalScale = row.importance
      ? (0.1 * row.importance + 1) * initialScale
      : initialScale;
    if (row.importance) {
      importance = row.importance * 2;
    }
    const finalIcon =
      initialScale === 0
        ? activeIconName
        : `/images/${iconFolderBase}/${activeIconName}.png`;
    czml.createPoint(
      newPackets,
      row,
      featureDescription,
      scaleSymbols,
      importance,
      finalScale,
      finalIcon,
      pixelOffset
    );
  }

  return newPackets;
}

export async function pgFindPOI(pool, points, lines, distance, color) {
  const wktLines = lines
    .map((line) => {
      const p1 = points[line[0]];
      const p2 = points[line[1]];
      return `(${p1[1]} ${p1[2]} 0, ${p2[1]} ${p2[2]} 0)`;
    })
    .join(",");

  const client = await pool.connect();
  const newPackets = [];

  try {
    const selectPoints = `
      SELECT id, name, description, importance, x_coord, y_coord, z_coord
      FROM leylines.poi
      WHERE ST_DWithin(
        geom::geography, 
        ST_GeomFromText($1, 4326)::geography, 
        $2,
        false -- Der "use_spheroid" Parameter auf false spart Rechenzeit und verhindert oft Artefakte
      )
    `;

    const { rows } = await client.query(selectPoints, [
      `MULTILINESTRINGZ(${wktLines})`,
      distance
    ]);

    // 3. Icons und Pakete (Synchron!)
    const iconColor = `${color[0]}-${color[1]}-${color[2]}`;

    for (const row of rows) {
      // Wir bereiten das Objekt für createFeatureInfo vor
      const featureDescription = html.createFeatureInfo(row, "poi", "internal");

      const icon = `/images/icons/star_${iconColor}.svg`;
      //const finalScale = row.importance * 0.03;
      const importance = row.importance * 2;

      // Wir pushen direkt in unser neues Array
      czml.createPoint(
        newPackets,
        row,
        featureDescription,
        true,
        importance,
        0.3,
        icon
      );
    }
  } catch (error) {
    console.error("Error in pgFindPOI:", error);
    throw error;
  } finally {
    client.release();
  }

  return newPackets;
}

export async function pgFindGisPOI(pool, group, distance, color, type = "%") {
  const client = await pool.connect();
  const newPackets = [];

  // SQL-Logik für den Typ-Filter (wie in pgGetMultiline)
  const typeCondition =
    type === "%"
      ? `AND (g."type" LIKE $3 OR g."type" IS NULL)`
      : `AND g."type" = $3`;

  const selectPoints = `
    SELECT DISTINCT l.id, l.name, l.description, l.importance, l.x_coord, l.y_coord, l.z_coord
    FROM leylines.poi l
    INNER JOIN leylines.lines g ON g."group" = $1 ${typeCondition}
    WHERE ST_DWithin(l.geom::geography, g.geom::geography, $2)
  `;

  try {
    const { rows } = await client.query(selectPoints, [group, distance, type]);

    // Icon-Pfad einmalig vorbereiten
    const iconColor = `${color[0]}-${color[1]}-${color[2]}`;
    const icon = `/images/icons/star_${iconColor}.svg`;

    for (const row of rows) {
      row.name = row.site; // Konsistenz für createFeatureInfo
      const featureDescription = html.createFeatureInfo(row, "poi", "internal");
      //const finalScale = row.importance * 0.03;

      // Wir nutzen die neue synchrone czml.createPoint
      czml.createPoint(
        newPackets,
        row,
        featureDescription,
        true,
        row.importance,
        0.03,
        icon
      );
    }
  } catch (error) {
    console.error("Error in pgFindGisPOI:", error.message);
    throw error;
  } finally {
    client.release();
  }

  return newPackets;
}

export async function pgGetDelaunay(pool, maintable, linewidth, color, group) {
  const client = await pool.connect();
  const escapedTable = client.escapeIdentifier(maintable);
  const sql = `
    WITH edges AS (
      SELECT (ST_Dump(ST_DelaunayTriangles(ST_Collect(geom::geometry), 0.0, 1))).geom AS geom 
      FROM ${escapedTable}
      ${group ? 'WHERE "group" = $1' : ""}
    ) 
    SELECT ST_AsGeoJson(geom) as geom FROM edges`;

  let rows;

  try {
    const result = group
      ? await client.query(sql, [group])
      : await client.query(sql);
    rows = result.rows;
  } catch (error) {
    console.error("Database Error in pgGetDelaunay:", error);
    throw error;
  } finally {
    client.release();
  }

  const newPackets = [];

  for (let id = 0; id < rows.length; id++) {
    const coords = JSON.parse(rows[id].geom).coordinates;
    const polyline = coords.flatMap((coord) => [coord[0], coord[1], 0.0]);
    const featureDescription = html.createFeatureInfo(
      { name: id, description: id },
      "line",
      "internal"
    );

    geometry.createGisCorridor(
      newPackets,
      id,
      polyline,
      id,
      featureDescription,
      linewidth,
      color
    );
  }

  return newPackets;
}

export async function pgGetVoronoi(pool, maintable, linewidth, color, group) {
  const client = await pool.connect();
  const escapedTable = client.escapeIdentifier(maintable);
  const sql = `
    WITH edges AS (
      SELECT (ST_Dump(ST_VoronoiLines(ST_Collect(geom::geometry), 0.0))).geom AS geom 
      FROM ${escapedTable}
      ${group ? 'WHERE "group" = $1' : ""}
    ) 
    SELECT ST_AsGeoJson(geom) as geom FROM edges`;

  let rows;

  try {
    const result = group
      ? await client.query(sql, [group])
      : await client.query(sql);
    rows = result.rows;
  } catch (error) {
    console.error("Database Error in pgGetVoronoi:", error);
    throw error;
  } finally {
    client.release();
  }

  const newPackets = [];

  for (let id = 0; id < rows.length; id++) {
    const coords = JSON.parse(rows[id].geom).coordinates;
    const polyline = coords.flatMap((coord) => [coord[0], coord[1], 0.0]);
    const featureDescription = html.createFeatureInfo(
      { name: id, description: id },
      "line",
      "internal"
    );

    geometry.createGisCorridor(
      newPackets,
      id,
      polyline,
      id,
      featureDescription,
      linewidth,
      color
    );
  }

  return newPackets;
}

export async function pgGetMultiline(
  pool,
  maintable,
  group,
  linewidth,
  color,
  type = "%"
) {
  const client = await pool.connect();
  const newPackets = [];

  const typeCondition =
    type === "%" ? `AND ("type" LIKE $2 OR "type" IS NULL)` : `AND "type" = $2`;

  const select = `SELECT ST_AsText(geom) AS wkt_geom, id, name, description FROM ${maintable} WHERE "group" = $1 ${typeCondition}`;

  try {
    const { rows } = await client.query(select, [group, type]);

    for (const row of rows) {
      // 1. Wir säubern den String: Alles außer Zahlen, Punkten, Kommas und Leerzeichen weg
      // Das entfernt das "LINESTRING Z", "MULTILINESTRING", etc.
      const cleanWkt = row.wkt_geom.replace(/[a-zA-Z]/g, "").trim();

      // 2. Wir splitten nach den Segmenten (Klammern)
      const segments = cleanWkt.match(/\(([^()]+)\)/g);
      if (!segments) continue;

      segments.forEach((seg, index) => {
        // 3. Wir splitten die Punkte innerhalb eines Segments am Komma
        // Ein Punkt sieht so aus: "34.97 32.82 0"
        const points = seg.replace(/[()]/g, "").split(",");
        const polyline = [];

        points.forEach((p) => {
          const coords = p.trim().split(/\s+/); // Splittet bei Leerzeichen
          if (coords.length >= 2) {
            polyline.push(Number(coords[0])); // Lon
            polyline.push(Number(coords[1])); // Lat
            // Wenn ein Z-Wert da ist (wie bei dir), nimm ihn, sonst 0
            polyline.push(coords[2] ? Number(coords[2]) : 0.0);
          }
        });

        const featureDescription = html.createFeatureInfo(
          row,
          "line",
          "internal"
        );
        const segmentId = `${row.id}_${index}`;

        geometry.createGisCorridor(
          newPackets,
          segmentId,
          polyline,
          row.name,
          featureDescription,
          linewidth,
          color
        );
      });
    }
  } finally {
    client.release();
  }
  return newPackets;
}

export async function pgExportMultiline(kmlfile, pool, maintable, group, type) {
  const client = await pool.connect();

  const escapedTable = client.escapeIdentifier(maintable);
  const typeQuery =
    type === "%" || !type
      ? 'AND ("type" LIKE $2 OR "type" IS NULL)'
      : 'AND "type" = $2';
  const typeValue = type === "%" || !type ? "%" : type;

  const query = {
    text: `SELECT id, name, description, 
           ST_AsGeoJSON((ST_Dump(geom)).geom)::json as geojson
           FROM ${escapedTable} 
           WHERE "group" = $1 ${typeQuery}`,
    values: [group, typeValue]
  };
  try {
    const { rows } = await client.query(query);
    for (const row of rows) {
      const coords = [];
      const geom = row.geojson;

      // Koordinaten für KML aufbereiten (Lon,Lat,0)
      if (geom.type === "LineString") {
        geom.coordinates.forEach((c) => {
          coords.push(`${c[0]},${c[1]},0`);
        });
      }

      const featureDescription = html.createFeatureInfo(
        row,
        "line",
        "internal"
      );
      // Wir nutzen deine createLine Funktion
      const placemark = kml.createLine(
        row.name,
        featureDescription,
        group,
        coords
      );
      kmlfile.push(placemark);
    }
  } finally {
    client.release();
  }
  return kmlfile;
}

export async function pgExportPoint(pool, sql, param, type) {
  const client = await pool.connect();
  let pointsString = "";

  try {
    const { rows } = await client.query(sql, param);

    for (const row of rows) {
      // Wir rufen die neue synchrone Funktion auf
      // Beachte: Wir hängen den String einfach mit += an.
      pointsString += kml.createPoint(
        row.name,
        row.description,
        row.x_coord,
        row.y_coord,
        row.z_coord,
        type
      );
    }
  } catch (error) {
    console.error("Error in pgExportPoint:", error.message);
    throw error;
  } finally {
    client.release();
  }

  return pointsString;
}

export async function pgCreateLine(
  pool,
  czmlfile,
  maintable,
  group,
  linewidth,
  color
) {
  const client = await pool.connect();

  const escapedTable = client.escapeIdentifier(maintable);
  const select = `SELECT ST_AsGeoJSON(geom), name, description FROM ${escapedTable} WHERE "group" = $1`;

  try {
    const { rows } = await client.query(select, [group]);
    for (let i = 0; i < rows.length; i++) {
      const multilines = JSON.parse(rows[i].st_asgeojson);
      const multiline = [];
      for (let j = 0, subtot = multilines.coordinates.length; j < subtot; j++) {
        multiline.push(multilines.coordinates[j][0]);
        multiline.push(multilines.coordinates[j][1]);
        multiline.push(0.0);
      }
      if (rows[i].description === "Straight") {
        color = [255, 0, 0, 128];
        linewidth = 6000;
      } else if (rows[i].description === "Follow") {
        color = [255, 255, 0, 128];
        linewidth = 6000;
      } else if (rows[i].description === "Circle") {
        color = [255, 165, 0, 128];
        linewidth = 12000;
      }
      czmlfile = czml.createCorridor(
        i,
        rows[i].name,
        rows[i].description,
        linewidth,
        color,
        multiline,
        czmlfile
      );
    }
  } finally {
    client.release();
  }
  return czmlfile;
}

export async function pgCreateArrow(pool, maintable, group, linewidth, color) {
  const client = await pool.connect();
  const newPackets = [];

  const escapedTable = client.escapeIdentifier(maintable);
  const select = `SELECT ST_AsText(geom) AS wkt_geom, name, description FROM ${escapedTable} WHERE "group" = $1`;

  try {
    const { rows } = await client.query(select, [group]);

    for (const row of rows) {
      // Alle Zahlen extrahieren
      const coords = row.wkt_geom.match(/-?\d+\.?\d*/g);
      if (!coords) continue;

      // Flaches Array bauen: [lon, lat, 0, lon, lat, 0...]
      const positions = [];
      for (let i = 0; i < coords.length; i += 2) {
        positions.push(Number(coords[i]), Number(coords[i + 1]), 0.0);
      }

      const description = html.createFeatureInfo(row, "arrow", "internal");
      const id = `${row.name}_arrow_${Math.random().toString(36).substr(2, 5)}`;

      // Aufruf der neuen synchronen CZML-Funktion
      czml.createArrowCarto(
        id,
        row.name,
        description,
        linewidth,
        color,
        positions,
        newPackets
      );
    }
  } finally {
    client.release();
  }
  return newPackets;
}

export async function pgCreateArea(
  czmlfile,
  pool,
  schema,
  table,
  name,
  color,
  outlinecolor,
  extrudeheight
) {
  const client = await pool.connect();

  const escapedSchema = client.escapeIdentifier(schema);
  const escapedTable = client.escapeIdentifier(table);
  const fullTableName = `${escapedSchema}.${escapedTable}`;
  const query = {
    text: `SELECT name, description, 
       ST_AsGeoJSON((ST_Dump(geom)).geom)::json as geojson
       FROM ${fullTableName} 
       WHERE name = $1`,
    values: [name]
  };
  try {
    const { rows } = await client.query(query);

    rows.forEach((row, index) => {
      const geom = row.geojson;
      const polygonCoords = [];

      if (geom.type === "Polygon") {
        geom.coordinates[0].forEach((coord) => {
          polygonCoords.push(coord[0], coord[1], 0.0);
        });
      }

      // Einmaliges ID-Design: name + index
      const uniqueId = `${row.name}_${index}`;
      czml.createPolygon(
        uniqueId,
        row.name,
        row.description,
        color,
        outlinecolor,
        extrudeheight,
        polygonCoords,
        czmlfile
      );
    });
  } catch (err) {
    console.error("Fehler in pgCreateArea:", err);
    throw err;
  } finally {
    client.release();
  }
  return czmlfile;
}
