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
# guías hechas a mano (no las genera este script): sus posts las conservan
HANDMADE = {f"/assets/guias/guia-{k}-chenoaventuras.pdf" for k in ("cuenca", "pirineo-aragones", "pirineo-aragones-ilustrada", "monte-igueldo")}
sys.path.insert(0, str(HERE))
from zonas import ZONAS  # noqa: E402

e = html.escape
TYPES = {"Pueblos": "Pueblo", "Spots": "Spot", "Rutas": "Ruta", "Actividades": "Actividad", "Curiosidades": "Curiosidad", "Playas": "Playa", "Cuevas": "Cueva"}
PIN = '<svg class="ico" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>'


# cierre de todas las guías: quién soy y enlace a Instagram
AUTHOR = ('<aside class="authorbox gauthor keep"><img class="authorbox__img" src="assets/img/cheno-perfil-192.webp" alt="" />'
          '<div class="authorbox__body"><p class="authorbox__name">Cheno · Chenoaventuras</p>'
          '<p>Lugares de interés para personas aventureras.</p>'
          '<a class="final__btn gauthor__btn" href="https://www.instagram.com/chenoaventuras/">Sígueme en Instagram · @chenoaventuras</a>'
          '<p class="authorbox__links"><a href="https://www.tiktok.com/@chenoaventuras">TikTok</a> · <a href="https://www.youtube.com/channel/UC_IpsXQB1ky-HUaDFePSPFg">YouTube</a> · <a href="https://www.chenoaventuras.com/">chenoaventuras.com</a></p>'
          '</div></aside>')


def load_posts():
    js = r"""const fs=require("fs"),m=require("gray-matter"),{marked}=require("marked"),d0=process.argv[1];const o={};
marked.setOptions({gfm:true,breaks:false});
for(const f of fs.readdirSync(d0)){if(!f.endsWith(".md"))continue;const g=m(fs.readFileSync(d0+"/"+f,"utf8")),d=g.data;if(d.draft||d.evento===true||d.sinGuia===true)continue;
o[f.slice(0,-3)]={title:d.title,lugar:d.lugar||"",excerpt:d.excerpt||"",cover:d.cover||"",lat:d.lat,lng:d.lng,tags:d.tags||[],act:d.actividades||[],
comer:(d.comer||[]).slice(0,4),date:String(d.date||""),body:marked.parse(g.content)};}
process.stdout.write(JSON.stringify(o));"""
    r = subprocess.run(["node", "-e", js, str(ROOT / "content" / "blog")], cwd=ROOT, capture_output=True, text=True, check=True)
    posts = json.loads(r.stdout)
    # provincia/isla de cada post (la calcula el build del blog en assets/data/cobertura.json)
    cob = ROOT / "assets" / "data" / "cobertura.json"
    subprocess.run(["node", "scripts/build-blog.mjs"], cwd=ROOT, capture_output=True)
    if cob.exists():
        for prov, v in json.loads(cob.read_text()).items():
            for p in v["posts"]:
                if p["slug"] in posts:
                    posts[p["slug"]]["prov"] = prov
    return posts


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
    """Posts que entran en la guía: todos los de sus provincias/islas (zonas con `provincias`),
    una lista fija (`lugares`) o, en zonas por secciones, el post de cada isla y sus enlazados."""
    if "provincias" in z:
        mine = [s for s, p in posts.items() if p.get("prov") in z["provincias"] and s not in z.get("fuera", [])]
        first = [s for s in z.get("orden", []) if s in mine]
        rest = sorted((s for s in mine if s not in first), key=lambda s: (not s.endswith("-que-ver"), posts[s]["lugar"] or posts[s]["title"]))
        return first + rest
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
    if z.get("portada_img") and img_file(z["portada_img"]):
        h.update(img_file(z["portada_img"]).read_bytes())
    return h.hexdigest()


SITE = "https://www.chenoaventuras.com"
CAR_URL = "https://www.discovercars.com/?a_aid=chenoaventuras"
CODE_GYG = '<p class="acts__code">🎟️ En GetYourGuide usa el código <strong>CHENOAVENTURAS5</strong> y llévate un <strong>5% de descuento</strong>.</p>'


