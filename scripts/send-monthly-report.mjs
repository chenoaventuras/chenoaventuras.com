/**
 * Informe mensual por correo con los datos de Vercel Web Analytics.
 * Se ejecuta el día 1 de cada mes (ver .github/workflows/monthly-report.yml)
 * y manda un resumen del mes anterior a chenoaventuras@gmail.com vía Brevo.
 *
 * Variables de entorno necesarias (GitHub Secrets, no Vercel):
 *   VERCEL_API_TOKEN  - token de acceso de Vercel (Settings → Tokens)
 *   VERCEL_PROJECT_ID - ID del proyecto en Vercel (Settings → General)
 *   VERCEL_TEAM_ID    - opcional, solo si el proyecto está bajo un team
 *   BREVO_API_KEY     - misma clave que ya usan api/contact.mjs y api/subscribe.mjs
 */
const TOKEN = process.env.VERCEL_API_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const TO_EMAIL = "chenoaventuras@gmail.com";

if (!TOKEN || !PROJECT_ID || !BREVO_API_KEY) {
  console.error("Faltan variables de entorno: VERCEL_API_TOKEN, VERCEL_PROJECT_ID o BREVO_API_KEY.");
  process.exit(1);
}

// Mes natural anterior (si hoy es 2026-10-01, el rango es todo septiembre 2026).
const now = new Date();
const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const since = new Date(Date.UTC(firstOfThisMonth.getUTCFullYear(), firstOfThisMonth.getUTCMonth() - 1, 1));
const until = firstOfThisMonth; // exclusivo: hasta el día 1 de este mes
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const mesLabel = `${MESES[since.getUTCMonth()]} de ${since.getUTCFullYear()}`;
const fmtDate = (d) => d.toISOString().slice(0, 10);

async function queryAnalytics(params) {
  const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
  url.searchParams.set("projectId", PROJECT_ID);
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);
  url.searchParams.set("since", fmtDate(since));
  url.searchParams.set("until", fmtDate(until));
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Vercel API ${r.status}: ${detail}`);
  }
  const json = await r.json();
  return json.data || [];
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function rowsTable(rows, keyLabel, keyField) {
  if (!rows.length) return "<p style='color:#666;'>Sin datos.</p>";
  const trs = rows.map((r) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(r[keyField] ?? "(desconocido)")}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${r.pageviews ?? 0}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${r.visitors ?? 0}</td>
    </tr>`).join("");
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="text-align:left;">
          <th style="padding:6px 10px;border-bottom:2px solid #274c78;">${keyLabel}</th>
          <th style="padding:6px 10px;border-bottom:2px solid #274c78;text-align:right;">Visitas</th>
          <th style="padding:6px 10px;border-bottom:2px solid #274c78;text-align:right;">Visitantes</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`;
}

async function main() {
  const [byDay, byRoute, byReferrer] = await Promise.all([
    queryAnalytics({ by: "day" }),
    queryAnalytics({ by: "route", limit: "8" }),
    queryAnalytics({ by: "referrerHostname", limit: "8" }),
  ]);

  const totalPageviews = byDay.reduce((sum, d) => sum + (d.pageviews || 0), 0);
  const totalVisitors = byDay.reduce((sum, d) => sum + (d.visitors || 0), 0);

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#14140f;">
      <h1 style="font-size:20px;color:#274c78;">Informe de chenoaventuras.com — ${mesLabel}</h1>
      <p style="font-size:15px;">Del ${fmtDate(since)} al ${fmtDate(new Date(until - 86400000))}:</p>
      <div style="display:flex;gap:16px;margin:18px 0;">
        <div style="flex:1;background:#f4f1ea;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#274c78;">${totalPageviews}</div>
          <div style="font-size:13px;color:#666;">Páginas vistas</div>
        </div>
        <div style="flex:1;background:#f4f1ea;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#274c78;">${totalVisitors}</div>
          <div style="font-size:13px;color:#666;">Visitantes únicos</div>
        </div>
      </div>
      <h2 style="font-size:16px;color:#274c78;margin-top:28px;">Páginas más vistas</h2>
      ${rowsTable(byRoute, "Página", "route")}
      <h2 style="font-size:16px;color:#274c78;margin-top:28px;">De dónde viene el tráfico</h2>
      ${rowsTable(byReferrer, "Origen", "referrerHostname")}
      <p style="font-size:12px;color:#999;margin-top:32px;">Generado automáticamente el ${fmtDate(now)} con los datos de Vercel Web Analytics.</p>
    </div>`;

  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "Web Chenoaventuras", email: "chenoaventuras@gmail.com" },
      to: [{ email: TO_EMAIL, name: "Cheno" }],
      subject: `Informe mensual de tu web — ${mesLabel}`,
      htmlContent: html,
    }),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Brevo ${r.status}: ${detail}`);
  }
  console.log(`Informe de ${mesLabel} enviado a ${TO_EMAIL}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
