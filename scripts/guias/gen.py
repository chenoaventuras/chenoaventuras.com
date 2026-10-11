"""Guías PDF por zonas, montadas con los posts publicados (fichas = excerpt,
portada y coordenadas de cada post; actividades = su campo `actividades`).

  python3 scripts/guias/gen.py               regenera todas
  python3 scripts/guias/gen.py tenerife ...  regenera esas
  python3 scripts/guias/gen.py --changed     solo las que han cambiado (fotos, textos, zonas.py…)
  --drive                                    copia además los PDF a Google Drive (Guías Chenoaventuras)

Salen en assets/guias/guia-<zona>-chenoaventuras.pdf. manifest.json guarda una
huella de todo lo que entra en cada guía para saber cuándo hay que rehacerla.
Necesita Google Chrome (macOS) y `sips`. Los textos de cada zona: zonas.py.
"""
import hashlib, html, json, pathlib, re, shutil, subprocess, sys, tempfile
from urllib.parse import quote

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = ROOT / "assets" / "guias"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DRIVE = pathlib.Path.home() / "Library/CloudStorage/GoogleDrive-chenoaventuras@gmail.com/Mi unidad/web cheno/Guías Chenoaventuras"
MANIFEST = HERE / "manifest.json"
sys.path.insert(0, str(HERE))
from zonas import ZONAS  # noqa: E402

e = html.escape
TYPES = {"Pueblos": "Pueblo", "Spots": "Spot", "Rutas": "Ruta", "Actividades": "Actividad", "Curiosidades": "Curiosidad", "Playas": "Playa", "Cuevas": "Cueva"}
PIN = '<svg class="ico" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>'