def car_box(small=False):
    """Recuadro de alquiler de coche (enlace de afiliado de DiscoverCars)."""
    if small:
        return (f'<p class="car car--small">🚗 <strong>¿No tienes coche?</strong> Compara gratis todas las compañías de alquiler y elige la de mejor precio: '
                f'<a href="{CAR_URL}">ver precios en DiscoverCars →</a></p>')
    return (f'<div class="car"><span class="car__ico">🚗</span><div><h3>¿No tienes coche?</h3><p>Si quieres alquilar uno, aquí puedes '
            f'<strong>comparar gratis todas las compañías de alquiler</strong> y escoger la que tenga mejor precio.</p>'
            f'<a class="gbtn gbtn--reel" href="{CAR_URL}">Comparar precios en DiscoverCars →</a></div></div>')


def needs_car(txt):
    return bool(re.search(r"\bcoche\b", re.sub(r"<[^>]+>", " ", txt), re.I))


def _end_of(h, i):
    """Índice justo después del elemento HTML que empieza en i (cuenta etiquetas anidadas del mismo tipo)."""
    m = re.match(r"<(\w+)", h[i:])
    if not m:
        return i
    tag, depth, j = m.group(1), 0, i
    pat = re.compile(rf"<(/?){tag}\b[^>]*?(/?)>")
    for t in pat.finditer(h, i):
        if t.group(2):
            continue
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return t.end()
    return len(h)


def keep_heads(h):
    """Une cada título de sección con el bloque que le sigue para que no quede suelto al final de una página."""
    out, i = [], 0
    pat = re.compile(r'<div class="guide__head">|<h[23][ >]')
    while True:
        m = pat.search(h, i)
        if not m:
            out.append(h[i:])
            break
        out.append(h[i:m.start()])
        a = m.start()
        b = _end_of(h, a)
        n = re.match(r"\s*", h[b:]).end() + b
        if n < len(h) and h[n] == "<" and not re.match(r'<div class="guide__head">|<h[23][ >]', h[n:]):
            c = _end_of(h, n)
            g = re.match(r'<ol class="(guide__grid[^"]*)">', h[n:])
            gal = re.match(r'<div class="gallery">', h[n:])
            if gal:
                # galería de fotos: igual, el título solo se lleva la primera fila
                figs = re.findall(r"<figure>.*?</figure>", h[n:c], re.S)
                out.append(f'<div class="keep">{h[a:b]}<div class="gallery">{"".join(figs[:2])}</div></div>')
                if figs[2:]:
                    out.append(f'<div class="gallery grid--cont">{"".join(figs[2:])}</div>')
            elif g:
                # cuadrícula de fotos: el título solo arrastra la primera fila; el resto sigue en otra lista
                items, k = [], n + g.end()
                while True:
                    k = re.match(r"\s*", h[k:]).end() + k
                    if not h.startswith("<li", k):
                        break
                    e2 = _end_of(h, k)
                    items.append(h[k:e2])
                    k = e2
                first, rest = items[:2], items[2:]
                out.append(f'<div class="keep">{h[a:b]}<ol class="{g.group(1)}">{"".join(first)}</ol></div>')
                if rest:
                    out.append(f'<ol class="{g.group(1)} grid--cont">{"".join(rest)}</ol>')
            elif h.startswith("<p>", n) and len(re.sub(r"<[^>]+>", "", h[n:c])) > 350:
                # párrafo largo: puede partirse; el título se queda con sus primeras líneas
                out.append(f'<div class="keepnext">{h[a:b]}</div>{h[n:c]}')
            else:
                out.append(f'<div class="keep">{h[a:c]}</div>')
            i = c
        else:
            out.append(h[a:b])
            i = b
    return "".join(out)


def img_key(path):
    """Huella del contenido de una foto: dos rutas con el mismo archivo cuentan como la misma foto."""
    f = img_file(path) if path.startswith("/assets/") else None
    return hashlib.md5(f.read_bytes()).hexdigest() if f else path


