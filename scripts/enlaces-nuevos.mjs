/**
 * Detecta enlaces a dominios NUEVOS que la IA haya añadido a los posts en esta
 * ejecución (cambios sin commitear en content/) y escribe
 * .refresh/enlaces-nuevos.md para el correo de los lunes.
 *
 * Es un control de seguridad: si alguna web manipulara a la IA para colar un
 * enlace malicioso en un post, aquí sale a la vista. Siempre sale con código 0.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const git = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch {
    return "";
  }
};
const URL_RE = /https?:\/\/[^\s)"'<>\]]+/g;
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

// Dominios que ya aparecían en los posts antes de este cambio.
const known = new Set();
for (const u of git("grep", "-h", "-o", "-E", "https?://[^] )\"'<>]+", "HEAD", "--", "content").match(URL_RE) || []) {
  const h = hostOf(u);
  if (h) known.add(h);
}

// Líneas añadidas: cambios en archivos que ya existían + archivos nuevos.
const added = [];
let current = "";
for (const line of git("diff", "HEAD", "-U0", "--", "content").split("\n")) {
  if (line.startsWith("+++ b/")) current = line.slice(6);
  else if (line.startsWith("+") && !line.startsWith("+++")) added.push([current, line.slice(1)]);
}
for (const f of git("ls-files", "--others", "--exclude-standard", "--", "content").split("\n").filter(Boolean)) {
  if (!/\.(md|json)$/.test(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) added.push([f, line]);
}

const fresh = new Map(); // host -> Map(url -> Set(archivos))
let totalNew = 0;
for (const [file, line] of added) {
  for (const raw of line.match(URL_RE) || []) {
    const url = raw.replace(/[.,;:]+$/, "");
    const h = hostOf(url);
    if (!h || known.has(h) || /(^|\.)chenoaventuras\.com$/.test(h)) continue;
    if (!fresh.has(h)) fresh.set(h, new Map());
    const m = fresh.get(h);
    if (!m.has(url)) { m.set(url, new Set()); totalNew++; }
    m.get(url).add(file.replace(/^content\/blog\//, ""));
  }
}

const out = ["## Enlaces nuevos añadidos por la IA", ""];
if (!fresh.size) {
  out.push("La IA no ha añadido enlaces a dominios nuevos esta semana.", "");
} else {
  out.push(`La IA ha añadido ${totalNew} enlace(s) a ${fresh.size} dominio(s) que no aparecían antes en el blog. **Revisa que sean legítimos** (webs oficiales de los lugares); si alguno no lo es, quítalo cuanto antes.`, "");
  for (const [h, urls] of [...fresh].sort()) {
    out.push(`- **${h}**`);
    for (const [u, files] of urls) out.push(`  - ${u} (en ${[...files].join(", ")})`);
  }
  out.push("");
}
mkdirSync(".refresh", { recursive: true });
writeFileSync(".refresh/enlaces-nuevos.md", out.join("\n"));
console.log(out.join("\n"));
