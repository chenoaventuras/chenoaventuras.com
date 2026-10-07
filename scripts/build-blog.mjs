/**
 * Compila el blog: content/blog/*.md  ->  HTML estático (SEO máximo).
 *
 * Genera:
 *   - /blog.html            (índice, listado de artículos)
 *   - /mapa.html            (mapa interactivo de los posts con lat/lng)
 *   - /blog/<slug>.html     (una página por artículo)
 *   - /sitemap.xml          (páginas fijas + artículos)
 *
 * Lo ejecuta Vercel en cada despliegue ("buildCommand" en vercel.json).
 * Los .md los crea el panel /admin (Decap CMS) y se commitean al repo.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.chenoaventuras.com";
const CONTENT_DIR = join(ROOT, "content", "blog");
const OUT_DIR = join(ROOT, "blog");
const DEST_DIR = join(ROOT, "destinos");
const OG_DEFAULT = SITE + "/assets/img/og-default.jpg";
const TAG_TYPES = ["Curiosidades", "Actividades", "Pueblos", "Spots", "Descuentos"]; // el resto de tags de un post son comunidades autónomas

// color de cada etiqueta del blog: un tono distinto por tag, sin repetir nunca
// entre las etiquetas que de verdad están en uso (se reparten por el círculo de
// color con el ángulo dorado, así aunque se añadan más etiquetas en el futuro
// cada una cae lejos de las demás).
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 1 / 6) rgb = [c, x, 0];
  else if (h < 2 / 6) rgb = [x, c, 0];
  else if (h < 3 / 6) rgb = [0, c, x];
  else if (h < 4 / 6) rgb = [0, x, c];
  else if (h < 5 / 6) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => Math.round((v + m) * 255));
}
function relLuminance([r, g, b]) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const toHex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const HUE_START = 205; // arranca en el azul de la marca
const GOLDEN_ANGLE = 137.508; // reparte los tonos lo más lejos posible entre sí
// colores fijos pedidos a mano para etiquetas concretas (el resto sigue siendo automático).
const TAG_COLOR_OVERRIDES = { "La Rioja": { bg: "#7b2d3e", fg: "#ffffff", hue: 347 } };
function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
function buildTagColorMap(orderedTags) {
  const map = new Map();
  const overrideHues = Object.values(TAG_COLOR_OVERRIDES).map((c) => c.hue);
  let step = 0;
  orderedTags.forEach((tag) => {
    if (TAG_COLOR_OVERRIDES[tag]) {
      map.set(tag, TAG_COLOR_OVERRIDES[tag]);
      return;
    }
    let hue = (HUE_START + step * GOLDEN_ANGLE) % 360;
    while (overrideHues.some((h) => hueDistance(hue, h) < 20)) {
      step++;
      hue = (HUE_START + step * GOLDEN_ANGLE) % 360;
    }
    step++;
    const rgb = hslToRgb(hue, 0.55, 0.4);
    map.set(tag, { bg: toHex(rgb), fg: relLuminance(rgb) > 0.42 ? "#23231f" : "#ffffff" });
  });
  return map;
}

marked.setOptions({ gfm: true, breaks: false });

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- cabecera y pie comunes (idénticos al resto del sitio) ---------- */
const NAV = `
  <header class="site-header site-header--solid">
    <nav class="nav container" data-nav>
      <a class="brand" href="/index.html"><span class="brand__name">Cheno</span><span class="brand__tag">Aventuras</span></a>
      <button class="nav__toggle" type="button" data-nav-toggle aria-label="Abrir menú" aria-expanded="false"><span></span></button>
      <ul class="nav__links">
        <li><a href="/index.html">Inicio</a></li>
        <li><a href="/aventuras.html">Aventuras</a></li>
        <li><a href="/mapa.html"{{CUR_MAPA}}>Mapa</a></li>
        <li><a href="/blog.html"{{CUR_BLOG}}>Blog</a></li>
        <li><a href="/equipo.html">Mi equipo</a></li>
        <li><a href="/servicios.html">Servicios</a></li>
        <li><a href="/contacto.html">Contacto</a></li>
        <li class="nav__social">
          <a href="https://www.instagram.com/chenoaventuras/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
          <a href="https://www.tiktok.com/@chenoaventuras" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>
          <a href="/minijuego" aria-label="Minijuego" class="nav__social--game"><img src="/assets/img/minijuego-icono.webp" alt="Minijuego" width="34" height="34" loading="lazy" decoding="async" /></a>
        </li>
      </ul>
    </nav>
  </header>`;

