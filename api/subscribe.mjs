/**
 * Formularios de newsletter (index.html y contacto.html).
 * Guarda el email como contacto en Brevo, en la lista "Newsletter Web".
 *
 * Variable de entorno en Vercel:
 *   BREVO_API_KEY
 */
const LIST_ID = 3; // "Newsletter Web" en Brevo

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

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.statusCode = 400;
    res.json({ error: "Email no válido" });
    return;
  }

  try {
    const r = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({ email, listIds: [LIST_ID], updateEnabled: true }),
    });
    if (!r.ok) {
      const err = await r.text();
      res.statusCode = 502;
      res.json({ error: "Brevo rechazó el contacto", detail: err });
      return;
    }
    res.statusCode = 200;
    res.json({ ok: true });
  } catch (e) {
    res.statusCode = 500;
    res.json({ error: "Fallo al guardar el contacto" });
  }
}