def load_posts():
    js = r"""const fs=require("fs"),m=require("gray-matter"),d0=process.argv[1];const o={};
for(const f of fs.readdirSync(d0)){if(!f.endsWith(".md"))continue;const d=m(fs.readFileSync(d0+"/"+f,"utf8")).data;if(d.draft)continue;
o[f.slice(0,-3)]={title:d.title,lugar:d.lugar||"",excerpt:d.excerpt||"",cover:d.cover||"",lat:d.lat,lng:d.lng,tags:d.tags||[],act:d.actividades||[]};}
process.stdout.write(JSON.stringify(o));"""
    r = subprocess.run(["node", "-e", js, str(ROOT / "content" / "blog")], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def img_file(path):
    """Archivo real de una imagen del post (el CI cambia .jpg/.png por .webp)."""
    src = ROOT / path.lstrip("/")
    for c in [src] + [src.with_suffix(x) for x in (".webp", ".jpg", ".jpeg", ".png")]:
        if c.exists():
            return c
    return None


def md(t):
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", e(t))


def short(t, n=150):
    t = re.sub(r"\s+", " ", t).strip()
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def aff(u):
    base = u.split("?")[0]
    if "civitatis.com" in base:
        return base + "?aid=110968", "Civitatis"
    if "getyourguide" in base:
        return base + "?partner_id=PEUGCO9&utm_medium=online_publisher", "GetYourGuide"
    return u, ""


def hub_cards(slug):
    """Fichas (gcard) de un post-guía de isla/zona: [(img, nombre, texto, slug_enlazado)]."""
    f = ROOT / "content" / "blog" / f"{slug}.md"
    if not f.exists():
        return []
    out = []
    for m in re.finditer(r'<li class="gcard[^"]*"><div class="gcard__media"><img src="([^"]+)"[^>]*/>.*?<h3>(.*?)</h3><p>(.*?)</p></div></li>', f.read_text(), re.S):
        img, name, txt = m.groups()
        link = re.search(r'href="/blog/([a-z0-9-]+)\.html"', txt)
        txt = re.sub(r"\s*<a [^>]*>.*?</a>\.?", "", txt)
        out.append((img, re.sub(r"<[^>]+>", "", name), re.sub(r"<[^>]+>", "", txt).strip(), link.group(1) if link else slug))
    return out


def places_of(z, posts):
    """Todos los posts que entran en la guía (en zonas por secciones: el post de cada isla, sus enlazados y los extra)."""
    if "secciones" not in z:
        return [s for s in z["lugares"] if s in posts]
    seen = []
    for sec in z["secciones"]:
        for s in [sec["hub"]] + [c[3] for c in hub_cards(sec["hub"])] + sec.get("extra", []):
            if s in posts and s not in seen:
                seen.append(s)
    return seen


def fingerprint(key, posts):
    """Huella de todo lo que entra en la guía: textos de la zona, datos y fotos de sus posts, plantilla."""
    z = ZONAS[key]
    h = hashlib.sha256()
    h.update(json.dumps(z, sort_keys=True, ensure_ascii=False).encode())
    h.update((HERE / "guia.css").read_bytes())
    h.update(pathlib.Path(__file__).read_bytes())
    for sec in z.get("secciones", []):
        f = ROOT / "content" / "blog" / f"{sec['hub']}.md"
        if f.exists():
            h.update(f.read_bytes())
    for s in places_of(z, posts) + [z["portada"]]:
        p = posts.get(s)
        if not p:
            continue
        h.update(json.dumps(p, sort_keys=True, ensure_ascii=False).encode())
        f = img_file(p["cover"])
        if f:
            h.update(f.read_bytes())
    return h.hexdigest()


def build(key, posts, tmp):
    z = ZONAS[key]

    def jpg(path, width=460):
        src = img_file(path)
        if not src:
            return path
        out = tmp / (re.sub(r"[^\w-]", "_", path.strip("/")) + f"_{width}.jpg")
        if not out.exists():
            subprocess.run(["sips", "-Z", str(width), "-s", "format", "jpeg", "-s", "formatOptions", "62", str(src), "--out", str(out)], capture_output=True)
        return out.as_uri()

    def card(i, slug):
        p = posts[slug]
        name = p["lugar"] or p["title"].split(":")[0]
        kind = next((TYPES[t] for t in p["tags"] if t in TYPES), "Lugar")
        q = f"{p['lat']},{p['lng']}" if p.get("lat") else quote(name)
        return (f'<li class="gcard"><div class="gcard__media"><img src="{jpg(p["cover"])}" alt="{e(name)}" /><span class="gcard__n">{i:02d}</span></div>'
                f'<div class="gcard__body"><h3>{e(name)}</h3><p class="gcard__meta"><span class="gcard__price">{kind}</span></p><p>{e(short(p["excerpt"]))}</p>'
                f'<p class="gcard__links"><a class="gbtn gbtn--reel" href="https://www.chenoaventuras.com/blog/{slug}.html">Leer más</a>'
                f'<a class="gbtn" href="https://www.google.com/maps/search/?api=1&query={q}">{PIN} Cómo llegar</a></p></div></li>')

    def hcard(i, img, name, txt, link, where):
        q = quote(f"{name}, {where}")
        return (f'<li class="gcard"><div class="gcard__media"><img src="{jpg(img)}" alt="{e(name)}" /><span class="gcard__n">{i:02d}</span></div>'
                f'<div class="gcard__body"><h3>{e(name)}</h3><p>{e(short(txt))}</p>'
                f'<p class="gcard__links"><a class="gbtn gbtn--reel" href="https://www.chenoaventuras.com/blog/{link}.html">Leer más</a>'
                f'<a class="gbtn" href="https://www.google.com/maps/search/?api=1&query={q}">{PIN} Cómo llegar</a></p></div></li>')

    places = places_of(z, posts)
    if "secciones" in z:
        blocks = []
        for sec in z["secciones"]:
            hc = hub_cards(sec["hub"])
            linked = {c[3] for c in hc}
            items = [hcard(i + 1, *c, sec["t"]) for i, c in enumerate(hc)]
            for s in sec.get("extra", []):
                if s in posts and s not in linked:
                    items.append(card(len(items) + 1, s))
            blocks.append(f'<div class="isla"><div class="guide__head"><span class="eyebrow">{e(sec.get("eyebrow", "Isla"))}</span><h2>{e(sec["t"])}</h2>'
                          f'<p>{md(sec.get("txt", ""))}</p></div><ol class="guide__grid">{"".join(items)}</ol></div>')
        cards_html = "".join(blocks)
    else:
        cards_html = '<div class="guide__head"><span class="eyebrow">Qué ver</span><h2>' + e(z.get("titulo_lugares", "Los imprescindibles")) + '</h2></div><ol class="guide__grid">' + "".join(card(i + 1, s) for i, s in enumerate(places)) + "</ol>"
    tips = "".join(f'<div class="guide__tip"><h3>{t}</h3><p>{md(d)}</p></div>' for t, d in z["tips"])
    # actividades por turnos: la mejor de cada lugar, luego las segundas… (máx. 6)
    acts, seen = [], set()
    for rnd in range(3):
        for s in places:
            if rnd < len(posts[s]["act"]):
                a = posts[s]["act"][rnd]
                href, plat = aff(a["u"])
                if plat and href.split("?")[0] not in seen:
                    seen.add(href.split("?")[0])
                    acts.append((a["t"], href, plat))
    acts = acts[:6]
    act_html = ""
    if acts:
        items = "".join(f'<li><a href="{e(h)}"><span class="pl pl--{"gyg" if p == "GetYourGuide" else "civ"}">{p}</span><span>{e(t)}</span><b>Ver →</b></a></li>' for t, h, p in acts)
        code = '<p class="acts__code">🎟️ En GetYourGuide usa el código <strong>CHENOAVENTURAS5</strong> y llévate un 5% de descuento.</p>' if any(p == "GetYourGuide" for *_, p in acts) else ""
        act_html = f'<div class="acts"><div class="guide__head"><span class="eyebrow">Planes para reservar</span><h2>Actividades recomendadas</h2></div><ul class="acts__list">{items}</ul>{code}</div>'
    plan = ""
    if z.get("plan"):
        lis = "".join(f"<li><strong>{e(d)}</strong> — {md(t)}</li>" for d, t in z["plan"])
        plan = f'<div class="guide__plan"><span class="eyebrow" style="color:var(--gold-soft)">Consejos de Cheno</span><h2>{e(z.get("plan_titulo", "Mi ruta"))}</h2><ul>{lis}</ul></div>'
    intro = "".join(f'<p class="intro-p">{md(p)}</p>' for p in z["intro"])
    doc = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8" />
<base href="{ROOT.as_uri()}/" />
<title>Guía {e(z['nombre'])} · Chenoaventuras</title>
<link rel="stylesheet" href="assets/css/styles.css" />
<style>{(HERE / 'guia.css').read_text()}
.cover img {{ object-position: {z.get('pos', 'center 45%')}; }}
.cover h1 {{ font-size: {z.get('h1', '4.6rem')}; }}
.isla {{ margin-top: 18px; }}
.isla + .isla {{ break-before: page; }}
.article__body .isla .guide__head p {{ font-size: .85rem; color: var(--ink-soft); }}
</style></head>
<body>
<section class="cover">
  <img src="{jpg(posts[z['portada']]['cover'], 1500)}" alt="" />
  <div class="cover__in"><span class="eyebrow">Guía Chenoaventuras</span><h1>{z['h1_txt']}</h1><p>{e(z['sub'])}</p></div>
  <div class="cover__foot"><span class="brand"><span class="brand__name">Cheno</span><span class="brand__tag">Aventuras</span></span><small>@chenoaventuras<br>chenoaventuras.com</small></div>
</section>
<section class="pg article__body">
  <div class="pg__head"><span class="eyebrow">Antes de nada</span><h2>{z['titulo_intro']}</h2></div>
  <div class="intro-box">{intro}</div>
  <div class="guide__head"><span class="eyebrow">Para organizarte</span><h2>Lo básico</h2></div>
  <div class="guide__tips">{tips}</div>
  {cards_html}
  {act_html}
  {plan}
  <div class="end"><h2>¿Te ha servido?</h2><p>Cada lugar tiene su post completo en <a href="https://www.chenoaventuras.com/blog.html">chenoaventuras.com</a>, y en Instagram <a href="https://www.instagram.com/chenoaventuras/">@chenoaventuras</a> te lo enseño en vídeo.</p></div>
</section>
</body></html>"""
    hp = tmp / f"{key}.html"
    hp.write_text(doc)
    out = OUT / f"guia-{key}-chenoaventuras.pdf"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files",
                    "--virtual-time-budget=10000", f"--print-to-pdf={out}", hp.as_uri()], capture_output=True)
    print(f"  {key}: {len(places)} lugares, {len(acts)} actividades, {out.stat().st_size // 1024} KB")
    return out


def main(argv):
    if not pathlib.Path(CHROME).exists():
        print("Guías: no está Google Chrome, no se regeneran.")
        return
    posts = load_posts()
    sync_site(posts)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    keys = [a for a in argv if not a.startswith("--")] or list(ZONAS)
    fps = {k: fingerprint(k, posts) for k in keys}
    if "--changed" in argv:
        keys = [k for k in keys if manifest.get(k) != fps[k] or not (OUT / f"guia-{k}-chenoaventuras.pdf").exists()]
    if not keys:
        print("Guías: todas al día.")
        return
    print("Guías: regenerando", ", ".join(keys))
    with tempfile.TemporaryDirectory() as t:
        for k in keys:
            out = build(k, posts, pathlib.Path(t))
            manifest[k] = fps[k]
            if "--drive" in argv and DRIVE.exists():
                shutil.copyfile(out, DRIVE / f"Guía {short_name(k)} - Chenoaventuras.pdf")
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")


def short_name(k):
    return ZONAS[k]["nombre"].split(":")[0]


def sync_site(posts):
    """Cada post de una zona ofrece su guía (campos guia/guiaTitulo) y api/_guias-zonas.mjs
    le dice al formulario qué PDF mandar. Los posts que ya tienen otra guía no se tocan."""
    api = {}
    for k in ZONAS:
        file = f"/assets/guias/guia-{k}-chenoaventuras.pdf"
        title = f"Guía {short_name(k)}"
        for s in places_of(ZONAS[k], posts):
            f = ROOT / "content" / "blog" / f"{s}.md"
            txt = f.read_text()
            end = txt.index("\n---", 3)
            fm = txt[:end]
            m = re.search(r"^guia: *(\S+)", fm, re.M)
            if m and m.group(1) != file:
                continue  # tiene su propia guía (Cuenca, Pirineo…)
            api.setdefault(s, {"title": title, "file": file})
            if not m:
                fm += f"\nguia: {file}\nguiaTitulo: '{title} en PDF'"
                f.write_text(fm + txt[end:])
    body = ",\n".join(f"  {json.dumps(s)}: {json.dumps(v, ensure_ascii=False)}" for s, v in sorted(api.items()))
    (ROOT / "api" / "_guias-zonas.mjs").write_text(
        "// Generado por scripts/guias/gen.py: post -> guía PDF de su zona. No editar a mano.\n"
        f"export const ZONE_GUIDES = {{\n{body}\n}};\n")


if __name__ == "__main__":
    main(sys.argv[1:])