const FOOTER = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <span class="brand"><span class="brand__name">Cheno</span><span class="brand__tag">Aventuras</span></span>
          <p>Chenoaventuras — lugares reales para personas aventureras: rutas, destinos y curiosidades de viaje.</p>
          <div class="footer-social">
            <a href="https://www.instagram.com/chenoaventuras/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
            <a href="https://www.youtube.com/channel/UC_IpsXQB1ky-HUaDFePSPFg" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg></a>
            <a href="https://www.tiktok.com/@chenoaventuras" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a>
            <a href="https://www.facebook.com/Chenoaventuras" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"/></svg></a>
          </div>
        </div>
        <div><p class="footer-title">Explorar</p><ul class="footer-links"><li><a href="/aventuras.html">Aventuras</a></li><li><a href="/mapa.html">Mapa</a></li><li><a href="/blog.html">Blog</a></li><li><a href="/equipo.html">Mi equipo</a></li><li><a href="/servicios.html">Servicios</a></li></ul></div>
        <div><p class="footer-title">Cheno</p><ul class="footer-links"><li><a href="/contacto.html">Sobre mí y contacto</a></li><li><a href="/servicios.html#dron">Vuelo con dron</a></li><li><a href="/equipo.html#descuentos">Descuentos</a></li><li><a href="/minijuego">Minijuego</a></li><li><a href="/politica-cookies.html">Política de cookies</a></li><li><a href="/politica-privacidad.html">Política de privacidad</a></li></ul></div>
        <div><p class="footer-title">Newsletter</p><p>Rutas y aventuras directas a tu correo.</p><form class="subscribe" data-demo><input type="email" placeholder="Tu email" required aria-label="Tu email" /><button class="btn btn--light" type="submit">Me apunto</button></form><p data-demo-msg hidden class="subscribe__ok">¡Vamos a la aventura!</p><p class="subscribe__legal">Al apuntarte aceptas la <a href="/politica-privacidad.html">política de privacidad</a>.</p></div>
      </div>
      <div class="footer-bottom"><span>© <span data-year>${new Date().getFullYear()}</span> Chenoaventuras. Todos los derechos reservados.</span><span>chenoaventuras.com</span></div>
    </div>
  </footer>
  <script src="/assets/js/main.js"></script>
  <script defer src="/_vercel/insights/script.js"></script>`;

function shell({ title, description, canonical, image, ogType = "website", jsonld = "", body, extraHead = "", current = "blog" }) {
  const img = image || OG_DEFAULT;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="preload" href="/assets/fonts/poppins-400.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/assets/fonts/Inter-Black.otf" as="font" type="font/otf" crossorigin />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#274c78" />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/img/favicon-48.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="/assets/img/favicon-96.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/img/favicon-192.png" />
  <link rel="apple-touch-icon" href="/assets/img/favicon-180.png" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Chenoaventuras" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(img)}" />
  <link rel="stylesheet" href="/assets/css/styles.css" />${extraHead}
  <script>document.documentElement.classList.add("js");</script>${jsonld ? `\n  <script type="application/ld+json">\n${jsonld}\n  </script>` : ""}
</head>
<body>
${NAV.replace("{{CUR_BLOG}}", current === "blog" ? ' aria-current="page"' : "").replace("{{CUR_MAPA}}", current === "mapa" ? ' aria-current="page"' : "")}

  <main>
${body}
  </main>
${FOOTER}
</body>
</html>
`;
}

