/**
 * Descarga las últimas publicaciones de Instagram y actualiza:
 *   - assets/data/instagram.json
 *   - assets/img/instagram/*.jpg  (miniaturas self-host: las media_url de IG caducan)
 *
 * Uso (lo llama .github/workflows/instagram.yml a diario):
 *   IG_ACCESS_TOKEN=xxxx [IG_USER_ID=me] [IG_LIMIT=3] node scripts/fetch-instagram.mjs
 *
 * El token es un "long-lived access token" de la API de Instagram con Instagram
 * Login (cuenta profesional). Caduca a los ~60 días: hay que refrescarlo.
 * Si no hay token, el script termina sin tocar nada (exit 0).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = join(ROOT, "assets", "data", "instagram.json");
const IMG_DIR = join(ROOT, "assets", "img", "instagram");

const TOKEN = process.env.IG_ACCESS_TOKEN;
const USER = process.env.IG_USER_ID || "me";
const LIMIT = Math.max(1, Math.min(12, Number(process.env.IG_LIMIT) || 3));

if (!TOKEN) {
  console.log("IG_ACCESS_TOKEN no definido — no se actualiza nada.");
  process.exit(0);
}

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const api = `https://graph.instagram.com/${USER}/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${TOKEN}`;

const res = await fetch(api);
if (!res.ok) {
  console.error("Error de la API de Instagram:", res.status, await res.text());
  process.exit(1);
}
const { data } = await res.json();
if (!Array.isArray(data) || !data.length) {
  console.error("La API no devolvió publicaciones.");
  process.exit(1);
}

await mkdir(IMG_DIR, { recursive: true });

const posts = [];
for (const m of data.slice(0, LIMIT)) {
  const src = m.media_type === "VIDEO" ? m.thumbnail_url || m.media_url : m.media_url;
  let image = "assets/img/blog/cola-de-caballo.jpg";
  if (src) {
    try {
      const bin = await fetch(src);
      if (bin.ok) {
        const buf = Buffer.from(await bin.arrayBuffer());
        const rel = `assets/img/instagram/${m.id}.jpg`;
        await writeFile(join(ROOT, rel), buf);
        image = rel;
      }
    } catch (e) {
      console.warn("No se pudo descargar la imagen de", m.id, e.message);
    }
  }
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

console.log(`instagram.json actualizado con ${posts.length} publicaciones.`);
