/**
 * Convierte a WebP las imágenes JPG/PNG de assets/ y reescribe las referencias
 * (.html, CSS, JS, instagram.json). Lo llama .github/workflows/optimize-images.yml.
 *
 * - Solo reemplaza si el .webp resulta más pequeño que el original.
 * - Las fotos de más de 1600 px de lado largo se reducen a 1600 px.
 * - No toca favicons, apple-touch ni la imagen de Open Graph (og-*): esas se
 *   quedan en su formato por compatibilidad.
 * - Ignora assets/img/instagram/ (esas ya las genera fetch-instagram.mjs en WebP).
 *
 * Necesita el binario `cwebp` (paquete `webp` en Ubuntu).
 */
import { execFileSync } from "node:child_process";
import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const IMG_DIRS = ["assets/img", "assets/descuentos"];
const TEXT_FILES = [
  ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
  "assets/css/styles.css",
  "assets/js/main.js",
  "scripts/fetch-instagram.mjs",
  "assets/data/instagram.json",
  ...listMarkdown("content/blog"), // portadas/fotos de los artículos del blog
];
const SKIP = /^(favicon|apple-touch|og-|cheno-perfil)/i;
const RASTER = /\.(jpe?g|png)$/i;
const MAX_SIDE = 1600;

// Ancho y alto de un .webp leyendo su cabecera (VP8, VP8L o VP8X).
function webpSize(file) {
  const b = readFileSync(file);
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") {
    const n = b.readUInt32LE(21);
    return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

function listMarkdown(dir) {
  try {
    return readdirSync(join(ROOT, dir))
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

function walk(dir, acc = []) {
  if (dir.endsWith("assets/img/instagram")) return acc; // las genera fetch-instagram.mjs
  let entries;
  try {
    entries = readdirSync(join(ROOT, dir), { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const rel = join(dir, e.name);
    if (e.isDirectory()) walk(rel, acc);
    else if (RASTER.test(e.name) && !SKIP.test(e.name)) acc.push(rel);
  }
  return acc;
}

// 1. Convertir
const renames = [];
for (const dir of IMG_DIRS) {
  for (const rel of walk(dir)) {
    const abs = join(ROOT, rel);
    const outRel = rel.replace(RASTER, ".webp");
    const outAbs = join(ROOT, outRel);
    const args = /\.png$/i.test(rel)
      ? ["-q", "82", "-alpha_q", "100", abs, "-o", outAbs]
      : ["-q", "82", abs, "-o", outAbs];
    execFileSync("cwebp", args, { stdio: "inherit" });
    // Fotos enormes (móvil, 4000 px): se reducen a 1600 px de lado largo.
    const [w, h] = webpSize(outAbs);
    if (Math.max(w, h) > MAX_SIDE) {
      const rs = w >= h ? ["-resize", String(MAX_SIDE), "0"] : ["-resize", "0", String(MAX_SIDE)];
      execFileSync("cwebp", [...rs, ...args], { stdio: "inherit" });
    }
    const before = statSync(abs).size;
    const after = statSync(outAbs).size;
    if (after < before) {
      rmSync(abs);
      renames.push([basename(rel), basename(outRel)]);
      console.log(
        `${rel}  ${Math.round(before / 1024)}K -> ${outRel}  ${Math.round(after / 1024)}K`
      );
    } else {
      rmSync(outAbs);
      console.log(`${rel}: el WebP no es más pequeño, se deja el original.`);
    }
  }
}

// 2. Reescribir referencias. Se exige "/" delante del nombre para que
//    "8.png" no pegue dentro de, p. ej., "favicon-48.png".
if (renames.length) {
  for (const tf of TEXT_FILES) {
    const abs = join(ROOT, tf);
    let txt;
    try {
      txt = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    let changed = false;
    for (const [from, to] of renames) {
      if (txt.includes("/" + from)) {
        txt = txt.split("/" + from).join("/" + to);
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(abs, txt);
      console.log(`referencias actualizadas: ${tf}`);
    }
  }
}

if (!renames.length) console.log("Nada que convertir.");