/* ---------- leer artículos ---------- */
function readPosts() {
  if (!existsSync(CONTENT_DIR)) return [];
  const posts = [];
  for (const file of readdirSync(CONTENT_DIR)) {
    if (!file.endsWith(".md")) continue;
    const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
    const { data, content } = matter(raw);
    if (data.draft) continue;
    const slug = (data.slug || file.replace(/\.md$/, "")).toLowerCase();
    const date = data.date ? new Date(data.date) : new Date();
    const updated = data.updated ? new Date(data.updated) : date;
    const num = (v) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
    const title = (data.title || slug).trim();
    const excerpt = (data.excerpt || data.description || "").trim();
    let html = marked.parse(content);
    // tamaño opcional: escribiendo ![texto](ruta.webp#small) o "#medium" en markdown
    html = html.replace(
      /<img([^>]*?)\ssrc="([^"]+?)#(small|medium)"([^>]*)>/g,
      (_m, pre, src, size, post) => `<img${pre} src="${src}" class="article__img--${size}"${post}>`
    );
    // imágenes del cuerpo: carga diferida
    html = html.replace(/<img /g, '<img loading="lazy" decoding="async" ');
    const tags = Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    posts.push({
      slug, title, date, updated,
      lat: num(data.lat), lng: num(data.lng),
      lugar: data.lugar ? String(data.lugar).trim() : "",
      destino: data.destino ? String(data.destino).trim() : "",
      seoTitle: data.seoTitle ? String(data.seoTitle).trim() : "",
      guia: data.guia ? String(data.guia) : "",
      guiaTitulo: data.guiaTitulo ? String(data.guiaTitulo) : "",
      excerpt: excerpt || title,
      cover: data.cover ? String(data.cover) : "",
      coverPosition: data.coverPosition ? String(data.coverPosition) : "",
      tags,
      // posts fijados (p.ej. bienvenida, descuentos): se van siempre arriba,
      // por delante de todo lo demás, ordenados por pinnedOrder. El resto
      // sigue ordenándose por fecha como hasta ahora.
      pinnedOrder: typeof data.pinnedOrder === "number" ? data.pinnedOrder : null,
      // wide: true → el cuerpo ocupa todo el ancho del contenedor (guías con tarjetas)
      wide: data.wide === true,
      html,
      url: `${SITE}/blog/${slug}.html`,
    });
  }
  posts.sort((a, b) => {
    const ap = a.pinnedOrder, bp = b.pinnedOrder;
    if (ap !== null && bp !== null) return ap - bp;
    if (ap !== null) return -1;
    if (bp !== null) return 1;
    return b.date - a.date;
  });
  return posts;
}

/* ---------- página de artículo ---------- */
/* ---------- destinos (páginas que reúnen varios posts de un mismo sitio) ---------- */
function readDestinos(posts) {
  const dir = join(ROOT, "content", "destinos");
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
    const slug = f.replace(/\.md$/, "").toLowerCase();
    const mine = posts.filter((p) => p.destino === slug).sort((a, b) => b.date - a.date);
    if (!mine.length) continue;
    const num = (v) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
    out.push({
      slug,
      title: String(data.title || slug),
      nombre: String(data.nombre || data.title || slug),
      description: String(data.description || ""),
      lat: num(data.lat),
      lng: num(data.lng),
      cover: data.cover ? String(data.cover) : (mine.find((p) => p.cover) || {}).cover || "",
      html: marked.parse(content),
      posts: mine,
      url: `${SITE}/destinos/${slug}.html`,
    });
  }
  return out.sort((a, b) => b.posts.length - a.posts.length || a.nombre.localeCompare(b.nombre, "es"));
}

const PIN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

function placeChip(d) {
  return d ? `<a class="placechip" href="/destinos/${d.slug}.html">${PIN_SVG}Más sobre ${esc(d.nombre)}</a>` : "";
}

function authorBox() {
  return `          <aside class="authorbox" aria-label="Sobre el autor">
            <img class="authorbox__img" src="/assets/img/cheno-perfil-192.webp" alt="Cheno, de Chenoaventuras" width="96" height="96" loading="lazy" decoding="async" />
            <div class="authorbox__body">
              <p class="authorbox__name">Cheno · Chenoaventuras</p>
              <p>Lugares de interés para personas aventureras. Visito y pruebo todo lo que cuento: rutas, actividades y curiosidades de viaje por España y más allá.</p>
              <p class="authorbox__links"><a href="https://www.instagram.com/chenoaventuras/" target="_blank" rel="noopener me">Instagram</a> · <a href="https://www.tiktok.com/@chenoaventuras" target="_blank" rel="noopener me">TikTok</a> · <a href="https://www.youtube.com/channel/UC_IpsXQB1ky-HUaDFePSPFg" target="_blank" rel="noopener me">YouTube</a> · <a href="/contacto.html">Contacto</a></p>
            </div>
          </aside>
`;
}

/* ---------- tarjetas, posts relacionados y bloque de guía ---------- */
// <title> de Google: ~60 caracteres. Con marca si cabe; si no, el seoTitle del
// post (campo opcional) o el título solo.
function seoTitleOf(p) {
  if (p.seoTitle) return p.seoTitle;
  const full = `${p.title} | Chenoaventuras`;
  return full.length <= 62 ? full : p.title;
}

const norm = (s = "") =>String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const fmtEs = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
function dateLine(p) {
  const t = (d) => `<time datetime="${d.toISOString().slice(0, 10)}">${fmtEs.format(d)}</time>`;
  const changed = Math.abs(p.updated - p.date) > 24 * 3600 * 1000;
  return `<p class="article__date">Publicado el ${t(p.date)}${changed ? ` · Actualizado el ${t(p.updated)}` : ""}</p>`;
}

