/**
 * Ranking del minijuego de la 404.
 * GET  -> top 5 (puntuaciones más altas)
 * POST { name, score, t } -> valida y guarda una marca
 *
 * Escribe en Supabase con la clave `service_role` (SECRETA, solo en el
 * servidor). Configúrala en Vercel como variables de entorno:
 *   SUPABASE_URL                = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   = (clave service_role de Supabase)
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REST = SUPABASE_URL ? SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/scores" : null;

// Límite de peticiones por IP (en memoria; se reinicia con la función).
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 10; // máx. 10 envíos por minuto y por IP
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (!REST || !SERVICE_KEY) {
    return res.status(500).json({ error: "ranking sin configurar" });
  }
  const H = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY };

  try {
    if (req.method === "GET") {
      const r = await fetch(REST + "?select=name,score&order=score.desc&limit=5", { headers: H });
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === "POST") {
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
      if (tooMany(ip)) return res.status(429).json({ error: "demasiadas marcas seguidas" });

      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      let name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 14);
      if (!name) name = "Anónimo";

      const score = Math.floor(Number(body.score));
      const playedMs = Number(body.t);

      if (!Number.isFinite(score) || score < 0 || score > 100000) {
        return res.status(400).json({ error: "puntuación no válida" });
      }
      // Coherencia con el tiempo jugado: el juego da ~11 pts/s.
      // Margen x1.7 más un colchón, para no penalizar rachas buenas.
      if (Number.isFinite(playedMs) && playedMs > 0) {
        const max = (playedMs / 1000) * 19 + 25;
        if (score > max) {
          return res.status(400).json({ error: "puntuación imposible para el tiempo jugado" });
        }
      }

      const r = await fetch(REST, {
        method: "POST",
        headers: Object.assign({}, H, { "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ name, score }),
      });
      if (!r.ok) return res.status(502).json({ error: "no se pudo guardar" });
      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ error: "método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: "error interno" });
  }
};
