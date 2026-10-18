/**
 * Ranking del minijuego de la 404.
 * GET            -> top 5 (puntuaciones más altas)
 * GET  ?run=1    -> "ficha" firmada de inicio de partida (la web la pide al empezar)
 * POST { name, score, run } -> valida y guarda una marca
 *
 * El tiempo de partida lo mide el SERVIDOR (desde que se emitió la ficha), no
 * el navegador, así que no se puede fabricar una puntuación alta al instante.
 *
 * Escribe en Supabase con la clave `service_role` (SECRETA, solo en el
 * servidor). Configúrala en Vercel como variables de entorno:
 *   SUPABASE_URL                = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   = (clave service_role de Supabase)
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { originOk, rateLimiter } from "./_proteccion.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REST = SUPABASE_URL ? SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/scores" : null;

const MIN_AGE = 4000; // una partida dura al menos 4 s
const MAX_AGE = 30 * 60 * 1000; // y la ficha caduca a los 30 min
const SCORE_MAX = 30000;
const PTS_PER_SEC = 19; // el juego da ~11 pts/s; margen x1.7 para rachas buenas

const tooMany = rateLimiter(5, 30);
const used = new Map(); // fichas ya canjeadas (en memoria): una puntuación por partida

const sign = (ts) => createHmac("sha256", "scores:" + SERVICE_KEY).update(String(ts)).digest("base64url");

function readRun(token) {
  if (typeof token !== "string") return null;
  const [t, sig] = token.split(".");
  const ts = Number(t);
  if (!Number.isFinite(ts) || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(ts));
  return a.length === b.length && timingSafeEqual(a, b) ? ts : null;
}

// Nombre visible: sin caracteres de control, sin enlaces y sin hacerse pasar por la marca.
function cleanName(raw) {
  const n = String(raw || "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14);
  const flat = n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  if (!n || flat.includes("chenoaventuras") || /https?|www\.|\.com|\.es\b|@/i.test(n)) return "Anónimo";
  return n;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const send = (code, obj) => { res.statusCode = code; res.json(obj); };

  if (!REST || !SERVICE_KEY) return send(500, { error: "ranking sin configurar" });
  const H = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY };

  try {
    if (req.method === "GET") {
      const q = new URL(req.url, "https://x").searchParams;
      if (q.get("run")) {
        const ts = Date.now();
        return send(200, { run: ts + "." + sign(ts) });
      }
      const r = await fetch(REST + "?select=name,score&order=score.desc&limit=5", { headers: H });
      const data = await r.json();
      return send(200, Array.isArray(data) ? data : []);
    }

    if (req.method === "POST") {
      if (!originOk(req)) return send(403, { error: "envío no permitido" });
      if (tooMany(req)) return send(429, { error: "demasiadas marcas seguidas" });

      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      body = body || {};

      const ts = readRun(body.run);
      if (ts === null) return send(400, { error: "partida no válida" });
      const now = Date.now();
      const age = now - ts;
      if (age < MIN_AGE || age > MAX_AGE) return send(400, { error: "partida no válida" });
      for (const [k, exp] of used) if (exp < now) used.delete(k);
      if (used.has(ts)) return send(400, { error: "esa partida ya se guardó" });

      const score = Math.floor(Number(body.score));
      if (!Number.isFinite(score) || score < 0 || score > SCORE_MAX) return send(400, { error: "puntuación no válida" });
      if (score > (age / 1000) * PTS_PER_SEC + 25) return send(400, { error: "puntuación imposible para el tiempo jugado" });

      const r = await fetch(REST, {
        method: "POST",
        headers: Object.assign({}, H, { "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ name: cleanName(body.name), score }),
      });
      if (!r.ok) return send(502, { error: "no se pudo guardar" });
      used.set(ts, now + MAX_AGE);
      return send(201, { ok: true });
    }

    return send(405, { error: "método no permitido" });
  } catch (e) {
    return send(500, { error: "error interno" });
  }
}