// Miniatura de 640 px (si existe) para tarjetas y mapa; el hero del post usa la original.
function thumbOf(cover) {
  if (!cover || !/^\/assets\/img\/(instagram|blog)\/[^/]+\.webp$/.test(cover)) return cover;
  const t = cover.replace(/\.webp$/, "-640.webp");
  return existsSync(join(ROOT, t.slice(1))) ? t : cover;
}

function blogCard(p, { level = 2, search = false, eager = false } = {}) {
  const attrs = search
    ? ` data-tags="${esc(p.tags.join("|"))}" data-search="${esc(norm([p.title, p.excerpt, p.tags.join(" ")].join(" ")))}"`
    : "";
  return `          <a class="blogcard reveal" href="/blog/${p.slug}.html"${attrs}>
            ${
              p.cover
                ? `<div class="blogcard__media"><img src="${esc(thumbOf(p.cover))}" alt="${esc(p.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${p.coverPosition ? ` style="object-position: ${esc(p.coverPosition)}"` : ""} /></div>`
                : `<div class="blogcard__media blogcard__media--empty"></div>`
            }
            <div class="blogcard__body">
              <h${level}>${esc(p.title)}</h${level}>
              <p>${esc(p.excerpt)}</p>
            </div>
          </a>`;
}

function kmBetween(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// misma comunidad > cerca en el mapa > mismo tipo; los descuentos solo salen
// como relacionados de otro descuento.
function relatedPosts(p, posts, n = 3) {
  const region = p.tags.find((t) => !TAG_TYPES.includes(t));
  const type = p.tags.find((t) => TAG_TYPES.includes(t));
  const isDisc = p.tags.includes("Descuentos");
  return posts
    .filter((q) => q.slug !== p.slug && q.tags.length && q.tags.includes("Descuentos") === isDisc)
    .map((q) => {
      let score = 0;
      if (region && q.tags.includes(region)) score += 3;
      if (type && q.tags.includes(type)) score += 2;
      if (p.lat !== null && q.lat !== null) {
        const km = kmBetween(p, q);
        if (km < 50) score += 4;
        else if (km < 150) score += 2;
      }
      return { q, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.q.date - a.q.date)
    .slice(0, n)
    .map((x) => x.q);
}

function guideBox(p) {
  if (!p.guia) return "";
  const name = p.guiaTitulo || "Descarga la guía en PDF";
  return `          <aside class="guidebox" data-guide-box>
            <div class="guidebox__text">
              <span class="eyebrow">Gratis</span>
              <h2>${esc(name)}</h2>
              <p>Déjame tu email, descárgala al momento y recibe mis rutas y aventuras por correo.</p>
            </div>
            <div class="guidebox__action">
              <form class="guideform" data-guide="${esc(p.guia)}" data-guide-source="${esc(p.slug)}">
                <input type="email" placeholder="Tu email" required aria-label="Tu email" autocomplete="email" />
                <button class="btn" type="submit">Quiero la guía</button>
              </form>
              <p class="guidebox__legal">Al apuntarte aceptas recibir mi newsletter. Puedes darte de baja cuando quieras. <a href="/politica-privacidad.html">Política de privacidad</a>.</p>
              <p class="guidebox__msg" data-guide-msg hidden></p>
              <a class="btn guidebox__dl" data-guide-link href="${esc(p.guia)}" download hidden>Descargar la guía (PDF)</a>
            </div>
          </aside>
