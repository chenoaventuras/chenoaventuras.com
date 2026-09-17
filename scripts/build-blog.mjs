/**
 * Compila el blog: content/blog/*.md  ->  HTML estático (SEO máximo).
 *
 * Genera:
 *   - /blog.html            (índice, listado de artículos)
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
const OG_DEFAULT = SITE + "/assets/img/og-default.jpg";
const TAG_TYPES = ["Curiosidades", "Actividades", "Pueblos", "Spots"]; // el resto de tags de un post son comunidades autónomas

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
      <a class="brand" href="/index.html" aria-label="Chenoaventuras — inicio"><span class="brand__name">Cheno</span><span class="brand__tag">Aventuras</span></a>
      <button class="nav__toggle" type="button" data-nav-toggle aria-label="Abrir menú" aria-expanded="false"><span></span></button>
      <ul class="nav__links">
        <li><a href="/index.html">Inicio</a></li>
        <li><a href="/aventuras.html">Aventuras</a></li>
        <li><a href="/blog.html" aria-current="page">Blog</a></li>
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
        <div><h5>Explorar</h5><ul class="footer-links"><li><a href="/aventuras.html">Aventuras</a></li><li><a href="/blog.html">Blog</a></li><li><a href="/equipo.html">Mi equipo</a></li><li><a href="/servicios.html">Servicios</a></li></ul></div>
        <div><h5>Cheno</h5><ul class="footer-links"><li><a href="/contacto.html">Sobre mí y contacto</a></li><li><a href="/servicios.html#dron">Vuelo con dron</a></li><li><a href="/equipo.html#descuentos">Descuentos</a></li><li><a href="/minijuego">Minijuego</a></li><li><a href="/politica-cookies.html">Política de cookies</a></li></ul></div>
        <div><h5>Newsletter</h5><p>Rutas y aventuras directas a tu correo.</p><form class="subscribe" data-demo><input type="email" placeholder="Tu email" required aria-label="Tu email" /><button class="btn btn--light" type="submit">Me apunto</button></form><p data-demo-msg hidden class="subscribe__ok">¡Vamos a la aventura!</p></div>
      </div>
      <div class="footer-bottom"><span>© <span data-year>${new Date().getFullYear()}</span> Chenoaventuras. Todos los derechos reservados.</span><span>chenoaventuras.com</span></div>
    </div>
  </footer>
  <script src="/assets/js/main.js"></script>
  <script defer src="/_vercel/insights/script.js"></script>`;

function shell({ title, description, canonical, image, ogType = "website", jsonld = "", body }) {
  const img = image || OG_DEFAULT;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet" />
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
  <link rel="stylesheet" href="/assets/css/styles.css" />
  <script>document.documentElement.classList.add("js");</script>${jsonld ? `\n  <script type="application/ld+json">\n${jsonld}\n  </script>` : ""}
</head>
<body>
${NAV}

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
      slug, title, date,
      excerpt: excerpt || title,
      cover: data.cover ? String(data.cover) : "",
      coverPosition: data.coverPosition ? String(data.coverPosition) : "",
      tags,
      html,
      url: `${SITE}/blog/${slug}.html`,
    });
  }
  posts.sort((a, b) => b.date - a.date);
  return posts;
}

/* ---------- página de artículo ---------- */
function renderPost(p, tagColorMap, nextPost) {
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
          dateModified: p.date.toISOString(),
          image: coverAbs || OG_DEFAULT,
          url: p.url,
          mainEntityOfPage: p.url,
          inLanguage: "es",
          keywords: p.tags.join(", "),
          ...(regionTag ? { about: { "@type": "Place", name: regionTag } } : {}),
          author: { "@type": "Person", name: "Cheno", url: SITE + "/contacto.html" },
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
    ? `<div class="pagehead__media"><img src="${esc(p.cover)}" alt="${esc(p.title)}" decoding="async"${heroStyle} /></div>`
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
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="article__body">
${p.html}
          </div>
          <p class="article__back" style="margin-top:40px;"><a class="btn btn--ghost" href="/blog.html">Ver más artículos</a></p>
        </div>
      </section>
    </article>`;

  return shell({
    title: `${p.title} | Chenoaventuras`,
    description: p.excerpt,
    canonical: p.url,
    image: coverAbs,
    ogType: "article",
    jsonld,
    body,
  });
}

/* ---------- índice del blog ---------- */
function renderIndex(posts) {
  const cards = posts
    .map(
      (p) => `          <a class="blogcard reveal" href="/blog/${p.slug}.html" data-tags="${esc(p.tags.join("|"))}">
            ${
              p.cover
                ? `<div class="blogcard__media"><img src="${esc(p.cover)}" alt="${esc(p.title)}" loading="lazy" decoding="async"${p.coverPosition ? ` style="object-position: ${esc(p.coverPosition)}"` : ""} /></div>`
                : `<div class="blogcard__media blogcard__media--empty"></div>`
            }
            <div class="blogcard__body">
              <h2>${esc(p.title)}</h2>
              <p>${esc(p.excerpt)}</p>
            </div>
          </a>`
    )
    .join("\n");

  const empty = `<p class="lead center" style="margin-inline:auto;">Todavía no hay artículos publicados. Vuelve pronto.</p>`;

  // desplegable de filtro: Tipo (Curiosidades/Actividades) + Comunidad Autónoma,
  // solo con las etiquetas que de verdad tienen posts.
  const allTags = [...new Set(posts.flatMap((p) => p.tags))];
  const typeTags = TAG_TYPES.filter((t) => allTags.includes(t));
  const regionTags = allTags.filter((t) => !TAG_TYPES.includes(t)).sort((a, b) => a.localeCompare(b, "es"));
  const filterBar =
    typeTags.length || regionTags.length
      ? `        <div class="blogfilter">
          <label for="blog-filter">Filtrar por</label>
          <select id="blog-filter">
            <option value="">Todos los posts</option>
            ${typeTags.length ? `<optgroup label="Tipo">${typeTags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</optgroup>` : ""}
            ${regionTags.length ? `<optgroup label="Comunidad autónoma">${regionTags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</optgroup>` : ""}
          </select>
        </div>\n`
      : "";

  const body = `    <section class="pagehead pagehead--bloghome torn-bottom" style="background:linear-gradient(120deg,#1f3e64,#3c6aa3 55%,#5a90cf);">
      <div class="pagehead__inner container">
        <span class="eyebrow" style="color:var(--gold-soft)">Blog</span>
        <h1>Historias del camino</h1>
        <p>Rutas, consejos y rincones de España contados con calma por Chenoaventuras.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
${filterBar}${posts.length ? `        <div class="bloglist" id="bloglist">\n${cards}\n        </div>\n        <p class="lead center" id="blogfilter-empty" hidden style="margin-inline:auto;">Ningún post coincide con ese filtro todavía.</p>` : `        ${empty}`}
      </div>
    </section>
    <script>
      (function () {
        var sel = document.getElementById("blog-filter");
        if (!sel) return;
        var cards = Array.prototype.slice.call(document.querySelectorAll("#bloglist .blogcard"));
        var emptyMsg = document.getElementById("blogfilter-empty");
        sel.addEventListener("change", function () {
          var v = sel.value;
          var visible = 0;
          cards.forEach(function (c) {
            var tags = (c.getAttribute("data-tags") || "").split("|");
            var show = !v || tags.indexOf(v) !== -1;
            c.hidden = !show;
            if (show) visible++;
          });
          if (emptyMsg) emptyMsg.hidden = visible !== 0;
        });
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

/* ---------- sitemap ---------- */
function renderSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const fixed = [
    ["/", "1.0", "weekly"],
    ["/aventuras.html", "0.8", "weekly"],
    ["/blog.html", "0.8", "weekly"],
    ["/curiosidades.html", "0.8", "weekly"],
    ["/servicios.html", "0.7", "monthly"],
    ["/equipo.html", "0.6", "monthly"],
    ["/contacto.html", "0.6", "monthly"],
  ];
  const rows = [
    ...fixed.map(
      ([loc, pr, cf]) =>
        `  <url><loc>${SITE}${loc}</loc><lastmod>${today}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`
    ),
    ...posts.map(
      (p) =>
        `  <url><loc>${p.url}</loc><lastmod>${p.date.toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

/* ---------- build ---------- */
const posts = readPosts();

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
  writeFileSync(join(OUT_DIR, `${p.slug}.html`), renderPost(p, tagColorMap, nextPost));
}
writeFileSync(join(ROOT, "blog.html"), renderIndex(posts));
writeFileSync(join(ROOT, "sitemap.xml"), renderSitemap(posts));

console.log(`Blog compilado: ${posts.length} artículo(s).`);
for (const p of posts) console.log(`  /blog/${p.slug}.html  ·  ${p.title}`);
