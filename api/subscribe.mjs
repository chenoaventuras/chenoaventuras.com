/**
 * Formularios de newsletter (index.html y contacto.html).
 * Guarda el email como contacto en Brevo, en la lista "Newsletter Web".
 *
 * Variable de entorno en Vercel:
 *   BREVO_API_KEY
 */
const LIST_ID = 3; // "Newsletter Web" en Brevo
const SITE = "https://www.chenoaventuras.com";
// Remitente de los correos a suscriptores. Para que no caigan en spam hay que
// autenticar el dominio en Brevo y poner aquí un correo suyo (p. ej.
// hola@chenoaventuras.com) en la variable de entorno BREVO_SENDER_EMAIL.
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "chenoaventuras@gmail.com";
const OWNER_EMAIL = "chenoaventuras@gmail.com";

// Guías en PDF: valor de "source" del formulario -> título y archivo.
// "extra" (opcional): más PDFs que se envían en el mismo correo.
const GUIDES = {
  "guia-monte-igueldo": { title: "Guía del Monte Igueldo", file: "/assets/guias/guia-monte-igueldo-chenoaventuras.pdf" },
  "guia-cuenca": { title: "Guía de Cuenca", file: "/assets/guias/guia-cuenca-chenoaventuras.pdf" },
  "ciudad-encantada-cuenca": { title: "Guía de Cuenca", file: "/assets/guias/guia-cuenca-chenoaventuras.pdf" },
  "laguna-de-una-cuenca": { title: "Guía de Cuenca", file: "/assets/guias/guia-cuenca-chenoaventuras.pdf" },
  "nacimiento-rio-cuervo": { title: "Guía de Cuenca", file: "/assets/guias/guia-cuenca-chenoaventuras.pdf" },
  "mirador-ventano-del-diablo": { title: "Guía de Cuenca", file: "/assets/guias/guia-cuenca-chenoaventuras.pdf" },
  "pirineo-aragones-que-ver": { title: "Guía del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-chenoaventuras.pdf", extra: [{ title: "Guía ilustrada del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-ilustrada-chenoaventuras.pdf" }] },
  "ruta-cola-de-caballo-ordesa": { title: "Guía del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-chenoaventuras.pdf", extra: [{ title: "Guía ilustrada del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-ilustrada-chenoaventuras.pdf" }] },
  "senda-de-los-cazadores-ordesa": { title: "Guía del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-chenoaventuras.pdf", extra: [{ title: "Guía ilustrada del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-ilustrada-chenoaventuras.pdf" }] },
  "ibon-de-anayet": { title: "Guía del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-chenoaventuras.pdf", extra: [{ title: "Guía ilustrada del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-ilustrada-chenoaventuras.pdf" }] },
  "cascada-del-sorrosal-broto": { title: "Guía del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-chenoaventuras.pdf", extra: [{ title: "Guía ilustrada del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-ilustrada-chenoaventuras.pdf" }] },
  "ainsa-que-ver": { title: "Guía del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-chenoaventuras.pdf", extra: [{ title: "Guía ilustrada del Pirineo Aragonés", file: "/assets/guias/guia-pirineo-aragones-ilustrada-chenoaventuras.pdf" }] },
};

// Límite por IP (en memoria): evita usar el formulario para mandar correos a terceros.
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 5; // máx. 5 intentos por minuto y por IP
}

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

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  if (tooMany(ip)) {
    res.statusCode = 429;
    res.json({ error: "Demasiados intentos seguidos, espera un minuto." });
    return;
  }

  const { email, source } = req.body || {};
  // Origen opcional (p. ej. la guía descargada); solo letras, números y guiones.
  const src = typeof source === "string" && /^[a-z0-9-]{1,60}$/.test(source) ? source : "";
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

    // Si pidió una guía, se le manda por correo el enlace de descarga (si el
    // envío falla, no rompe la suscripción: la web también le muestra el botón).
    const guide = GUIDES[src];
    if (guide) {
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", "api-key": apiKey },
          body: JSON.stringify({
            sender: { name: "Chenoaventuras", email: SENDER_EMAIL },
            replyTo: { name: "Cheno", email: OWNER_EMAIL },
            to: [{ email }],
            subject: `Tu guía: ${guide.title}`,
            htmlContent:
              `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#222;line-height:1.55;">` +
              `<p>¡Hola! Gracias por apuntarte a Chenoaventuras.</p>` +
              `<p>Aquí tienes tu guía:</p>` +
              `<p><a href="${SITE}${guide.file}" style="display:inline-block;background:#274c78;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Descargar ${guide.title} (PDF)</a></p>` +
              (guide.extra || []).map((x) => `<p><a href="${SITE}${x.file}" style="display:inline-block;background:#eab308;color:#1f3e64;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Descargar ${x.title} (PDF)</a></p>`).join("") +
              `<p>A partir de ahora recibirás mis rutas, lugares de interés y curiosidades de viaje. Puedes darte de baja cuando quieras.</p>` +
              `<p>Un abrazo,<br>Cheno · Chenoaventuras</p>` +
              `<p style="color:#888;font-size:12px;">Si no has pedido esta guía, ignora este mensaje.</p>` +
              `</div>`,
          }),
        });
      } catch (e) {}
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
            sender: { name: "Web Chenoaventuras", email: SENDER_EMAIL },
            to: [{ email: OWNER_EMAIL, name: "Cheno" }],
            subject: "Nueva suscripción a la newsletter",
            htmlContent: `<p>Nuevo suscriptor: <strong>${escapeHtml(email)}</strong>${src ? ` (guía: ${escapeHtml(src)})` : ""}</p>`,
          }),
        });
      } catch (e) {}
    }

    res.statusCode = 200;
    // La ruta del PDF solo se entrega tras apuntarse (no aparece en el HTML de la página).
    res.json({ ok: true, ...(guide ? { guide: guide.file } : {}) });
  } catch (e) {
    res.statusCode = 500;
    res.json({ error: "Fallo al guardar el contacto" });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
