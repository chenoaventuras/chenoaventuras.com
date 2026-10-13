/**
 * Protecciones comunes de los formularios (/api/subscribe y /api/contact).
 * El "_" del nombre hace que Vercel no lo publique como ruta.
 */

// Solo se aceptan envíos hechos desde la propia web (o desde localhost al probar).
const ORIGINS = new Set([
  "https://www.chenoaventuras.com",
  "https://chenoaventuras.com",
]);

export function originOk(req) {
  const o = req.headers.origin || "";
  if (!o) return false;
  if (ORIGINS.has(o)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
}

// Señales de bot: el campo trampa "cheno_hp" (invisible para personas) relleno,
// o un envío hecho en menos de 2 s desde que se abrió la página.
export function looksLikeBot(body) {
  if (body && typeof body.cheno_hp === "string" && body.cheno_hp.trim() !== "") return true;
  const t = Number(body && body.t);
  if (!Number.isFinite(t) || t < 2000) return true;
  return false;
}

// Límite de envíos por IP (en memoria; se reinicia con la función).
export function rateLimiter(perMinute, perHour) {
  const hits = new Map();
  return function tooMany(req) {
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
    const now = Date.now();
    const arr = (hits.get(ip) || []).filter((x) => now - x < 3600000);
    arr.push(now);
    hits.set(ip, arr);
    if (hits.size > 5000) hits.clear();
    const lastMinute = arr.filter((x) => now - x < 60000).length;
    return lastMinute > perMinute || arr.length > perHour;
  };
}

export function validEmail(email) {
  return typeof email === "string" && email.length <= 200 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email);
}
