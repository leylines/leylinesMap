import { readdirSync } from "node:fs";
import { resolve } from "node:path";

// Ein Set speichert Dateinamen und erlaubt blitzschnelle Abfragen
let imageCache = new Set();

export function refreshImageCache() {
  try {
    const dir = resolve("wwwroot/images/popup");
    // Wir lesen alle Dateinamen im popup-Ordner
    const files = readdirSync(dir);
    imageCache = new Set(files.map((f) => f.toLowerCase()));
    console.log(`Image Cache refreshed: ${imageCache.size} images found.`);
  } catch (e) {
    console.error("Could not refresh image cache:", e.message);
  }
}

// Die neue, synchrone Prüfung
export function imageExistsInCache(filename) {
  if (!filename) return false;
  // Wir extrahieren den reinen Dateinamen aus dem Pfad /popup/Name.jpg
  const pureName = filename.split("/").pop().toLowerCase();
  return imageCache.has(pureName);
}

export function hexAToRGBA(h) {
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
    Number.parseInt(h.slice(6, 8), 16)
  ];
}
