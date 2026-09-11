/**
 * Genera un artículo de blog (SEO) a partir de la última publicación de
 * Instagram y lo guarda como BORRADOR en content/blog/ (draft: true).
 *
 * No publica nada por sí solo: eso lo hace scripts/publish-auto-drafts.mjs
 * más tarde, solo si nadie ha tocado el borrador entretanto.
 *
 * Uso (lo llama .github/workflows/auto-blog-draft.yml a diario, por la mañana):
 *   ANTHROPIC_API_KEY=xxxx [ANTHROPIC_MODEL=claude-sonnet-5] node scripts/generate-blog-post.mjs
 *
 * Si no hay ANTHROPIC_API_KEY, el script termina sin tocar nada (exit 0):
 * así, mientras el usuario no active esta pieza, no pasa absolutamente nada.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IG_JSON = join(ROOT, "assets", "data", "instagram.json");
const BLOG_DIR = join(ROOT, "content", "blog");

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

if (!API_KEY) {
  console.log("ANTHROPIC_API_KEY no definido — no se genera ningún borrador.");
  process.exit(0);
}

if (!existsSync(IG_JSON)) {
  console.log("No hay assets/data/instagram.json todavía — nada que hacer.");
  process.exit(0);
}

const igData = JSON.parse(readFileSync(IG_JSON, "utf8"));
const posts = Array.isArray(igData.posts) ? igData.posts : [];
if (!posts.length) {
  console.log("instagram.json no tiene publicaciones — nada que hacer.");
  process.exit(0);
}

// La más reciente por fecha (por si el JSON no viniera ya ordenado).
const latest = posts
  .slice()
  .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0];

if (!latest || !latest.permalink) {
  console.log("No se encontró una publicación válida — nada que hacer.");
  process.exit(0);
}

mkdirSync(BLOG_DIR, { recursive: true });

// ¿Ya existe un artículo (borrador o publicado) para esta publicación? No dupliques.
const already = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith(".md"))
  .some((f) => {
    try {
      const { data } = matter(readFileSync(join(BLOG_DIR, f), "utf8"));
      return data.igPermalink === latest.permalink;
    } catch {
      return false;
    }
  });

if (already) {
  console.log("Ya existe un artículo para esta publicación de Instagram — nada que hacer.");
  process.exit(0);
}

const caption = (latest.caption || "").replace(/\s+/g, " ").trim();

const prompt = `Eres la persona que escribe el blog de viajes Chenoaventuras (chenoaventuras.com), en español de España. El tono es cercano, aventurero y "sin filtros" (nada de lenguaje corporativo ni genérico), como si le contaras el viaje a un amigo, pero con rigor SEO.

Te doy la descripción (caption) de la última publicación de Instagram de @chenoaventuras. A partir de ahí:
1. Identifica el destino o la actividad principal de la publicación (puede no estar explícito del todo: dedúcelo de las pistas del texto; si de verdad no hay ninguna pista de lugar, escribe sobre la actividad o tema central).
2. Escribe un artículo de blog largo (unas 700-1100 palabras), optimizado para SEO, en Markdown, con:
   - Un título (title) atractivo y con la palabra clave principal, máximo 60 caracteres.
   - Un resumen (excerpt) de una o dos frases, máximo 155 caracteres, pensado para la meta description de Google.
   - Un slug corto en minúsculas, con guiones, sin acentos ni caracteres especiales (solo letras, números y guiones), basado en el título.
   - El cuerpo del artículo (body) en Markdown: con subtítulos ## para estructurar (introducción, un par de secciones con consejos/datos prácticos y contexto, y un cierre), un tono natural y útil para quien quiera viajar allí o hacer esa actividad, sin inventar datos muy concretos que no puedas saber con certeza (precios exactos, horarios, etc. — si los mencionas, hazlo de forma orientativa). Termina con una invitación a seguir a @chenoaventuras en Instagram y explorar más aventuras en la web.

Descripción original de la publicación de Instagram:
"""
${caption || "(sin descripción de texto)"}
"""

Responde EXCLUSIVAMENTE con un JSON válido, sin texto antes ni después, sin bloque de código markdown, con esta forma exacta:
{"title": "...", "excerpt": "...", "slug": "...", "body": "..."}`;

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.5,
    messages: [{ role: "user", content: prompt }],
  }),
});

if (!res.ok) {
  console.error("Error llamando a la API de Anthropic:", res.status, await res.text());
  process.exit(1);
}

const json = await res.json();
const raw = (json.content && json.content[0] && json.content[0].text) || "";

let article;
try {
  // Por si el modelo envuelve la respuesta en ```json ... ``` a pesar de lo pedido.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  article = JSON.parse(cleaned);
} catch (e) {
  console.error("No se pudo interpretar la respuesta del modelo como JSON:\n", raw);
  process.exit(1);
}

const { title, excerpt, body } = article;
if (!title || !excerpt || !body) {
  console.error("Respuesta incompleta del modelo:", article);
  process.exit(1);
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos (tildes, diéresis…) tras NFD
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const slug = slugify(article.slug) || slugify(title) || "articulo-automatico";
const now = new Date();
const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD (fecha del run)
const filename = `${dateStr}-${slug}.md`;

const cover = latest.image ? (latest.image.startsWith("/") ? latest.image : "/" + latest.image) : "";

const frontmatter = {
  title: String(title).slice(0, 90),
  date: now,
  excerpt: String(excerpt).slice(0, 200),
  cover,
  draft: true,
  igPermalink: latest.permalink,
  autoGenerated: true,
  autoDate: dateStr,
};

const fileContent = matter.stringify(String(body).trim() + "\n", frontmatter);
writeFileSync(join(BLOG_DIR, filename), fileContent);

console.log(`Borrador creado: content/blog/${filename}`);