`;
}

function renderPost(p, tagColorMap, nextPost, related = [], destino = null) {
  const coverAbs = p.cover ? (p.cover.startsWith("http") ? p.cover : SITE + p.cover) : "";
  const regionTag = p.tags.find((t) => !TAG_TYPES.includes(t));
  const jsonld = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          headline: p.title,
          description: p.excerpt,
          datePublished: p.date.toISOString(),
          dateModified: p.updated.toISOString(),
          image: coverAbs || OG_DEFAULT,
          url: p.url,
          mainEntityOfPage: p.url,
          inLanguage: "es",
          keywords: p.tags.join(", "),
          ...(regionTag ? { about: { "@type": "Place", name: regionTag } } : {}),
          ...(p.lat !== null && p.lng !== null
            ? {
                contentLocation: {
                  "@type": "Place",
                  name: p.lugar || regionTag || p.title,
                  geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng },
                  address: {
                    "@type": "PostalAddress",
                    ...(regionTag ? { addressRegion: regionTag } : {}),
                    addressCountry: p.lat < 35.5 && p.lng > -10.5 ? "MA" : "ES",
                  },
                },
              }
            : {}),
          author: {
            "@type": "Person",
            name: "Cheno",
            url: SITE + "/contacto.html",
            sameAs: [
              "https://www.instagram.com/chenoaventuras/",
              "https://www.tiktok.com/@chenoaventuras",
              "https://www.youtube.com/channel/UC_IpsXQB1ky-HUaDFePSPFg",
            ],
          },
          publisher: {
            "@type": "Person",
            name: "Chenoaventuras",
            logo: { "@type": "ImageObject", url: SITE + "/assets/img/favicon-512.png" },
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inicio", item: SITE + "/index.html" },
            { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog.html" },
            { "@type": "ListItem", position: 3, name: p.title, item: p.url },
          ],
        },
      ],
    },
    null,
    2
  );

  const heroStyle = p.coverPosition ? ` style="object-position: ${esc(p.coverPosition)}"` : "";
  const heroMedia = p.cover
    ? `<div class="pagehead__media"><img src="${esc(p.cover)}" alt="${esc(p.title)}" decoding="async" fetchpriority="high"${heroStyle} /></div>`
    : "";
  const tagsHtml = p.tags.length
    ? `<div class="article__tags">${p.tags
        .map((t) => {
          const c = tagColorMap.get(t) || { bg: "#4a5568", fg: "#ffffff" };
          return `<span class="tagchip" style="background:${c.bg};color:${c.fg}">${esc(t)}</span>`;
        })
        .join("")}</div>`
    : "";

  const body = `    <article class="article">
      <section class="pagehead pagehead--blog torn-bottom" style="background:linear-gradient(120deg,#1f3e64,#3c6aa3 55%,#5a90cf);">
        ${heroMedia}
        <div class="pagehead__inner container">
          <p class="article__meta article__meta--nav">
            <a href="/blog.html">&larr; Blog</a>
            ${nextPost ? `<a href="/blog/${nextPost.slug}.html" class="article__next" title="${esc(nextPost.title)}">Siguiente &rarr;</a>` : ""}
          </p>
          <h1>${esc(p.title)}</h1>
          ${tagsHtml}
          ${p.tags.includes("Descuentos") || !p.tags.length ? "" : dateLine(p)}
          ${placeChip(destino)}
        </div>
      </section>

      <section class="section">
        <div class="container">
${guideBox(p)}          <div class="article__body${p.wide ? " article__body--wide" : ""}">
${p.html}
          </div>
