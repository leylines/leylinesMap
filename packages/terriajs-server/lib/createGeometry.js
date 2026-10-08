"use strict";

import * as html from "./createHTML.js";
import * as czml from "./createCzml.js";

export function createPoints(points, color) {
  const newPackets = [];

  // Falls color ein Array ist [R, G, B, A], nutzen wir die ersten drei
  const icon = `/images/icons/button_${color[0]}-${color[1]}-${color[2]}.svg`;
  const scale = 0.05;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];

    czml.createPoint(
      newPackets, // Unser Sammel-Array
      {
        // Ein flaches Objekt, wie es czml.createPoint erwartet
        id: pt[0],
        name: pt[3],
        x_coord: pt[1],
        y_coord: pt[2],
        z_coord: 1000
      },
      pt[3], // Beschreibung (hier einfach der Name)
      scale,
      icon
    );
  }

  return newPackets;
}

export function createGisCorridor(
  newPackets,
  id,
  polyline,
  name,
  description,
  distance,
  color
) {
  const linewidth = distance * 2;
  const drawingColor = [...color];
  drawingColor[3] = 64;

  czml.createCorridor(
    `${id}c`,
    name,
    description,
    linewidth,
    drawingColor,
    polyline,
    newPackets
  );
  czml.createPolyline(
    `${id}p`,
    name,
    description,
    3,
    drawingColor,
    polyline,
    newPackets
  );

  return newPackets;
}

export function createCorridor(points, lines, distance, color) {
  const newPackets = [];
  const linewidth = distance * 2;

  // Sicherstellen, dass der Alpha-Wert für das Grid gesetzt ist
  const gridColor = [...color];
  gridColor[3] = 64;

  for (const [start, end] of lines) {
    const startPointIdx = Number(start);
    const endPointIdx = Number(end);

    // Punkt-Namen für die Anzeige (1-basiert für Menschen)
    const name = `${startPointIdx + 1}-${endPointIdx + 1}`;

    // Info-Objekt für das HTML-Popup vorbereiten
    const info = {
      name: name,
      description: `
        <b>Punkt ${startPointIdx + 1}:</b><br/>Lon: ${points[startPointIdx][1]}<br/>Lat: ${points[startPointIdx][2]}<br/>
        <b>Punkt ${endPointIdx + 1}:</b><br/>Lon: ${points[endPointIdx][1]}<br/>Lat: ${points[endPointIdx][2]}
      `
    };

    const description = html.createFeatureInfo(info, "line", "internal");

    const positions = [
      points[startPointIdx][1],
      points[startPointIdx][2],
      0,
      points[endPointIdx][1],
      points[endPointIdx][2],
      0
    ];

    czml.createCorridor(
      `${name}c`,
      name,
      description,
      linewidth,
      gridColor,
      positions,
      newPackets
    );
    czml.createPolyline(
      `${name}p`,
      name,
      description,
      3,
      gridColor,
      positions,
      newPackets
    );
  }

  return newPackets;
}
