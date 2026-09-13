/**
 * Formulario de contacto (contacto.html).
 * Manda un email a Cheno con lo que ha escrito la persona, usando Brevo.
 *
 * Variable de entorno en Vercel:
 *   BREVO_API_KEY
 */
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

  const { nombre, email, tipo, mensaje } = req.body || {};
  if (!nombre || !email || !mensaje) {
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
        sender: { name: "Web Chenoaventuras", email: "chenoaventuras@gmail.com" },
        to: [{ email: "chenoaventuras@gmail.com", name: "Cheno" }],
        replyTo: { email, name: nombre },
        subject: `Nuevo mensaje desde la web · ${tipo || "Sin tipo"}`,
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
      const err = await r.text();
      res.statusCode = 502;
      res.json({ error: "Brevo rechazó el envío", detail: err });
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
