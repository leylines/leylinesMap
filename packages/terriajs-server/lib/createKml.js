"use strict";

// Statischer Header
export function getHeader(name) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
<Document>
  <name>${name}</name>`;
}

// Statischer Footer
export function getFooter() {
  return `</Document>\n</kml>`;
}

// Styles für Linien (jetzt ohne unnötige Arrays)
export function getLineStyle(name, styles) {
  // KML Farben sind AABBGGRR (Hex)
  const rgb = `ff${styles.color
    .slice()
    .reverse()
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("")}`;
  const width = styles.distance / 20000 >= 1 ? styles.distance / 20000 : 1;

  return `
  <Style id="${name}">
    <LineStyle>
      <color>${rgb}</color>
      <width>${width}</width>
    </LineStyle>
  </Style>`;
}

// Styles für Icons
//<href>https://maps.leylines.net/images/poi/${category.toLowerCase()}.png</href>
export function getPointStyle(category) {
  return `
  <Style id="${category}">
    <IconStyle>
      <scale>2</scale>
      <Icon>
        <href>http://localhost:3001/images/poi/${category.toLowerCase()}.png</href>
      </Icon>
    </IconStyle>
  </Style>`;
}

// Ein einzelner Punkt
export function createPoint(name, description, x, y, z, type) {
  return `
    <Placemark>
      <name>${name || ""}</name>
      <description><![CDATA[${description || ""}]]></description>
      <styleUrl>#${type}</styleUrl>
      <Point>
        <coordinates>${x},${y},${z || 0}</coordinates>
      </Point>
    </Placemark>`;
}

// Eine Linie (nutzt tessellate für Erdkrümmung)
export function createLine(name, description, styleId, coordinatesArray) {
  // coordinatesArray erwartet: [[lon, lat], [lon, lat]...] oder [lon, lat, lon, lat]
  // Wir wandeln es in den KML-String "lon,lat,0 lon,lat,0" um
  const coordString = coordinatesArray.join(" ");

  return `
    <Placemark>
      <name>${name}</name>
      <description><![CDATA[${description}]]></description>
      <styleUrl>#${styleId}</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordString}</coordinates>
      </LineString>
    </Placemark>`;
}

export function getLineStyleMap(name) {
  return `
  <StyleMap id="${name}">
    <Pair><key>normal</key><styleUrl>#${name}0</styleUrl></Pair>
    <Pair><key>highlight</key><styleUrl>#highlight0</styleUrl></Pair>
  </StyleMap>`;
}

export function getGeometry(
  solids,
  points,
  category,
  solid,
  type,
  lat,
  lon,
  bear
) {
  let xml = `  <Folder>
    <name>${solid} ${type}</name>
    <description>Lat: ${lat}, Lon: ${lon}, Bearing: ${bear}</description>`;

  if (type === "points") {
    // Wandelt das points-Objekt/Array in Placemarks um
    points.forEach((p, i) => {
      xml += `
    <Placemark>
      <name>Point ${i}</name>
      <Point><coordinates>${p[1]},${p[2]},0</coordinates></Point>
    </Placemark>`;
    });
  } else {
    // Linien aus den solids-Definitionen
    solids.lines.forEach((line) => {
      const p1 = points[line[0]];
      const p2 = points[line[1]];
      xml += `
    <Placemark>
      <name>${line[0]} - ${line[1]}</name>
      <styleUrl>#${category}-${solid}-${type}</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${p1[1]},${p1[2]},0 ${p2[1]},${p2[2]},0</coordinates>
      </LineString>
    </Placemark>`;
    });
  }

  xml += `\n  </Folder>`;
  return xml;
}

// Ordner-Struktur (optional)
export function getFolderOpen(name, desc) {
  return `  <Folder>\n    <name>${name}</name>\n    <description>${desc}</description>`;
}

export function getFolderClose() {
  return `  </Folder>`;
}