${authorBox()}${
  related.length
    ? `          <section class="related">
            <h2 class="related__title">Sigue explorando</h2>
${destino ? `            <p class="related__more"><a href="/destinos/${destino.slug}.html">Ver todo sobre ${esc(destino.nombre)} &rarr;</a></p>\n` : ""}            <div class="bloglist bloglist--related">
${related.map((r) => blogCard(r, { level: 3 })).join("\n")}
            </div>
          </section>
`
    : ""
}          <p class="article__back" style="margin-top:40px;"><a class="btn btn--ghost" href="/blog.html">Ver más artículos</a></p>
        </div>
      </section>
    </article>`;

  return shell({
    title: seoTitleOf(p),
    description: p.excerpt,
    canonical: p.url,
    image: coverAbs,
    ogType: "article",
    jsonld,
    body,
  });
}

/* ---------- índice del blog ---------- */
function renderIndex(posts, destinos = []) {
  const cards = posts.map((p, i) => blogCard(p, { search: true, eager: i < 2 })).join("\n");

  const empty = `<p class="lead center" style="margin-inline:auto;">Todavía no hay artículos publicados. Vuelve pronto.</p>`;

  // desplegable de filtro: Tipo (Curiosidades/Actividades) + Comunidad Autónoma,
  // solo con las etiquetas que de verdad tienen posts.
  const allTags = [...new Set(posts.flatMap((p) => p.tags))];
  const typeTags = TAG_TYPES.filter((t) => allTags.includes(t));
  const regionTags = allTags.filter((t) => !TAG_TYPES.includes(t)).sort((a, b) => a.localeCompare(b, "es"));
  const filterBar = `        <div class="blogfilter">
          <div class="blogfilter__search">
            <input id="blog-search" type="search" placeholder="Buscar: Cuenca, snorkel, cascada…" aria-label="Buscar en el blog" autocomplete="off" />
          </div>
          ${
            typeTags.length || regionTags.length
              ? `<div class="blogfilter__select">
            <label for="blog-filter">Filtrar por</label>
            <select id="blog-filter">
              <option value="">Todos los posts</option>
              ${typeTags.length ? `<optgroup label="Tipo">${typeTags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</optgroup>` : ""}
              ${regionTags.length ? `<optgroup label="Comunidad autónoma">${regionTags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</optgroup>` : ""}
            </select>
          </div>`
              : ""
          }
          <p class="blogfilter__count" id="blog-count" aria-live="polite"></p>
        </div>\n`;

  const body = `    <section class="pagehead pagehead--bloghome torn-bottom" style="background:linear-gradient(120deg,#1f3e64,#3c6aa3 55%,#5a90cf);">
      <div class="pagehead__inner container">
        <span class="eyebrow" style="color:var(--gold-soft)">Blog</span>
        <h1>Historias del camino</h1>
        <p>Rutas, consejos y rincones de España contados con calma por Chenoaventuras.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
${
  destinos.length
    ? `        <nav class="destinos-strip" aria-label="Destinos">
          <span class="destinos-strip__label">Destinos</span>
${destinos.map((d) => `          <a class="destinos-strip__item" href="/destinos/${d.slug}.html">${esc(d.nombre)} <b>${d.posts.length}</b></a>`).join("\n")}
        </nav>
`
    : ""
}${filterBar}${posts.length ? `        <div class="bloglist" id="bloglist">\n${cards}\n        </div>\n        <p class="lead center" id="blogfilter-empty" hidden style="margin-inline:auto;">Ningún post coincide con tu búsqueda todavía.</p>` : `        ${empty}`}
      </div>
    </section>
    <script>
      (function () {
        var sel = document.getElementById("blog-filter");
        var q = document.getElementById("blog-search");
        if (!sel && !q) return;
        var cards = Array.prototype.slice.call(document.querySelectorAll("#bloglist .blogcard"));
        var emptyMsg = document.getElementById("blogfilter-empty");
        var countEl = document.getElementById("blog-count");
        function norm(t) { return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
        function apply(updateUrl) {
          var v = sel ? sel.value : "";
          var terms = q ? norm(q.value).split(/\s+/).filter(Boolean) : [];
          var visible = 0;
          cards.forEach(function (c) {
            var tags = (c.getAttribute("data-tags") || "").split("|");
            var hay = c.getAttribute("data-search") || "";
            var show = (!v || tags.indexOf(v) !== -1) && terms.every(function (t) { return hay.indexOf(t) !== -1; });
            c.hidden = !show;
            if (show) visible++;
          });
          if (emptyMsg) emptyMsg.hidden = visible !== 0;
          if (countEl) countEl.textContent = (v || terms.length) ? visible + (visible === 1 ? " artículo" : " artículos") : "";
          if (updateUrl && window.history && history.replaceState) {
            var ps = new URLSearchParams();
            if (q && q.value.trim()) ps.set("q", q.value.trim());
            if (v) ps.set("tag", v);
            var qs = ps.toString();
            history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
          }
        }
        var params = new URLSearchParams(location.search);
        if (sel && params.get("tag")) {
          var opt = Array.prototype.slice.call(sel.options).filter(function (o) { return o.value === params.get("tag"); })[0];
          if (opt) sel.value = opt.value;
        }
        if (q && params.get("q")) q.value = params.get("q");
        if (sel) sel.addEventListener("change", function () { apply(true); });
        if (q) q.addEventListener("input", function () { apply(true); });
        apply(false);
      })();
    </script>`;

  return shell({
    title: "Blog de viajes y rutas por España | Chenoaventuras",
    description:
      "Artículos de Chenoaventuras: rutas, consejos de viaje y rincones de España para preparar tu próxima escapada.",
    canonical: `${SITE}/blog.html`,
    body,
  });
}

/* ---------- mapa interactivo ---------- */
const MAP_TYPES = ["Actividades", "Pueblos", "Spots", "Curiosidades"];
const MAP_COLORS = { Actividades: "#274c78", Pueblos: "#77854f", Spots: "#d9a406", Curiosidades: "#8a5a9e" };

function regionOf(p) {
  const r = p.tags.find((t) => !TAG_TYPES.includes(t));
  if (r) return r;
  return p.lat !== null && p.lat < 35.5 && p.lng > -10.5 ? "Marruecos" : "Otros destinos";
}

function renderMap(posts, destinos = []) {
  const located = posts.filter((p) => p.lat !== null && p.lng !== null && p.tags.length && !p.tags.includes("Descuentos"));
  const data = located.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover: thumbOf(p.cover),
    url: `/blog/${p.slug}.html`,
    type: p.tags.find((t) => MAP_TYPES.includes(t)) || "",
    region: regionOf(p),
    destino: p.destino || "",
    destinoNombre: (destinos.find((d) => d.slug === p.destino) || {}).nombre || "",
    lat: p.lat,
    lng: p.lng,
  }));
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const regions = [...new Set(data.map((d) => d.region))].sort((a, b) => a.localeCompare(b, "es"));
  const types = MAP_TYPES.filter((t) => data.some((d) => d.type === t));

  const byRegion = regions
    .map((r) => {
      const items = data.filter((d) => d.region === r).sort((a, b) => a.title.localeCompare(b.title, "es"));
      return `        <h3>${esc(r)}</h3>\n        <ul>\n${items.map((d) => `          <li><a href="${d.url}">${esc(d.title)}</a></li>`).join("\n")}\n        </ul>`;
    })
    .join("\n");

  const body = `    <section class="pagehead pagehead--bloghome torn-bottom" style="background:linear-gradient(120deg,#1f3e64,#3c6aa3 55%,#5a90cf);">
      <div class="pagehead__inner container">
        <span class="eyebrow" style="color:var(--gold-soft)">Mapa</span>
        <h1>Mapa de aventuras</h1>
        <p>Todos los lugares de los que te he hablado, en un solo mapa. Toca un punto y descubre el artículo.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="mapbar">
          <div class="mapbar__chips" role="group" aria-label="Filtrar por tipo">
            <button type="button" class="mapchip is-active" data-map-type="">Todos</button>
${types.map((t) => `            <button type="button" class="mapchip" data-map-type="${esc(t)}"><i style="background:${MAP_COLORS[t]}"></i>${esc(t)}</button>`).join("\n")}
          </div>
          <div class="mapbar__right">
            <label for="map-region" class="sr-only">Comunidad o zona</label>
            <select id="map-region" aria-label="Comunidad o zona">
              <option value="">Todas las zonas</option>
${regions.map((r) => `              <option value="${esc(r)}">${esc(r)}</option>`).join("\n")}
            </select>
            <button type="button" class="mapchip" data-map-go="canarias">Canarias</button>
            <button type="button" class="mapchip" data-map-go="marruecos">Marruecos</button>
            <span class="mapbar__count" id="map-count" aria-live="polite"></span>
          </div>
        </div>
        <p class="mapnotice" id="map-notice" hidden></p>
        <div id="mapa" class="mapa" role="region" aria-label="Mapa interactivo de aventuras"></div>
        <noscript><p class="lead">El mapa necesita JavaScript. Mientras tanto, aquí tienes todos los lugares en la lista de abajo.</p></noscript>
        <script type="application/json" id="mapa-data">${json}</script>

        <div class="maplist">
          <h2>Todos los lugares</h2>
${
  destinos.length
    ? `        <h3>Destinos</h3>
        <ul>
${destinos.map((d) => `          <li><a href="/destinos/${d.slug}.html">${esc(d.title)}</a> (${d.posts.length} artículos)</li>`).join("\n")}
        </ul>
`
    : ""
}${byRegion}
        </div>
      </div>
    </section>
    <script src="/assets/vendor/leaflet/leaflet.js"></script>
    <script src="/assets/js/mapa.js"></script>`;

  return shell({
    title: "Mapa de aventuras por España y Marruecos | Chenoaventuras",
    description:
      "Mapa interactivo con todos los lugares de Chenoaventuras: pueblos, cascadas, actividades de aventura y curiosidades por España y Marruecos.",
    canonical: `${SITE}/mapa.html`,
    jsonld: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Mapa de aventuras",
        url: `${SITE}/mapa.html`,
        inLanguage: "es",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: data.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + d.url, name: d.title })),
        },
      },
      null,
      2
    ),
    extraHead: `\n  <link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css" />`,
    current: "mapa",
    body,
  });
}