def drop_repeated(h, keep):
    """Quita las fotos que ya salen en otra parte de la guía (keep(src) dice si se queda).
    Una ficha nunca se queda sin foto: si su foto está repetida, sale la ficha entera; en las demás, la figura."""
    def media(m):
        src = re.search(r'src="([^"]+)"', m.group(0)).group(1)
        return m.group(0) if keep(src) else ""

    def card(m):
        img = re.search(r'<div class="gcard__media"><img[^>]*src="([^"]+)"', m.group(0))
        return m.group(0) if not img or keep(img.group(1)) else ""

    def grid(m):
        g = re.sub(r'<li class="gcard.*?</li>', card, m.group(0), flags=re.S)
        if "<li" not in g:
            return ""
        if g != m.group(0):  # se renumeran las fichas que quedan, sin saltos
            nums = re.findall(r'<span class="gcard__n">(\d+)</span>', m.group(0))
            n = iter(range(int(nums[0]) if nums else 1, 999))
            g = re.sub(r'<span class="gcard__n">\d+</span>', lambda x: f'<span class="gcard__n">{next(n):02d}</span>', g)
        return g
    h = re.sub(r'<ol class="guide__grid[^"]*">.*?</ol>', grid, h, flags=re.S)  # todas las fichas van en cuadrícula
    h = re.sub(r'<figure[^>]*>\s*<img[^>]*>.*?</figure>', media, h, flags=re.S)
    h = re.sub(r'<p>\s*<img[^>]*>\s*</p>', media, h)
    return h


def clean_body(html_, jpg, keep=None):
    """El cuerpo del post, listo para imprimir: sin botones, notas, CTA ni animaciones."""
    h = re.sub(r"<!--.*?-->", "", html_, flags=re.S)
    h = re.sub(r'<div class="guide__cta">.*?</div>', "", h, flags=re.S)
    h = re.sub(r'<div class="guide__maps">.*?</div>', "", h, flags=re.S)
    h = re.sub(r'<p class="guide__note">.*?</p>', "", h, flags=re.S)
    h = re.sub(r"<(iframe|video|script|blockquote class=\"instagram-media\")[^>]*>.*?</\1>", "", h, flags=re.S)
    h = re.sub(r"<p>[^<]*?(Te cuento|te cuento)[^<]*👇\s*</p>", "", h)
    h = re.sub(r"<p>[^<]*👇\s*</p>", "", h)
    h = h.replace(" reveal", "").replace('class="reveal"', "")
    h = re.sub(r'href="/', f'href="{SITE}/', h)
    h = re.sub(r'\s(loading|decoding)="[^"]*"', "", h)
    if keep:
        h = drop_repeated(h, keep)

    def img(m):
        tag, src = m.group(0), m.group(1)
        if src.startswith("/assets/"):
            w = 280 if "gcard" in tag else 620
            return tag.replace(f'src="{src}"', f'src="{jpg(src, w)}"')
        return tag
    h = re.sub(r'<img[^>]*src="([^"]+)"[^>]*>', img, h)
    # las fotos de las fichas se marcan para hacerlas pequeñas
    h = h.replace('<div class="gcard__media"><img ', '<div class="gcard__media"><img class="gimg" ')
    h = re.sub(r"<p>\s*(<img[^>]*>)\s*</p>", r'<figure class="ph">\1</figure>', h)
    h = re.sub(r"<p>[^<]*(Sígueme en Instagram|sígueme en Instagram)(?:(?!</p>).)*</p>", "", h, flags=re.S)
    return keep_heads(h)


def last_fill(pdf):
    """Qué parte de la altura de la última página está ocupada (0-1)."""
    try:
        import fitz
    except ImportError:
        return 1.0
    d = fitz.open(pdf)
    pg = d[-1]
    H = pg.rect.height
    # sin fondos de página ni la marca de agua del pie
    ys = [r[1][3] for r in pg.get_bboxlog() if (r[1][3] - r[1][1]) < 0.7 * H and r[1][1] < H - 45]
    return (max(ys) / pg.rect.height) if ys else 0.0


