"use strict";

import * as utils from "./utils.js";

export function createFeatureInfo(row, rowtype, imagetype) {
  const imagePath =
    row.image ||
    (rowtype === "leylines"
      ? `/popup/${row.name.replace(/ /g, "_")}.jpg`
      : null);
  const imagealt = row.name;

  const wikipedialink =
    row.name && rowtype === "leylines"
      ? `<a href="https://en.wikipedia.org/wiki/${row.name.replace(/ /g, "_")}">${row.name}</a>`
      : null;

  let description = `<table><tr><th style="width: 360px" colspan="2">${row.name}</th></tr>`;

  const hasImage =
    row.image ||
    (rowtype === "leylines" && utils.imageExistsInCache(imagePath));

  if (hasImage) {
    const imageUrl = row.image
      ? row.image
      : imagetype === "external"
        ? `https://maps.leylines.net/images${imagePath}`
        : `/images${imagePath}`;
    description += `<tr><td colspan="2"><img src="${imageUrl}" alt="${imagealt}" style="width:360px" /></td></tr>`;
  }

  if (row.place) {
    description += `<tr><td style="width: 360px; padding: 4px" colspan="2">${row.place}</td></tr>`;
  }
  if (row.description) {
    description += `<tr><td style="width: 360px; padding: 4px" colspan="2">${row.description}</td></tr>`;
  }
  if (row.type && row.type !== "unknown") {
    description += `<tr><td style="width: 120px; padding: 4px">Type:</td><td style="width: 240px">${row.type}</td></tr>`;
  }
  if (row.sub_type && row.sub_type !== "unknown") {
    description += `<tr><td style="width: 120px; padding: 4px">Subtype:</td><td style="width: 240px">${row.sub_type}</td></tr>`;
  }
  if (row.importance_value) {
    description += `<tr><td style="width: 120px; padding: 4px">Importance:</td><td style="width: 240px">${row.importance_value}</td></tr>`;
  }
  if (wikipedialink) {
    description += `<tr><td style="width: 120px; padding: 4px">Wikipedia:</td><td style="width: 240px">${wikipedialink}</td></tr>`;
  }
  if (row.data_owner) {
    description += `<tr><td style="width: 120px; padding: 4px">Custodian:</td><td style="width: 240px"><a href='https://${row.data_owner}'>${row.data_owner}</a></td></tr>`;
  }
  if (row.links) {
    const links = row.links
      .split("|")
      .map((link) => `<a href="${link}">${link}</a>`)
      .join("<br/>");
    description += `<tr><td style="width: 120px; padding: 4px">Links:</td><td style="width: 240px">${links}</td></tr>`;
  }
  if (row.country) {
    description += `<tr><td style="width: 120px; padding: 4px">Country:</td><td style="width: 240px">${row.country}</td></tr>`;
  }

  description += `</table>`;

  return description;
}