/* ---------- página de destino ---------- */
function renderDestino(d) {
  const cards = d.posts.map((p) => blogCard(p, { level: 3 })).join("\n");
  const jsonld = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: d.title,
          description: d.description,
          url: d.url,
          inLanguage: "es",
          ...(d.lat !== null && d.lng !== null
            ? {
                about: {
                  "@type": "Place",
                  name: d.nombre,
                  geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
                  address: { "@type": "PostalAddress", addressCountry: d.lat < 35.5 && d.lng > -10.5 ? "MA" : "ES" },
                },
              }
            : {}),
          mainEntity: {
            "@type": "ItemList",
            itemListElement: d.posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: p.url, name: p.title })),
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inicio", item: SITE + "/index.html" },
            { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog.html" },
            { "@type": "ListItem", position: 3, name: d.nombre, item: d.url },
          ],
        },
      ],
    },
    null,
    2
  );
  const body = `    <section class="pagehead pagehead--bloghome torn-bottom" style="background:linear-gradient(120deg,#1f3e64,#3c6aa3 55%,#5a90cf);">
      <div class="pagehead__inner container">
        <span class="eyebrow" style="color:var(--gold-soft)">Destino</span>
        <h1>${esc(d.title)}</h1>
        <p>${esc(d.description)}</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="article__body">
${d.html}
        </div>
        <h2 class="related__title" style="margin-top:36px;">Artículos sobre ${esc(d.nombre)}</h2>
        <div class="bloglist bloglist--related">
${cards}
        </div>
        <p class="article__back" style="margin-top:36px;display:flex;gap:12px;flex-wrap:wrap;">
          <a class="btn" href="/mapa.html?destino=${d.slug}">Ver en el mapa</a>
          <a class="btn btn--ghost" href="/blog.html">Todos los artículos</a>
        </p>
      </div>
    </section>`;
  return shell({
    title: d.title.length + 16 <= 62 ? `${d.title} | Chenoaventuras` : d.title,
    description: d.description,
    canonical: d.url,
    image: d.cover ? (d.cover.startsWith("http") ? d.cover : SITE + d.cover) : "",
    jsonld,
    body,
  });
}

