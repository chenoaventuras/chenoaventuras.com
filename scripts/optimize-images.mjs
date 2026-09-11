/**
 * Convierte a WebP las imágenes JPG/PNG de assets/ y reescribe las referencias
 * (.html, CSS, JS, instagram.json). Lo llama .github/workflows/optimize-images.yml.
 *
 * - Solo reemplaza si el .webp resulta más pequeño que el original.
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
