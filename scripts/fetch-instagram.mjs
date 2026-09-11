/**
 * Descarga las últimas publicaciones de Instagram y actualiza:
 *   - assets/data/instagram.json
 *   - assets/img/instagram/*.jpg  (miniaturas self-host: las media_url de IG caducan)
 *
 * Uso (lo llama .github/workflows/instagram.yml a diario):
 *   IG_ACCESS_TOKEN=xxxx [IG_USER_ID=me] [IG_LIMIT=3|all] node scripts/fetch-instagram.mjs
 *
 * IG_LIMIT="all" trae todas las publicaciones (hasta el tope de seguridad
 * MAX_POSTS), paginando con paging.next de la Graph API.
 *
 * El token es un "long-lived access token" de la API de Instagram con Instagram
 * Login (cuenta profesional). Caduca a los ~60 días: hay que refrescarlo.
 * Si no hay token, el script termina sin tocar nada (exit 0).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Convierte un buffer de imagen a WebP con `cwebp` si está disponible.
 * Devuelve { buf, ext }; si no hay cwebp, deja el original como .jpg.
 */
function toWebp(buf, id) {
  const inPath = join(tmpdir(), `ig-${id}.bin`);
  const outPath = join(tmpdir(), `ig-${id}.webp`);
  try {
    writeFileSync(inPath, buf);
    execFileSync("cwebp", ["-quiet", "-q", "82", inPath, "-o", outPath]);
    return { buf: readFileSync(outPath), ext: "webp" };
  } catch {
    return { buf, ext: "jpg" };
  } finally {
    try { rmSync(inPath, { force: true }); } catch {}
    try { rmSync(outPath, { force: true }); } catch {}
  }
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "assets", "data", "instagram.json");
const IMG_DIR = join(ROOT, "assets", "img", "instagram");

const TOKEN = process.env.IG_ACCESS_TOKEN;
const USER = process.env.IG_USER_ID || "me";
// Tope de seguridad: aunque se pida "todas", nunca se bajan más de estas.
const MAX_POSTS = 120;
const LIMIT_RAW = (process.env.IG_LIMIT || "3").trim().toLowerCase();
const LIMIT =
  LIMIT_RAW === "all"
    ? MAX_POSTS
    : Math.max(1, Math.min(MAX_POSTS, Number(LIMIT_RAW) || 3));

/**
 * Publicaciones que NO deben salir en la web (reels de prueba, etc.).
 * Pon el código corto del enlace: instagram.com/reel/<ESTO>/  ó  /p/<ESTO>/
 * También se pueden añadir por la variable de entorno IG_EXCLUDE (separadas por comas).
 */
const EXCLUDE = [
  "Dc8CU-xhjww", // reel de prueba - cormorán 1
  "Dc8CQZ8v6TG", // reel de prueba - cormorán 2
  "Dcp-RdAPGf6", // reel de prueba - Altea (duplicado)
  "Dc_xZjextIf", // reel de prueba
  ...(process.env.IG_EXCLUDE || "").split(",").map((s) => s.trim()).filter(Boolean),
];
const isExcluded = (m) =>
  EXCLUDE.some(
    (code) =>
      code && ((m.permalink || "").includes("/" + code + "/") || (m.id || "") === code)
  );

if (!TOKEN) {
  console.log("IG_ACCESS_TOKEN no definido — no se actualiza nada.");
  process.exit(0);
}

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const PAGE_SIZE = 50;

/**
 * Pagina con paging.next hasta tener suficientes publicaciones visibles
 * (no excluidas) o hasta un tope duro de páginas (evita bucles eternos).
 */
async function fetchAllMedia() {
  let url = `https://graph.instagram.com/${USER}/media?fields=${FIELDS}&limit=${PAGE_SIZE}&access_token=${TOKEN}`;
  const all = [];
  let page = 0;
  while (url && page < 10) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Error de la API de Instagram:", res.status, await res.text());
      if (!all.length) process.exit(1);
      break;
    }
    const json = await res.json();
    if (Array.isArray(json.data)) all.push(...json.data);
    url = json.paging && json.paging.next ? json.paging.next : null;
    page++;
    const visiblesSoFar = all.filter((m) => !isExcluded(m)).length;
    if (visiblesSoFar >= LIMIT) break;
  }
  return all;
}

const data = await fetchAllMedia();
if (!data.length) {
  console.error("La API no devolvió publicaciones.");
  process.exit(1);
}

const visibles = data.filter((m) => !isExcluded(m));
if (!visibles.length) {
  console.error("Todas las publicaciones recibidas están excluidas.");
  process.exit(1);
}

await mkdir(IMG_DIR, { recursive: true });

const posts = [];
for (const m of visibles.slice(0, LIMIT)) {
  // Si ya tenemos la miniatura de un día anterior, no volvemos a descargarla
  // (las media_url de Instagram caducan, pero el fichero local no cambia).
  let image = existsSync(join(IMG_DIR, `${m.id}.webp`))
    ? `assets/img/instagram/${m.id}.webp`
    : existsSync(join(IMG_DIR, `${m.id}.jpg`))
    ? `assets/img/instagram/${m.id}.jpg`
    : null;

  const src = m.media_type === "VIDEO" ? m.thumbnail_url || m.media_url : m.media_url;
  if (!image && src) {
    try {
      const bin = await fetch(src);
      if (bin.ok) {
        const raw = Buffer.from(await bin.arrayBuffer());
        const { buf, ext } = toWebp(raw, m.id);
        const rel = `assets/img/instagram/${m.id}.${ext}`;
        await writeFile(join(ROOT, rel), buf);
        image = rel;
      }
    } catch (e) {
      console.warn("No se pudo descargar la imagen de", m.id, e.message);
    }
  }
  if (!image) image = "assets/img/blog/cola-de-caballo.webp";
  posts.push({
    permalink: m.permalink,
    image,
    caption: (m.caption || "").replace(/\s+/g, " ").trim().slice(0, 160),
    type: m.media_type === "VIDEO" ? "REEL" : "IMAGE",
    timestamp: m.timestamp || null,
  });
}

await writeFile(
  OUT_JSON,
  JSON.stringify({ updated: new Date().toISOString(), posts }, null, 2) + "\n"
);

// Borra miniaturas antiguas que ya no están en el JSON (no se acumulan).
try {
  const keep = new Set(posts.map((p) => p.image && p.image.split("/").pop()));
  for (const f of readdirSync(IMG_DIR)) {
    if (!keep.has(f)) {
      rmSync(join(IMG_DIR, f), { force: true });
      console.log("miniatura antigua eliminada:", f);
    }
  }
} catch {
  /* nada que limpiar */
}

console.log(`instagram.json actualizado con ${posts.length} publicaciones.`);
