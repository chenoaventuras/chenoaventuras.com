/**
 * Elige la provincia (o isla) con menos posts para la tanda diaria de posts
 * automáticos (.github/workflows/posts-diarios.yml) y saca lo que ya hay allí.
 *
 * Necesita haber compilado antes (npm run build), que genera
 * assets/data/cobertura.json.
 *
 * Uso: node scripts/zona-del-dia.mjs            → la zona de hoy (JSON)
 *      node scripts/zona-del-dia.mjs --ranking  → todas, de menos a más posts
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Todas las zonas de España: provincia (o isla) → etiqueta de comunidad usada en los posts.
const ZONAS = {
  "Andalucía": ["Almería", "Cádiz", "Córdoba", "Granada", "Huelva", "Jaén", "Málaga", "Sevilla"],
  "Aragón": ["Huesca", "Teruel", "Zaragoza"],
  "Asturias": ["Asturias"],
  "Cantabria": ["Cantabria"],
  "Castilla y León": ["Ávila", "Burgos", "León", "Palencia", "Salamanca", "Segovia", "Soria", "Valladolid", "Zamora"],
  "Castilla-La Mancha": ["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"],
  "Cataluña": ["Barcelona", "Girona", "Lleida", "Tarragona"],
  "Ceuta": ["Ceuta"],
  "Comunidad de Madrid": ["Madrid"],
  "Comunidad Valenciana": ["Alicante", "Castellón", "Valencia"],
  "Extremadura": ["Badajoz", "Cáceres"],
  "Galicia": ["A Coruña", "Lugo", "Ourense", "Pontevedra"],
  "Islas Baleares": ["Mallorca", "Menorca", "Ibiza", "Formentera"],
  "Canarias": ["Lanzarote", "La Graciosa", "Fuerteventura", "Gran Canaria", "Tenerife", "La Gomera", "La Palma", "El Hierro"],
  "La Rioja": ["La Rioja"],
  "Melilla": ["Melilla"],
  "Navarra": ["Navarra"],
  "País Vasco": ["Álava", "Bizkaia", "Gipuzkoa"],
  "Región de Murcia": ["Murcia"],
};
// Zonas pequeñas: dejan de elegirse al llegar a este número de posts.
const TOPE = { Ceuta: 6, Melilla: 6, "La Graciosa": 5, "El Hierro": 8, "La Gomera": 8, Formentera: 6 };
// Provincia oficial de cada isla (para el campo "provincia" del post).
const PROV_ISLA = {
  Lanzarote: "Las Palmas", "La Graciosa": "Las Palmas", Fuerteventura: "Las Palmas", "Gran Canaria": "Las Palmas",
  Tenerife: "Santa Cruz de Tenerife", "La Gomera": "Santa Cruz de Tenerife", "La Palma": "Santa Cruz de Tenerife", "El Hierro": "Santa Cruz de Tenerife",
  Mallorca: "Islas Baleares", Menorca: "Islas Baleares", Ibiza: "Islas Baleares", Formentera: "Islas Baleares",
};

const cob = JSON.parse(readFileSync(join(ROOT, "assets", "data", "cobertura.json"), "utf8"));

const ranking = Object.entries(ZONAS)
  .flatMap(([comunidad, zs]) => zs.map((zona) => ({ zona, comunidad, n: (cob[zona]?.posts || []).length })))
  .filter((z) => !(TOPE[z.zona] && z.n >= TOPE[z.zona]))
  .sort((a, b) => a.n - b.n || a.zona.localeCompare(b.zona, "es"));

if (process.argv.includes("--ranking")) {
  for (const z of ranking) console.log(`${String(z.n).padStart(3)}  ${z.zona} (${z.comunidad})`);
  process.exit(0);
}

// Entre las que empatan con menos posts, rota según el día del año.
const min = ranking[0].n;
const empatadas = ranking.filter((z) => z.n === min);
const dia = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
const hoy = empatadas[dia % empatadas.length];

// Guía PDF: la más usada en esa zona; si no hay, la más usada en su comunidad.
const masUsada = (posts) => {
  const c = {};
  for (const p of posts) if (p.guia) c[p.guia] = (c[p.guia] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
};
const enZona = cob[hoy.zona]?.posts || [];
const enComunidad = Object.values(cob).filter((v) => v.comunidad === hoy.comunidad).flatMap((v) => v.posts);
const guia = masUsada(enZona) || masUsada(enComunidad);
const guiaTitulo = guia ? (readFileSync(join(ROOT, "content", "blog", `${(enZona.find((p) => p.guia === guia) || enComunidad.find((p) => p.guia === guia)).slug}.md`), "utf8").match(/^guiaTitulo:\s*(.+)$/m) || [])[1] || "" : "";

console.log(JSON.stringify({
  zona: hoy.zona,
  esIsla: !!PROV_ISLA[hoy.zona],
  provincia: PROV_ISLA[hoy.zona] || hoy.zona,
  comunidadTag: hoy.comunidad,
  postsYaPublicados: enZona,
  postsEnLaComunidad: enComunidad.length,
  guia,
  guiaTitulo: guiaTitulo.replace(/^['"]|['"]$/g, ""),
  siguientes: ranking.slice(0, 6).map((z) => `${z.zona} (${z.n})`),
}, null, 1));