def chapter_tails(pdf, n):
    """[(nº de capítulo, cuánto se llena su última página)]. Cada capítulo empieza en página nueva
    con su número (01, 02…) en la esquina de la foto."""
    try:
        import fitz
    except ImportError:
        return []
    d = fitz.open(pdf)
    starts = {}
    for k, pg in enumerate(d):
        for b in pg.get_text("dict")["blocks"]:
            for ln in b.get("lines", []):
                for sp in ln["spans"]:
                    t = sp["text"].strip()
                    # el número grande del capítulo (los de las fichas de fotos son pequeños)
                    if sp["size"] > 15 and sp["bbox"][1] < 140 and re.fullmatch(r"\d\d", t) and int(t) == len(starts) + 1 <= n:  # van en orden: 01, 02…
                        starts[int(t)] = k
    out, order = [], sorted(starts.items(), key=lambda x: x[1])
    for j, (c, k) in enumerate(order):
        end = (order[j + 1][1] if j + 1 < len(order) else len(d)) - 1
        if end <= k:
            continue
        pg = d[end]
        H = pg.rect.height
        ys = [r[1][3] for r in pg.get_bboxlog() if (r[1][3] - r[1][1]) < 0.7 * H and r[1][1] < H - 45]
        out.append((c, (max(ys) / H) if ys else 0.0))
    return out


def loose_pages(pdf):
    """Páginas (sin contar portada ni la última) ocupadas menos de un 30 %."""
    try:
        import fitz
    except ImportError:
        return 0
    d, n = fitz.open(pdf), 0
    for pg in list(d)[1:-1]:
        H = pg.rect.height
        ys = [r[1][3] for r in pg.get_bboxlog() if (r[1][3] - r[1][1]) < 0.7 * H and r[1][1] < H - 45]
        n += (max(ys) / H if ys else 0) < 0.3
    return n


def pages(pdf):
    try:
        import fitz
    except ImportError:
        return 0
    return len(fitz.open(pdf))


