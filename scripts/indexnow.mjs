// Avisa a Bing (y a los buscadores que usan IndexNow: Yandex, Seznam, Naver…;
// Bing alimenta también a DuckDuckGo, Yahoo, Ecosia y Copilot) de URLs nuevas o cambiadas.
// La clave es pública por diseño: el archivo /<clave>.txt de la raíz demuestra que la web es nuestra.
// Uso: node scripts/indexnow.mjs            → todas las URLs del sitemap.xml
//      node scripts/indexnow.mjs url1 url2 …  → solo esas
import { readFileSync, readdirSync } from "node:fs";
const HOST = "www.chenoaventuras.com";
const keyFile = readdirSync(".").find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.error("Falta el archivo de clave de IndexNow en la raíz"); process.exit(1); }
const key = readFileSync(keyFile, "utf8").trim();
let urls = process.argv.slice(2);
if (!urls.length) urls = [...readFileSync("sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
urls = urls.filter((u) => u.startsWith("https://" + HOST));
for (let i = 0; i < urls.length; i += 10000) {
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log("IndexNow:", r.status, urls.slice(i, i + 10000).length, "URLs");
}
