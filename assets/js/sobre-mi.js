/* Página «Sobre mí» (contacto.html): cifras, constelación, sellos y tira de
   fotos a partir de los lugares del mapa (#mapa-data de /mapa.html), para
   que todo se actualice solo cuando se publica un post nuevo. */
(function () {
  "use strict";
  var COLORS = { Actividades: "#6f9be0", Pueblos: "#9bab68", Spots: "#f6c945", Curiosidades: "#c08ad6" };
  var STAMP_COLORS = ["#274c78", "#566337", "#b98a10", "#a33b2f", "#3c6aa3", "#77854f"];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  function slugify(t) { return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function rand(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }
  function el(tag, attrs, ns) {
    var e = ns ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  fetch("/mapa.html")
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var m = html.match(/<script type="application\/json" id="mapa-data">([\s\S]*?)<\/script>/);
      if (!m) return;
      var data = JSON.parse(m[1]);
      var spain = data.filter(function (d) { return d.region && d.region !== "Marruecos" && d.region !== "Otros destinos"; });
      stats(data, spain);
      sky(data);
      stamps(spain);
      film(data);
    })
    .catch(function () { /* sin datos: se quedan las cifras de respaldo del HTML */ });

  /* ---------- cifras con contador ---------- */
  function stats(all, spain) {
    var uniq = function (arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }).length; };
    var vals = {
      lugares: all.length,
      comunidades: uniq(spain.map(function (d) { return d.region; })),
      provincias: uniq(spain.map(function (d) { return d.provincia; }))
    };
    document.querySelectorAll("[data-count]").forEach(function (b) {
      var to = vals[b.getAttribute("data-count")];
      if (!to) return;
      if (reduce || !("IntersectionObserver" in window)) { b.textContent = to; return; }
      b.textContent = "0";
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        var t0 = performance.now(), dur = 1400;
        (function step(t) {
          var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          b.textContent = Math.round(to * e);
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
      io.observe(b);
    });
  }

  /* ---------- constelación ---------- */
  function sky(all) {
    var svg = document.getElementById("sky");
    var tip = document.getElementById("sky-tip");
    if (!svg) return;
    var W = 1000, H = 840;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    // península + Baleares + Ceuta/Melilla
    var LON0 = -9.6, LON1 = 4.5, LAT0 = 35.0, LAT1 = 44.0;
    function proj(d) {
      if (d.lat < 30 && d.lng < -12) { // Canarias, en el recuadro
        return [30 + (d.lng + 18.3) / 5 * 220, 712 + (29.6 - d.lat) / 2.1 * 100];
      }
      if (d.lng < LON0 || d.lng > LON1 || d.lat < LAT0 || d.lat > LAT1) return null; // Marruecos y otros
      return [(d.lng - LON0) / (LON1 - LON0) * W, (LAT1 - d.lat) / (LAT1 - LAT0) * H];
    }
    // polvo de estrellas de fondo
    for (var i = 0; i < 140; i++) {
      svg.appendChild(el("circle", { cx: (rand(i + 1) * W).toFixed(1), cy: (rand(i + 99) * H).toFixed(1), r: (rand(i + 7) * 1.2 + .3).toFixed(2), class: "sky-dust" }, true));
    }
    svg.appendChild(el("rect", { x: 14, y: 692, width: 252, height: 136, rx: 12, class: "sky-box" }, true));
    var lbl = el("text", { x: 28, y: 818, class: "sky-label" }, true); lbl.textContent = "Canarias"; svg.appendChild(lbl);

    var pts = [];
    all.forEach(function (d) { var p = proj(d); if (p) pts.push({ d: d, x: p[0], y: p[1] }); });
    // cada estrella se une con su vecina más cercana: efecto constelación
    var lines = el("g", {}, true); svg.appendChild(lines);
    pts.forEach(function (a, i) {
      var best = null, bd = Infinity;
      pts.forEach(function (b, j) {
        if (i === j) return;
        var dd = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
        if (dd > 4 && dd < bd) { bd = dd; best = b; }
      });
      if (best && bd < 120 * 120) lines.appendChild(el("line", { x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: best.x.toFixed(1), y2: best.y.toFixed(1), class: "sky-line" }, true));
    });
    pts.forEach(function (p, i) {
      var c = COLORS[p.d.type] || "#fff";
      var a = el("a", { href: p.d.url }, true);
      var star = el("circle", {
        cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 5.5, fill: c, class: "sky-star", tabindex: 0,
        style: "--tw:" + (2 + rand(i) * 3).toFixed(2) + "s;--td:" + (rand(i + 3) * -4).toFixed(2) + "s;filter:drop-shadow(0 0 6px " + c + ")"
      }, true);
      var t = el("title", {}, true); t.textContent = p.d.title; star.appendChild(t);
      function show() { tip.textContent = p.d.title + (p.d.provincia ? " · " + p.d.provincia : ""); }
      star.addEventListener("mouseenter", show);
      star.addEventListener("focus", show);
      a.appendChild(star);
      svg.appendChild(a);
    });
    tip.textContent = pts.length + " estrellas y subiendo";
  }

  /* ---------- sellos por comunidad ---------- */
  function stamps(spain) {
    var box = document.getElementById("stamps");
    if (!box) return;
    var count = {};
    spain.forEach(function (d) { count[d.region] = (count[d.region] || 0) + 1; });
    Object.keys(count).sort(function (a, b) { return count[b] - count[a] || a.localeCompare(b, "es"); }).forEach(function (r, i) {
      var s = el("div", { class: "stamp reveal is-visible" });
      s.style.setProperty("--rot", ((rand(i + 11) - .5) * 22).toFixed(1) + "deg");
      s.style.setProperty("--stamp", STAMP_COLORS[i % STAMP_COLORS.length]);
      var inner = el("div");
      var img = el("img", { src: "/assets/img/flags/" + slugify(r) + ".webp", alt: "", loading: "lazy", decoding: "async" });
      img.onerror = function () { img.remove(); };
      var b = el("b"); b.textContent = r;
      var sm = el("small"); sm.textContent = count[r] + (count[r] === 1 ? " lugar" : " lugares");
      inner.appendChild(img); inner.appendChild(b); inner.appendChild(sm);
      s.appendChild(inner);
      box.appendChild(s);
    });
  }

  /* ---------- tira de fotos de mis reels ---------- */
  function film(all) {
    var track = document.querySelector("#film .film__track");
    if (!track) return;
    var mine = all.filter(function (d) { return d.cover && d.cover.indexOf("/instagram/") !== -1; });
    mine.sort(function (a, b) { return rand(a.title.length * 7 + a.lat) - rand(b.title.length * 7 + b.lat); });
    mine = mine.slice(0, 28);
    if (!mine.length) { document.querySelector(".about-film").hidden = true; return; }
    [0, 1].forEach(function (copy) {
      mine.forEach(function (d) {
        var a = el("a", { href: d.url });
        if (copy) { a.setAttribute("aria-hidden", "true"); a.setAttribute("tabindex", "-1"); }
        var img = el("img", { src: d.cover, alt: copy ? "" : d.title, loading: "lazy", decoding: "async" });
        var sp = el("span"); sp.textContent = d.title;
        a.appendChild(img); a.appendChild(sp);
        track.appendChild(a);
      });
    });
  }
})();
