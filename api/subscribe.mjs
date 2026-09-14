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

    // Brevo devuelve 201 si el contacto es nuevo y 204 si ya existía (lo
    // actualiza). Solo avisamos a Cheno cuando es una suscripción nueva,
    // para no recibir un correo cada vez que alguien repite su email.
    const isNewContact = r.status === 201;
    if (isNewContact) {
      // aviso a Cheno; si falla, no rompe la suscripción (ya guardada arriba)
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            sender: { name: "Web Chenoaventuras", email: "chenoaventuras@gmail.com" },
            to: [{ email: "chenoaventuras@gmail.com", name: "Cheno" }],
            subject: "Nueva suscripción a la newsletter",
            htmlContent: `<p>Nuevo suscriptor: <strong>${email}</strong></p>`,
          }),
        });
      } catch (e) {}
    }

    res.statusCode = 200;
    res.json({ ok: true });
  } catch (e) {
    res.statusCode = 500;
    res.json({ error: "Fallo al guardar el contacto" });
  }
}