def build(key, posts, tmp):
    z = ZONAS[key]

    def jpg(path, width=460):
        src = img_file(path)
        if not src:
            return path
        out = tmp / (re.sub(r"[^\w-]", "_", path.strip("/")) + f"_{width}q.jpg")
        if not out.exists():
            # las portadas (de la guía y de cada capítulo) van con buena calidad; las fotos pequeñas, más comprimidas
            q = "85" if width >= 900 else "60"
            subprocess.run(["sips", "-Z", str(width), "-s", "format", "jpeg", "-s", "formatOptions", q, str(src), "--out", str(out)], capture_output=True)
        return out.as_uri()

    places = places_of(z, posts)

    # cada foto sale una sola vez en toda la guía (salvo la portada, otra vez en su capítulo): primero se reservan las portadas,
    # luego las fotos de los posts de cada lugar y por último las de los posts resumen (que enlazan a otros lugares)
    owner = {img_key(posts[s]["cover"]): ("hero", s) for s in places if posts[s]["cover"]}
    def card_link(li, s):
        """Lugar de la guía al que lleva una ficha (None si no lleva a otro capítulo)."""
        m = re.search(r'href="/blog/([\w-]+)\.html"', li)
        return m.group(1) if m and m.group(1) in places and m.group(1) != s else None

    # posts resumen: los que tienen al menos 2 fichas que llevan a otros lugares con capítulo propio
    hubs = {s for s in places if sum(1 for li in re.findall(r'<li class="gcard.*?</li>', posts[s]["body"], re.S) if card_link(li, s)) >= 2}
    for s in [x for x in places if x not in hubs] + [x for x in places if x in hubs]:
        for src in re.findall(r'<img[^>]*src="(/assets/[^"]+)"', posts[s]["body"]):
            owner.setdefault(img_key(src), ("body", s))

    def keeper(s):
        shown = set()

        def keep(src):
            k = img_key(src)
            # la portada del capítulo puede repetirse una vez dentro de su propio capítulo
            if owner.get(k) not in (("body", s), ("hero", s)) or k in shown:
                return False
            shown.add(k)
            return True
        return keep

    def name_of(s):
        p = posts[s]
        n = p["lugar"] or p["title"].split(":")[0]
        if sum(1 for o in places if (posts[o]["lugar"] or posts[o]["title"].split(":")[0]) == n) > 1 and not s.endswith("-que-ver"):
            n = p["title"].split(":")[0]
        return n

    def chapter(i, s):
        p = posts[s]
        name = name_of(s)
        kind = next((TYPES[t] for t in p["tags"] if t in TYPES), "Lugar")
        q = f"{p['lat']},{p['lng']}" if p.get("lat") else quote(name)
        title = p["title"].split(":", 1)[1].strip() if ":" in p["title"] else ""
        eat = ""
        if p.get("comer") and tight.get(i, 0) < 6:  # nivel 6: «Dónde comer» solo en el post
            lis = "".join(f'<li><strong>{e(r.get("n", ""))}</strong>'
                          + (f' · {r["r"]} ★' if r.get("r") else "")
                          + (f' <span>({r["o"]:,} opiniones)</span>'.replace(",", ".") if r.get("o") else "")
                          + (f'<br><small>{e(r.get("d", ""))}</small>' if r.get("d") else "") + "</li>"
                          for r in p["comer"][:2 if tight.get(i, 0) >= 5 else None])
            eat = f'<div class="eat"><h3>🍽️ Dónde comer</h3><p class="eat__lead">Los restaurantes con mejores opiniones de la zona en Google.</p><ul>{lis}</ul></div>'
        links = (f'<p class="chap__links"><a class="gbtn gbtn--reel" href="{SITE}/blog/{s}.html">Leer el post completo</a>'
                 f'<a class="gbtn" href="https://www.google.com/maps/search/?api=1&query={q}">{PIN} Cómo llegar</a></p>')
        body = clean_body(p["body"], jpg, keeper(s))
        acts_here = []
        for a in p["act"][:3]:
            href, plat = aff(a["u"])
            if plat:
                acts_here.append((a["t"], href, plat))
        if acts_here and tight.get(i, 0) < 4:  # nivel 4: los planes ya salen en «Actividades recomendadas»
            items = "".join(f'<li><a href="{e(h)}"><span class="pl pl--{"gyg" if pl == "GetYourGuide" else "civ"}">{pl}</span><span>{e(t)}</span><b>Reservar →</b></a></li>' for t, h, pl in acts_here)
            eat += (f'<div class="acts acts--here"><h3>🎟️ Planes para reservar aquí</h3><ul class="acts__list">{items}</ul>'
                    + (CODE_GYG if any(pl == "GetYourGuide" for *_, pl in acts_here) else "") + "</div>")
        howto = re.search(r'<div class="guide__howto">.*?</div>', p["body"], re.S)
        if needs_car(howto.group(0) if howto else "") and tight.get(i, 0) < 3:
            eat += car_box(small=True)  # en el nivel 3 de compactación se quita para no dejar una página solo con él
        # cierre del capítulo: los consejos van en un bloque y dónde comer + planes + enlaces en otro
        # (así los consejos pueden quedarse en la página anterior y no dejan un hueco; nunca una página solo con botones)
        body += f'<div class="chap__end">{eat}{links}</div>'
        return (f'<section class="chap{" chap--t%d" % (1 if tight[i] == 1 else 2 if tight[i] < 4 else 3) if tight.get(i) else ""}"><div class="chap__keep">'
                f'<div class="chap__hero"><img src="{jpg(p["cover"], 900)}" alt="" /><span class="chap__n">{i:02d}</span></div>'
                f'<div class="chap__head"><span class="eyebrow">{e(kind)}{" · " + e(p["prov"]) if p.get("prov") else ""}</span><h2>{e(name)}</h2>'
                + (f'<p class="chap__sub">{e(title)}</p>' if title else "")
                + f'<p class="chap__dek">{e(p["excerpt"])}</p></div></div>'
                f'<div class="chap__body">{body}</div></section>')

    small_author = False
    tight = {}  # capítulos que se compactan un poco para no dejar una última página casi vacía
    index = "".join(f'<li><b>{i + 1:02d}</b><span>{e(name_of(s))}</span><em>{e(next((TYPES[t] for t in posts[s]["tags"] if t in TYPES), "Lugar"))}</em></li>' for i, s in enumerate(places))
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
        code = CODE_GYG if any(p == "GetYourGuide" for *_, p in acts) else ""
        act_html = f'<div class="acts"><div class="guide__head"><span class="eyebrow">Planes para reservar</span><h2>Actividades recomendadas</h2></div><ul class="acts__list">{items}</ul>{code}</div>'
    plan_items = "".join(f"<li><strong>{e(d)}</strong> — {md(t)}</li>" for d, t in z.get("plan", []))
    closing = (f'<div class="guide__plan final"><span class="eyebrow" style="color:var(--gold-soft)">Consejos de Cheno</span>'
               + (f'<h2>{e(z.get("plan_titulo", "Mi ruta"))}</h2><ul>{plan_items}</ul>' if plan_items else "")
               + '<p class="final__end"><strong>Cómo usar esta guía:</strong> cada lugar tiene su capítulo con toda la información, y su post completo en '
                 '<a href="https://www.chenoaventuras.com/blog.html">chenoaventuras.com</a> y en Instagram '
                 '<a href="https://www.instagram.com/chenoaventuras/">@chenoaventuras</a> te lo enseño en vídeo.</p></div>')
    intro = "".join(f'<p class="intro-p">{md(p)}</p>' for p in z["intro"])
    # guías cortas: al final, enlace al post de la guía completa de su región
    full = ""
    if z.get("completa"):
        nom, url = z["completa"]
        full = (f'<div class="guide__plan final keep"><span class="eyebrow" style="color:var(--gold-soft)">¿Vas a ver más?</span>'
                f'<h2>Descarga la Guía {e(nom)} completa</h2>'
                f'<p class="final__end">Esta es una guía corta. La guía completa de {e(nom)}, con todos los lugares y una ruta por toda la región, '
                f'la tienes gratis en mi web.</p><a class="final__btn" href="{e(url)}">Descargar la guía completa →</a></div>')
    toc = f'<div class="toc"><div class="guide__head"><span class="eyebrow">En esta guía</span><h2>{len(places)} lugares imprescindibles</h2></div><ol>{index}</ol></div>'

    # colocaciones posibles de ruta/índice/actividades: (antes de los capítulos, después)
    layouts = [(closing + toc + act_html, ""), ("", toc + act_html + closing), (closing, toc + act_html),
               (closing + toc, act_html), (toc + act_html, closing)]

    car_basic = car_box() if needs_car(" ".join(d for _, d in z["tips"])) else ""

    def make_doc(at_end):
        head, tail = layouts[at_end]
        return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8" />
