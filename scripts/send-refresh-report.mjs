/**
 * Manda por correo (Brevo) el informe de la revisión semanal de posts.
 * Lo ejecuta .github/workflows/blog-refresh.yml al final, pase lo que pase.
 *
 *   BREVO_API_KEY  misma clave que usan api/contact.mjs y api/subscribe.mjs
 *                  (si falta, imprime el HTML por pantalla: sirve para probar)
 *   JOB_STATUS     success | failure | cancelled
 *   RUN_URL        enlace a la ejecución en GitHub Actions
 */
import { readFileSync, existsSync } from "node:fs";
import { marked } from "marked";

const REPORT = ".refresh/informe.md";
const LINKS = ".refresh/enlaces.md";
const status = process.env.JOB_STATUS || "success";
const runUrl = process.env.RUN_URL || "";
const apiKey = process.env.BREVO_API_KEY;

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// El informe lo escribe una IA a partir de páginas web: el HTML en bruto se
// muestra como texto en vez de interpretarse.
marked.use({ renderer: { html: (token) => esc(token.text ?? token) } });

const hasReport = existsSync(REPORT);
const report = hasReport ? readFileSync(REPORT, "utf8") : "";
const links = existsSync(LINKS) ? readFileSync(LINKS, "utf8") : "";
const failed = status !== "success";

let subject;
let notice = "";
if (failed) {
  subject = "La revisión semanal del blog ha fallado";
  notice =
    `<p style="background:#fdecea;padding:12px 14px;border-radius:8px;">` +
    `<strong>La revisión no se completó y no se ha publicado ningún cambio.</strong>` +
    (runUrl ? ` Mira qué ha pasado en <a href="${esc(runUrl)}">la ejecución de GitHub Actions</a>.` : "") +
    (hasReport ? " Abajo queda el informe parcial." : "") +
    `</p>`;
} else {
  const date = (report.match(/\((\d{4}-\d{2}-\d{2})\)/) || [])[1] || new Date().toISOString().slice(0, 10);
  subject = `Revisión semanal del blog (${date})`;
}

const body = hasReport || links
  ? marked.parse([report, links].filter(Boolean).join("\n\n"))
  : failed
    ? ""
    : "<p>La revisión terminó pero no generó informe. Revisa la ejecución en GitHub Actions.</p>";

const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#222;line-height:1.5;">
${notice}
${body}
<p style="color:#888;font-size:12px;margin-top:24px;">Informe automático de chenoaventuras.com${runUrl ? ` · <a href="${esc(runUrl)}">ver ejecución</a>` : ""}</p>
</div>`;

if (!apiKey) {
  console.log(`Asunto: ${subject}\n\n${html}`);
  process.exit(0);
}

const r = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json", "api-key": apiKey },
  body: JSON.stringify({
    sender: { name: "Web Chenoaventuras", email: "chenoaventuras@gmail.com" },
    to: [{ email: "chenoaventuras@gmail.com", name: "Cheno" }],
    subject,
    htmlContent: html,
  }),
});
if (!r.ok) {
  console.error("Brevo rechazó el correo:", r.status, await r.text());
  process.exit(1);
}
console.log("Informe enviado:", subject);
