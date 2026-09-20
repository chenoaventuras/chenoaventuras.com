/**
 * Paso 1 del login del panel /admin (Decap CMS).
 * Redirige a GitHub para pedir autorización.
 *
 * Variables de entorno en Vercel:
 *   OAUTH_GITHUB_CLIENT_ID
 *   OAUTH_GITHUB_CLIENT_SECRET   (la usa /api/callback)
 */
import { randomBytes } from "node:crypto";

export default function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.end("Falta OAUTH_GITHUB_CLIENT_ID");
    return;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `https://${host}/api/callback`;
  // state impredecible (no Math.random) guardado en cookie httpOnly, para que
  // /api/callback pueda comprobar que la vuelta de GitHub corresponde a este
  // mismo intento de login y no a uno iniciado por otra persona (CSRF de OAuth).
  const state = randomBytes(24).toString("hex");
  const url =
    "https://github.com/login/oauth/authorize?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo,user",
      state,
    }).toString();

  res.statusCode = 302;
  res.setHeader(
    "Set-Cookie",
    `cms_oauth_state=${state}; Max-Age=600; Path=/api; HttpOnly; Secure; SameSite=Lax`
  );
  res.setHeader("Location", url);
  res.end();
}