<base href="{ROOT.as_uri()}/" />
<title>Guía {e(z['nombre'])} · Chenoaventuras</title>
<link rel="stylesheet" href="assets/css/styles.css" />
<style>{(HERE / 'guia.css').read_text()}
.cover img {{ object-position: {z.get('pos', 'center 45%')}; }}
.cover h1 {{ font-size: {z.get('h1', '4.6rem')}; }}
</style></head>
<body>
<section class="cover">
  <img src="{jpg(z.get('portada_img') or posts[z['portada']]['cover'], 1500)}" alt="" />
  <div class="cover__in"><span class="eyebrow">Guía Chenoaventuras</span><h1>{z['h1_txt']}</h1><p>{e(z['sub'])}</p></div>
  <div class="cover__foot"><span class="brand"><span class="brand__name">Cheno</span><span class="brand__tag">Aventuras</span></span><small>@chenoaventuras<br>chenoaventuras.com</small></div>
</section>
<section class="flow article__body">
  <div class="pg__head"><span class="eyebrow">Antes de nada</span><h2>{z['titulo_intro']}</h2></div>
  <div class="intro-box">{intro}</div>
  <div class="guide__head"><span class="eyebrow">Para organizarte</span><h2>Lo básico</h2></div>
  <div class="guide__tips">{tips}</div>
  {car_basic}
  {head}
  {"".join(chapter(i + 1, s) for i, s in enumerate(places))}
  {tail}
  {full}
  {AUTHOR.replace("gauthor keep", "gauthor gauthor--sm keep") if small_author else AUTHOR}
