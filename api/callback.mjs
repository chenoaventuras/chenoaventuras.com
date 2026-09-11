/**
 * Paso 2 del login del panel /admin (Decap CMS).
 * GitHub vuelve aquí con ?code=... ; se canjea por un token y se
 * devuelve a la ventana del panel con el formato que espera Decap.
 */
export default async function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = new URL(req.url, `https://${host}`);
  const code = url.searchParams.get("code");

  let status = "error";
  let content = { error: "sin configurar" };

  try {
    if (clientId && clientSecret && code) {
      const r = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      });
      const data = await r.json();
      if (data.access_token) {
        status = "success";
        content = { token: data.access_token, provider: "github" };
      } else {
        content = { error: data.error_description || data.error || "sin token" };
      }
    }
  } catch (e) {
    content = { error: "fallo al canjear el código" };
  }

  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const messageLiteral = JSON.stringify(message);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Autenticando…</title></head>
<body>
<p>Autenticando… puedes cerrar esta ventana.</p>
<script>
(function () {
  var msg = ${messageLiteral};
  function send(origin) { if (window.opener) window.opener.postMessage(msg, origin || "*"); }
  window.addEventListener("message", function (e) { send(e.origin); }, false);
  send("*");
})();
</script>
</body></html>`);
}
