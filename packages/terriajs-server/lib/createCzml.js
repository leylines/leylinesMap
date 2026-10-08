"use strict";

import * as utils from "./utils.js";

export function createHeader() {
  return [{ id: "document", name: "simple", version: "1.0" }];
}

export function createPoint(
  packetArray,
  row,
  description,
  scaleSymbols,
  importance,
  scale,
  iconUrl,
  pixeloffset = [0, 0]
) {
  const packet = {
    id: row.id,
    name: row.name || row.site,
    description: description
  };
  if (scale === 0.0) {
    const rgba = utils.hexAToRGBA(`${iconUrl}ff`);
    packet.point = {
      color: { rgba: [255, 255, 255, 255] },
      outlineColor: { rgba: rgba },
      outlineWidth: 1,
      pixelSize: 7
    };
    if (scaleSymbols) {
      // 1. Skalierung: Der Vektorpunkt wird im Weltall grösser oder kleiner
      packet.point.scaleByDistance = {
        nearFarScalar: [
          1500.0,
          1.0, // Bis 1.5 km Höhe: 100% der pixelSize (7 Pixel)
          10000000.0,
          0.1 // Im Weltall: Schrumpft auf 20% der pixelSize (ca. 2 Pixel)
        ]
      };
    }
  } else if (iconUrl) {
    packet.billboard = {
      eyeOffset: { cartesian: [0, 0, 0] },
      horizontalOrigin: "CENTER",
      image: iconUrl,
      heightReference: "CLAMP_TO_GROUND",
      pixelOffset: { cartesian2: pixeloffset },
      scale: scale, // Verwende den Parameter scale
      show: true,
      verticalOrigin: "CENTER"
    };
    if (scaleSymbols) {
      packet.billboard.scaleByDistance = {
        nearFarScalar: [
          1500.0,
          1.0, // Bis 1.5 km Höhe: 100% der berechneten 'scale'
          10000000.0,
          0.1 // Ab 5'000 km Höhe: Auf 20% herabschrumpfen
        ]
      };
    }
    if (importance < 9) {
      packet.billboard.translucencyByDistance = {
        nearFarScalar: [
          1000000.0,
          1.0, // Bis 1'000 km Höhe: Volle Deckkraft (Alpha = 1.0)
          10000000.0,
          0.0 // Ab 1'500 km Höhe: Absolut transparent (Alpha = 0.0)
        ]
      };
    } else if (importance < 7) {
      packet.billboard.translucencyByDistance = {
        nearFarScalar: [
          1000000.0,
          1.0, // Bis 1'000 km Höhe: Volle Deckkraft (Alpha = 1.0)
          8000000.0,
          0.0 // Ab 1'500 km Höhe: Absolut transparent (Alpha = 0.0)
        ]
      };
    } else if (importance < 5) {
      packet.billboard.translucencyByDistance = {
        nearFarScalar: [
          1000000.0,
          1.0, // Bis 1'000 km Höhe: Volle Deckkraft (Alpha = 1.0)
          6000000.0,
          0.0 // Ab 1'500 km Höhe: Absolut transparent (Alpha = 0.0)
        ]
      };
    } else if (importance < 3) {
      packet.billboard.translucencyByDistance = {
        nearFarScalar: [
          1000000.0,
          1.0, // Bis 1'000 km Höhe: Volle Deckkraft (Alpha = 1.0)
          4000000.0,
          0.0 // Ab 1'500 km Höhe: Absolut transparent (Alpha = 0.0)
        ]
      };
    }
  }

  packet.position = {
    cartographicDegrees: [
      Number(row.x_coord),
      Number(row.y_coord),
      Number(row.z_coord) || null
    ]
  };

  packetArray.push(packet);
}

export function createPolyline(
  id,
  name,
  description,
  linewidth,
  colorvalue,
  referencesvalues,
  packetArray
) {
  const packet = {
    id: id,
    name: name,
    description: description,
    polyline: {
      width: linewidth,
      followSurface: true,
      clampToGround: true,
      material: {
        polylineGlow: {
          glowPower: 0.2,
          color: { rgba: colorvalue }
        }
      },
      positions: {
        cartographicDegrees: referencesvalues
      }
    }
  };
  packetArray.push(packet);
}

export function createCorridor(
  id,
  name,
  description,
  linewidth,
  colorvalue,
  referencesvalues,
  packetArray
) {
  const packet = {
    id: id,
    name: name,
    description: description,
    corridor: {
      width: linewidth,
      height: 0,
      material: {
        solidColor: {
          color: { rgba: colorvalue }
        }
      },
      outline: false,
      positions: {
        cartographicDegrees: referencesvalues
      }
    }
  };
  packetArray.push(packet);
}

export async function createMultiline(
  linewidth,
  color,
  startpoint,
  endpoints,
  results
) {
  for (let i = 0, tot = endpoints.length; i < tot; i++) {
    const polylinereference = [];
    const polylineid = `${startpoint}${endpoints[i]}`;
    polylinereference.push(`${startpoint}#position`);
    polylinereference.push(`${endpoints[i]}#position`);
    results = exports.createPolyline(
      polylineid,
      polylineid,
      polylineid,
      linewidth,
      color,
      polylinereference,
      results
    );
  }
  return results;
}

export function createArrowCarto(
  id,
  name,
  description,
  linewidth,
  colorvalue,
  referencesvalues,
  packetArray
) {
  const packet = {
    id: id,
    name: name,
    description: description,
    polyline: {
      width: linewidth,
      followSurface: true,
      clampToGround: true,
      material: {
        polylineArrow: {
          color: { rgba: colorvalue }
        }
      },
      positions: {
        cartographicDegrees: referencesvalues
      }
    }
  };

  packetArray.push(packet);
}

export function createPolygon(
  id,
  name,
  description,
  colorvalue,
  outlinecolorvalue,
  extrudeheight,
  polygonPositions,
  results
) {
  const packet = {
    id: id,
    name: name,
    description: description,
    polygon: {
      fill: true,
      followSurface: true,
      material: {
        solidColor: {
          color: {
            rgba: colorvalue
          }
        }
      },
      outline: true,
      outlineColor: { rgba: outlinecolorvalue },
      positions: {
        cartographicDegrees: polygonPositions // Wichtig: Explizit angeben für Cesium
      },
      extrudedHeight: extrudeheight
    }
  };
  results.push(packet);
  return results;
}
