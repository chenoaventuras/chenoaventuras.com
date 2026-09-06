/**
 * Refresca el token de larga duración de Instagram (~60 días) y lo vuelve a
 * guardar en el secret IG_ACCESS_TOKEN del repositorio, para que no caduque nunca
 * mientras el workflow siga ejecutándose a diario.
 *
 * Lo llama .github/workflows/instagram.yml cada día, ANTES de descargar los posts.
 *
 * Variables de entorno:
 *   IG_ACCESS_TOKEN    - token actual (secret del repo)
 *   GH_PAT             - token fino de GitHub con permiso "Secrets: write" SOLO en este repo
 *   GITHUB_REPOSITORY  - lo define GitHub Actions automáticamente (owner/repo)
 *
 * Si falta GH_PAT o IG_ACCESS_TOKEN, no hace nada (exit 0): el resto del sistema
 * sigue funcionando, solo que habrá que renovar el token a mano cada 60 días.
 */
import { execFileSync } from "node:child_process";

const TOKEN = process.env.IG_ACCESS_TOKEN;
const GH_PAT = process.env.GH_PAT;
const REPO = process.env.GITHUB_REPOSITORY;

if (!TOKEN) {
  console.log("Sin IG_ACCESS_TOKEN — nada que refrescar.");
  process.exit(0);
}
if (!GH_PAT || !REPO) {
  console.log("Sin GH_PAT — no se auto-refresca el token (es opcional).");
  process.exit(0);
}

const url =
  "https://graph.instagram.com/refresh_access_token" +
  "?grant_type=ig_refresh_token&access_token=" +
  encodeURIComponent(TOKEN);

const res = await fetch(url);
const data = await res.json().catch(() => ({}));

if (!res.ok || !data.access_token) {
  // Lo más habitual: el token tiene menos de 24 h y todavía no se puede refrescar.
  // No es un fallo grave; se reintentará mañana.
  console.warn("No se pudo refrescar el token:", res.status, JSON.stringify(data));
  process.exit(0);
}

if (data.access_token === TOKEN) {
  console.log("El token no ha cambiado; no se actualiza el secret.");
  process.exit(0);
}

execFileSync("gh", ["secret", "set", "IG_ACCESS_TOKEN", "--repo", REPO], {
  input: data.access_token,
  stdio: ["pipe", "inherit", "inherit"],
  env: { ...process.env, GH_TOKEN: GH_PAT },
});

const days = data.expires_in ? Math.round(data.expires_in / 86400) : "?";
console.log(`Token de Instagram refrescado y guardado. Caduca en ~${days} días.`);
