/**
 * Formulario de contacto (contacto.html).
 * Manda un email a Cheno con lo que ha escrito la persona, usando Brevo.
 *
 * Variable de entorno en Vercel:
 *   BREVO_API_KEY
 */
import { originOk, looksLikeBot, rateLimiter, validEmail } from "./_proteccion.mjs";

// Máx. 2 mensajes por minuto y 6 por hora desde la misma IP.
const tooMany = rateLimiter(2, 6);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.json({ error: "Falta BREVO_API_KEY" });
    return;
  }

  if (!originOk(req)) {
    res.statusCode = 403;
    res.json({ error: "Envío no permitido" });
    return;
  }
  if (tooMany(req)) {
    res.statusCode = 429;
    res.json({ error: "Demasiados mensajes seguidos, espera un poco." });
    return;
  }

  const body = req.body || {};
  // A los bots se les responde "ok" para que no insistan, pero no se envía nada.
  if (looksLikeBot(body)) {
    res.statusCode = 200;
    res.json({ ok: true });
    return;
  }
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const nombre = str(body.nombre, 100);
  const email = str(body.email, 200);
  const tipo = str(body.tipo, 200);
  const mensaje = str(body.mensaje, 5000);
  if (!nombre || !mensaje || !validEmail(email)) {
    res.statusCode = 400;
    res.json({ error: "Faltan campos obligatorios" });
    return;
  }

  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: "Web Chenoaventuras", email: process.env.BREVO_SENDER_EMAIL || "hola@chenoaventuras.com" },
        to: [{ email: "chenoaventuras@gmail.com", name: "Cheno" }],
        replyTo: { email, name: nombre },
        subject: `Nuevo mensaje desde la web · ${(tipo || "Sin tipo").replace(/[\r\n]+/g, " ")}`,
        htmlContent: `
          <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Tipo de proyecto:</strong> ${escapeHtml(tipo || "-")}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${escapeHtml(mensaje).replace(/\n/g, "<br>")}</p>
        `,
      }),
    });
    if (!r.ok) {
      res.statusCode = 502;
      res.json({ error: "No se pudo enviar el mensaje" });
      return;
    }
    res.statusCode = 200;
    res.json({ ok: true });
  } catch (e) {
    res.statusCode = 500;
    res.json({ error: "Fallo al enviar el email" });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
