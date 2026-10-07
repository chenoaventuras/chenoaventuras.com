/**
 * Revisa los enlaces de los posts (content/blog/*.md) y de las páginas fijas
 * (*.html de la raíz) y escribe el resultado en .refresh/enlaces.md.
 * Lo ejecuta .github/workflows/blog-refresh.yml cada lunes; el informe por
 * correo (scripts/send-refresh-report.mjs) lo añade al final.
 *
 *  - Internos (/blog/x.html, /assets/...): comprueba que el archivo existe.
 *  - Externos: petición GET; se consideran rotos 404/410 y los dominios que
 *    no existen. Los 403/429 (webs que bloquean robots) no se cuentan.
 * Sale siempre con código 0: un enlace roto no debe tumbar el workflow.
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".refresh", "enlaces.md");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SKIP_HOSTS = /^(www\.)?(facebook|tiktok|linkedin|twitter|x)\.com$/i;

const sources = []; // { label, url (interno del sitio), text }
const slugs = new Set();
for (const f of readdirSync(join(ROOT, "content", "blog"))) {
  if (!f.endsWith(".md")) continue;
  const { data, content } = matter(readFileSync(join(ROOT, "content", "blog", f), "utf8"));
  const slug = (data.slug || f.replace(/\.md$/, "")).toLowerCase();
  if (!data.draft) slugs.add(slug);
  sources.push({ label: String(data.title || slug), page: `/blog/${slug}.html`, text: content });
}
for (const f of readdirSync(ROOT)) {
  if (!f.endsWith(".html") || f === "blog.html" || f === "mapa.html") continue;
  sources.push({ label: f, page: `/${f}`, text: readFileSync(join(ROOT, f), "utf8") });
}

const LINK = /\]\(\s*(\S+?)\s*\)|href="([^"]+)"/g;
const internal = []; // { label, page, url }
const external = new Map(); // url -> [{label,page}]
for (const s of sources) {
  for (const m of s.text.matchAll(LINK)) {
    let url = (m[1] || m[2] || "").replace(/[).,;]+$/, "");
    if (!url || url.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/.test(url)) continue;
    if (/^https?:\/\//i.test(url)) {
      if (SKIP_HOSTS.test(new URL(url).host)) continue;
      if (/google\.[a-z.]+\/maps/i.test(url)) continue;
      if (!external.has(url)) external.set(url, []);
      external.get(url).push({ label: s.label, page: s.page });
    } else if (url.startsWith("/") || /^[a-z0-9_-]+\.html/i.test(url)) {
      internal.push({ label: s.label, page: s.page, url: url.startsWith("/") ? url : "/" + url });
    }
  }
}

const REWRITES = new Set(["/", "/minijuego", "/minijuego/", "/blog", "/blog/"]);
const brokenInternal = [];
for (const l of internal) {
  const path = l.url.split("#")[0].split("?")[0];
  let ok;
  const post = path.match(/^\/blog\/([a-z0-9-]+)\.html$/);
  if (REWRITES.has(path)) ok = true;
  else if (post) ok = slugs.has(post[1]);
  else ok = existsSync(join(ROOT, path)) || existsSync(join(ROOT, path.replace(/^\//, "")));
  if (!ok) brokenInternal.push(l);
}

async function check(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": UA, accept: "text/html,*/*;q=0.8", "accept-language": "es-ES,es;q=0.9" },
        signal: AbortSignal.timeout(15000),
      });
      r.body?.cancel?.().catch(() => {});
      if (r.status < 400) return { ok: true, status: r.status };
      if (r.status === 404 || r.status === 410) {
        if (attempt === 1) return { ok: false, kind: "roto", status: r.status };
      } else if ([401, 403, 429, 999, 405, 406].includes(r.status)) {
        return { ok: true, status: r.status, note: "bloquea robots" };
      } else if (attempt === 1) {
        return { ok: false, kind: "sin-respuesta", status: r.status };
      }
    } catch (e) {
      const code = e?.cause?.code || e?.code || e?.name;
      if (attempt === 1) {
        return { ok: false, kind: code === "ENOTFOUND" ? "roto" : "sin-respuesta", status: code || "error" };
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { ok: true };
}

const urls = [...external.keys()];
const results = new Map();
let next = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (next < urls.length) {
      const u = urls[next++];
      results.set(u, await check(u));
    }
  })
);

const broken = urls.filter((u) => results.get(u)?.kind === "roto");
const silent = urls.filter((u) => results.get(u)?.kind === "sin-respuesta");
const where = (u) => [...new Set(external.get(u).map((x) => x.label))].slice(0, 3).join(", ");

const lines = ["## Enlaces", ""];
lines.push(`Revisados ${urls.length} enlaces externos y ${internal.length} internos.`, "");
if (!broken.length && !brokenInternal.length) {
  lines.push("No hay enlaces rotos.", "");
} else {
  lines.push("### Rotos (hay que arreglarlos)");
  for (const u of broken) lines.push(`- ${u} → ${results.get(u).status}. En: ${where(u)}`);
  for (const l of brokenInternal) lines.push(`- ${l.url} no existe. En: ${l.label}`);
  lines.push("");
}
if (silent.length) {
  lines.push("### Sin respuesta (míralos si se repite la semana que viene)");
  for (const u of silent.slice(0, 15)) lines.push(`- ${u} → ${results.get(u).status}. En: ${where(u)}`);
  if (silent.length > 15) lines.push(`- …y ${silent.length - 15} más`);
  lines.push("");
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"));
console.log(lines.join("\n"));
