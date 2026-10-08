"use strict";

import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import * as leylines from "./leylines.js";

const router = express.Router();

const redirectToSurvey = (_req, res) => {
  res.redirect(
    301,
    "https://survey123.arcgis.com/share/6313e1587ec34892a4ea0b4dd03ef1c7?portalUrl=https://uzh.maps.arcgis.com"
  );
};

const allowedSchemas = [
  "anomalies",
  "cartedeshautslieux",
  "environment",
  "alesia",
  "history",
  "megalithic",
  "ramar",
  "leylines",
  "unesco",
  "interfaithmary",
  "starcities",
  "sacredsites"
];

const validateIdentifier = (name) => {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
};

const validateParams = (req, res, next) => {
  const { schema, table } = req.params;
  if (schema && !allowedSchemas.includes(schema)) {
    return res.status(403).json({ error: "Ungültiges Schema" });
  }
  if (table && !validateIdentifier(table)) {
    return res.status(403).json({ error: "Ungültige Tabelle" });
  }
  next();
};

export default function initRoutes({
  pgUser,
  pgPass,
  pgHost,
  pgPort,
  pgDatabase
}) {
  // 1. Pool-Konfiguration mit Shorthand-Properties
  const pool = new Pool({
    host: pgHost,
    port: pgPort,
    user: pgUser,
    password: pgPass,
    database: pgDatabase
  });

  // Pool-Fehler loggen (wichtig!)
  pool.on("error", (err) => {
    console.error("Unexpected error on idle pool-client", err);
  });

  // 2. Verbesserter Handler mit besserem Error-Handling
  const createHandler =
    (method, cacheTime = 3600) =>
    async (req, res) => {
      try {
        if (cacheTime > 0) {
          res.set("Cache-Control", `public, max-age=${cacheTime}`);
        } else {
          res.set("Cache-Control", "no-store"); // Gar kein Cache für dynamische Dinge
        }
        await method(req, res, pool);
      } catch (error) {
        console.error(
          `Error in ${method.name || "anonymous function"}:`,
          error
        );
        res.status(500).json({
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "development" ? error.message : undefined
        });
      }
    };

  // 3. Routen-Definitionen (Scannbar & Sauber)
  const routes = [
    ["get", "/sites/:schema/:table/:image", leylines.createPointLayer],
    [
      "get",
      "/poi/:schema/:table/:filterField/:type",
      leylines.createPointLayer
    ],
    // http://localhost:3001/api/poi/leylines/view_poi/type/Pyramid
    ["get", "/alesia/:schema/:table/:image", leylines.createPointLayer],
    // http://localhost:3001/api/alesia/alesia/sites/star_255-255-66
    [
      "get",
      "/cartedeshautslieux/:schema/:table/:filterField/:type/:image",
      leylines.createPointLayer
    ],
    // http://localhost:3001/api/cartedeshautslieux/cartedeshautslieux/sites/category/Must-see places/9C27B0
    ["get", "/interfaithMary/:schema/:table/:image", leylines.createPointLayer],
    // http://localhost:3001/api/interfaithMary/interfaithmary/sites/button_yellow
    [
      "get",
      "/megalithic/:schema/:table/:filterField/:type",
      leylines.createPointLayer
    ],
    // http://localhost:3001/api/megalithic/megalithic/sites/type_id/23
    [
      "get",
      "/ramar/:schema/:table/:filterField/:type",
      leylines.createPointLayer
    ],
    // http://localhost:3001/api/ramar/ramar/poi/object_type/UFO
    ["get", "/sacredsites/:schema/:table/:image", leylines.createPointLayer],
    // http://localhost:3001/api/sacredSites/sacredsites/sites/button_cyan
    ["get", "/starcities/:schema/:table/:image", leylines.createPointLayer],
    // http://localhost:3001/api/starCities/starcities/sites/group/positive/green_button
    [
      "get",
      "/unesco/:schema/:table/:filterField/:type/:image",
      leylines.createPointLayer
    ],
    // http://localhost:3001/api/unesco/unesco/sites/category/Natural/green_button
    ["get", "/exportPoints/:schema/:table/:type", leylines.exportPOI],
    [
      "get",
      "/createGrid/:latitude/:longitude/:bearing/:form/:category/:solid/:type{/:pois}",
      leylines.createGrid
    ],
    [
      "get",
      "/exportGrid/:latitude/:longitude/:bearing/:form/:category/:solid/:type",
      leylines.exportGrid
    ],
    [
      "get",
      "/line/:schema/:table/:group/:width/:color{/:type}",
      leylines.createLine
    ],
    [
      "get",
      "/exportLine/:schema/:table/:group/:width/:color{/:type}",
      leylines.exportLine
    ],
    ["get", "/areas/:schema/:table/:name", leylines.createArea],
    [
      "get",
      "/delaunay/:schema/:table/:width/:color{/:group}",
      leylines.createDelaunay
    ],
    [
      "get",
      "/voronoi/:schema/:table/:width/:color{/:group}",
      leylines.createVoronoi
    ],
    ["get", "/arrow/:schema/:table/:group/:width/:color", leylines.createArrow],
    ["get", "/new-point", redirectToSurvey],
    ["get", "/new-line", redirectToSurvey]
  ];

  //['get', '/createCircle/:lat1/:lon1/:lat2/:lon2/:type', leylines.createCircle],
  //['get', '/cifex/:type', leylines.createCifex],
  //['get', '/related/:schema/:table', leylines.createRelated],
  //['get', '/points/:schema/:table/:type', leylines.createPOI],

  routes.forEach(([verb, path, handler]) => {
    router[verb](path, validateParams, createHandler(handler));
  });

  return router;
}
