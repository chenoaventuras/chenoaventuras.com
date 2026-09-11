/**
 * Paso 1 del login del panel /admin (Decap CMS).
 * Redirige a GitHub para pedir autorización.
 *
 * Variables de entorno en Vercel:
 *   OAUTH_GITHUB_CLIENT_ID
 *   OAUTH_GITHUB_CLIENT_SECRET   (la usa /api/callback)
 */
export default function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.end("Falta OAUTH_GITHUB_CLIENT_ID");
    return;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `https://${host}/api/callback`;
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const url =
    "https://github.com/login/oauth/authorize?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo,user",
      state,
    }).toString();

  res.statusCode = 302;
  res.setHeader("Location", url);
  res.end();
}
