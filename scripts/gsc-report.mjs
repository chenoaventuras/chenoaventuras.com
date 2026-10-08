/**
 * Saca de Google Search Console lo que la gente busca de verdad para llegar a
 * cada post y cómo está su indexación. Lo usa la revisión semanal
 * (.github/workflows/blog-refresh.yml) antes de que Claude revise los posts.
 *
 *   GSC_SERVICE_ACCOUNT_KEY  JSON de la cuenta de servicio (secreto de GitHub).
 *                            En local, si falta, se lee
 *                            ~/.config/chenoaventuras/gsc-key.json
 *   --inspect                además, inspecciona la indexación de cada URL
 *                            del sitemap (tarda ~3 s por URL)
 *
 * Escribe:
 *   .refresh/gsc.json  { "<slug>": { clicks, impressions, ctr, position, queries: [...] } }
 *   .refresh/gsc.md    resumen en Markdown que se añade al correo del informe
 *
 * Si no hay clave o la API falla, avisa y sale con 0: la revisión sigue sin
 * datos de Search Console, como antes.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createSign } from "node:crypto";
import { homedir } from "node:os";

const SITE = "sc-domain:chenoaventuras.com";
const ORIGIN = "https://www.chenoaventuras.com";
const DAYS = 28;
const OUT_DIR = ".refresh";
const inspect = process.argv.includes("--inspect");

function loadKey() {
  if (process.env.GSC_SERVICE_ACCOUNT_KEY) return JSON.parse(process.env.GSC_SERVICE_ACCOUNT_KEY);
  const local = `${homedir()}/.config/chenoaventuras/gsc-key.json`;
  if (existsSync(local)) return JSON.parse(readFileSync(local, "utf8"));
  return null;
}

async function getToken(key) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters",
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`token: ${JSON.stringify(data)}`);
  return data.access_token;
}

const day = (d) => d.toISOString().slice(0, 10);
const pct = (x) => `${(x * 100).toFixed(1)} %`;
const slugOf = (url) => {
  const m = url.match(/\/blog\/([^/?#]+?)(?:\.html)?(?:[?#].*)?$/);
  return m ? m[1] : null;
};

async function main() {
  const key = loadKey();
  if (!key) {
    console.log("Sin clave de Search Console: se sigue sin esos datos.");
    return;
  }
  const token = await getToken(key);
  const api = async (url, body) => {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status} ${url}: ${await res.text()}`);
    return res.json();
  };

  // Search Console tarda ~2-3 días en tener los datos completos.
  const end = new Date(Date.now() - 2 * 864e5);
  const start = new Date(end.getTime() - DAYS * 864e5);
  const { rows = [] } = await api(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    { startDate: day(start), endDate: day(end), dimensions: ["page", "query"], rowLimit: 25000 },
  );

  const posts = {};
  for (const r of rows) {
    const [page, query] = r.keys;
    const slug = slugOf(page);
    if (!slug) continue;
    const p = (posts[slug] ??= { clicks: 0, impressions: 0, posSum: 0, queries: [] });
    p.clicks += r.clicks;
    p.impressions += r.impressions;
    p.posSum += r.position * r.impressions;
    p.queries.push({ query, clicks: r.clicks, impressions: r.impressions, position: +r.position.toFixed(1) });
  }
  for (const p of Object.values(posts)) {
    p.ctr = p.impressions ? +(p.clicks / p.impressions).toFixed(3) : 0;
    p.position = p.impressions ? +(p.posSum / p.impressions).toFixed(1) : null;
    delete p.posSum;
    p.queries.sort((a, b) => b.impressions - a.impressions);
    p.queries = p.queries.slice(0, 25);
  }

  let index = null;
  if (inspect) {
    const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    index = {};
    for (const url of urls) {
      try {
        const r = await api("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
          inspectionUrl: url,
          siteUrl: SITE,
          languageCode: "es",
        });
        index[url] = r.inspectionResult?.indexStatusResult?.coverageState || "Desconocido";
      } catch (e) {
        index[url] = `Error: ${e.message.slice(0, 80)}`;
      }
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/gsc.json`, JSON.stringify({ desde: day(start), hasta: day(end), posts, index }, null, 1));

  // Resumen para el correo
  const list = Object.entries(posts).sort((a, b) => b[1].impressions - a[1].impressions);
  const md = [`## Search Console (${day(start)} a ${day(end)})`];
  if (!list.length) {
    md.push("Todavía no hay búsquedas registradas para los posts del blog.");
  } else {
    md.push("| Post | Impresiones | Clics | CTR | Posición |", "|---|---|---|---|---|");
    for (const [slug, p] of list.slice(0, 15)) {
      md.push(`| ${slug} | ${p.impressions} | ${p.clicks} | ${pct(p.ctr)} | ${p.position} |`);
    }
    const chances = list.filter(([, p]) => p.impressions >= 20 && p.ctr < 0.02 && p.position <= 20);
    if (chances.length) {
      md.push("", "**Oportunidades** (salen en Google pero casi nadie entra):");
      for (const [slug, p] of chances) {
        md.push(`- ${slug}: ${p.impressions} impresiones en posición ${p.position}. Búsquedas: ${p.queries.slice(0, 4).map((q) => `«${q.query}»`).join(", ")}`);
      }
    }
  }
  if (index) {
    const groups = {};
    for (const [url, state] of Object.entries(index)) (groups[state] ??= []).push(url);
    md.push("", "### Indexación");
    for (const [state, urls] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
      md.push(`- **${state}**: ${urls.length}`);
    }
    const pending = Object.entries(index).filter(([, s]) => !/indexada/i.test(s)).map(([u]) => u);
    if (pending.length) {
      md.push("", `Pide la indexación a mano (máx. ~10 al día) en Search Console → Inspeccionar URL. Primeras de la lista:`);
      for (const u of pending.slice(0, 10)) md.push(`- ${u}`);
    }
  }
  writeFileSync(`${OUT_DIR}/gsc.md`, md.join("\n") + "\n");
  console.log(`Search Console: ${list.length} posts con datos${index ? `, ${Object.keys(index).length} URLs inspeccionadas` : ""}.`);
}

main().catch((e) => {
  console.log(`Search Console no disponible (${e.message}). Se sigue sin esos datos.`);
});