</section>
</body></html>"""

    out = OUT / f"guia-{key}-chenoaventuras.pdf"

    def render(at_end):
        hp = tmp / f"{key}.html"
        hp.write_text(make_doc(at_end))
        for _ in range(3):  # a veces Chrome se queda colgado: se corta a los 3 minutos y se reintenta
            try:
                subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files",
                                "--virtual-time-budget=15000", f"--print-to-pdf={out}", hp.as_uri()], capture_output=True, timeout=180)
                break
            except subprocess.TimeoutExpired:
                pass
        if "--html" in sys.argv:
            shutil.copyfile(hp, OUT.parent.parent / f"guia-{key}.html")
        return last_fill(out)

    # cada lugar empieza en página nueva, así que se prueban las colocaciones de ruta/índice/actividades
    # y se queda la que menos páginas ocupa (y, a igualdad, la que mejor llena la última)
    best, score = 0, None
    for i in (0, 3, 4):  # el índice siempre va al principio
        f = render(i)
        sc = (-pages(out), -loose_pages(out), f)
        if score is None or sc > score:
            best, score = i, sc
    fill = render(best) if best != 4 else score[2]
    # si un capítulo acaba con una página casi vacía, se compacta (hasta 2 niveles) y se vuelve a montar
    # (solo se queda la compactación si de verdad desaparece la página casi vacía)
    tails = dict(chapter_tails(out, len(places)))
    for c in sorted(tails):
        if tails[c] >= 0.3:
            continue
        before = pages(out)
        for lvl in (1, 2, 3, 4, 5, 6):
            tight[c] = lvl
            fill = render(best)
            # vale cuando el final del capítulo ya no queda casi vacío (no basta con ahorrar una página dentro)
            if pages(out) <= before and dict(chapter_tails(out, len(places))).get(c, 1) >= 0.3:
                break
        else:
            del tight[c]
            fill = render(best)
    # la tarjeta de Instagram del final nunca sola en una página: se compacta la tarjeta y, si hace falta, el último capítulo
    if fill < 0.3:
        before, last = pages(out), len(places)
        prev = tight.get(last)
        small_author = True
        fill = render(best)
        for lvl in range((prev or 0) + 1, 7):
            if pages(out) < before:
                break
            tight[last] = lvl
            fill = render(best)
        if pages(out) >= before:  # último recurso: se compactan un poco todos los capítulos
            saved = dict(tight)
            for c in range(1, last + 1):
                tight[c] = max(tight.get(c, 0), 2)
            fill = render(best)
            if pages(out) >= before:
                tight.clear()
                tight.update(saved)
        if pages(out) >= before:
            small_author = False
            if prev:
                tight[last] = prev
            else:
                tight.pop(last, None)
            fill = render(best)
    print(f"  {key}: {len(places)} lugares, {len(acts)} actividades, {out.stat().st_size // 1024} KB, última página al {fill:.0%}")
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
            if s in api or (m and m.group(1) in HANDMADE):
                continue  # ya asignado o con su propia guía hecha a mano (Cuenca, Pirineo…)
            api[s] = {"title": title, "file": file}
            if not m or m.group(1) != file:
                fm = re.sub(r"\nguia: .*", "", fm)
                fm = re.sub(r"\nguiaTitulo: .*", "", fm)
                fm += f"\nguia: {file}\nguiaTitulo: '{title} en PDF'"
                f.write_text(fm + txt[end:])
    body = ",\n".join(f"  {json.dumps(s)}: {json.dumps(v, ensure_ascii=False)}" for s, v in sorted(api.items()))
    (ROOT / "api" / "_guias-zonas.mjs").write_text(
        "// Generado por scripts/guias/gen.py: post -> guía PDF de su zona. No editar a mano.\n"
        f"export const ZONE_GUIDES = {{\n{body}\n}};\n")


if __name__ == "__main__":
    main(sys.argv[1:])