/* ---------- sitemap ---------- */
function renderSitemap(posts, destinos = []) {
  // Solo se pone lastmod donde es verdad: el blog y el mapa cambian cuando
  // cambia el último post. En el resto no se pone (poner "hoy" en cada
  // despliegue hace que Google deje de fiarse de las fechas del sitemap).
  const latest = posts.reduce((m, p) => (p.updated > m ? p.updated : m), new Date(0)).toISOString().slice(0, 10);
  const fixed = [
    ["/", "1.0", "weekly", null],
    ["/aventuras.html", "0.8", "weekly", null],
    ["/blog.html", "0.8", "weekly", latest],
    ["/mapa.html", "0.8", "weekly", latest],
    ["/curiosidades.html", "0.8", "weekly", null],
    ["/servicios.html", "0.7", "monthly", null],
    ["/equipo.html", "0.6", "monthly", null],
    ["/contacto.html", "0.6", "monthly", null],
    ["/politica-privacidad.html", "0.3", "yearly", null],
  ];
  const rows = [
    ...fixed.map(
      ([loc, pr, cf, lm]) =>
        `  <url><loc>${SITE}${loc}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}<changefreq>${cf}</changefreq><priority>${pr}</priority></url>`
    ),
    ...destinos.map((d) => {
      const lm = d.posts.reduce((m, p) => (p.updated > m ? p.updated : m), new Date(0)).toISOString().slice(0, 10);
      return `  <url><loc>${d.url}</loc><lastmod>${lm}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`;
    }),
    ...posts.map(
      (p) =>
        `  <url><loc>${p.url}</loc><lastmod>${p.updated.toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

/* ---------- build ---------- */
const posts = readPosts();
const destinos = readDestinos(posts);
const destinoOf = (p) => destinos.find((d) => d.slug === p.destino) || null;

// mismo orden que el desplegable de filtro (tipo, luego comunidad autónoma
// alfabético) para que la asignación de colores sea estable entre builds.
const allTagsUsed = [...new Set(posts.flatMap((p) => p.tags))];
const orderedTags = [
  ...TAG_TYPES.filter((t) => allTagsUsed.includes(t)),
  ...allTagsUsed.filter((t) => !TAG_TYPES.includes(t)).sort((a, b) => a.localeCompare(b, "es")),
];
const tagColorMap = buildTagColorMap(orderedTags);

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
for (let i = 0; i < posts.length; i++) {
  const p = posts[i];
  const nextPost = posts[i + 1] || null;
  writeFileSync(join(OUT_DIR, `${p.slug}.html`), renderPost(p, tagColorMap, nextPost, relatedPosts(p, posts), destinoOf(p)));
}
rmSync(DEST_DIR, { recursive: true, force: true });
mkdirSync(DEST_DIR, { recursive: true });
for (const d of destinos) writeFileSync(join(DEST_DIR, `${d.slug}.html`), renderDestino(d));
writeFileSync(join(ROOT, "blog.html"), renderIndex(posts, destinos));
writeFileSync(join(ROOT, "mapa.html"), renderMap(posts, destinos));
writeFileSync(join(ROOT, "sitemap.xml"), renderSitemap(posts, destinos));

console.log(`Blog compilado: ${posts.length} artículo(s), ${destinos.length} destino(s).`);
for (const p of posts) console.log(`  /blog/${p.slug}.html  ·  ${p.title}`);
