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
      scene(data);
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

  /* ---------- cochecito: claxon «pi-pí» al tocarlo ---------- */
  var audio = null;
  // claxon de coche: dos bocinas a la vez (≈410 y 510 Hz, como las de serie),
  // onda de sierra, algo de saturación y un filtro que le da el tono «nasal»
  function horn(t, dur) {
    var out = audio.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
    out.gain.setValueAtTime(0.22, t + dur - 0.035);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var shaper = audio.createWaveShaper();
    var curve = new Float32Array(256);
    for (var i = 0; i < 256; i++) { var x = i / 128 - 1; curve[i] = Math.tanh(x * 3); }
    shaper.curve = curve;
    var band = audio.createBiquadFilter();
    band.type = "bandpass"; band.frequency.value = 1400; band.Q.value = 0.8;
    var low = audio.createBiquadFilter();
    low.type = "lowpass"; low.frequency.value = 3200;
    [410, 510].forEach(function (f) {
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = "sawtooth"; o.frequency.value = f; g.gain.value = 0.35;
      o.connect(g); g.connect(shaper);
      o.start(t); o.stop(t + dur + 0.03);
    });
    shaper.connect(band); band.connect(low); low.connect(out); out.connect(audio.destination);
  }
  function getAudio() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  // los navegadores no dejan sonar nada hasta el primer clic o tecla: se «desbloquea» ahí
  ["pointerdown", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function unlock() {
      try { getAudio(); loadBrake(); } catch (e) {}
      window.removeEventListener(ev, unlock);
    });
  });
  // frenazo: el primer frenazo del efecto que eligió Cheno (assets/audio/frenazo.mp3),
  // se descarga una vez y suena a volumen moderado
  var brakeBuf = null, brakeLoading = false;
  function loadBrake() {
    if (brakeBuf || brakeLoading || !audio) return;
    brakeLoading = true;
    fetch("/assets/audio/frenazo.mp3?v=4")
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (ok, ko) { audio.decodeAudioData(ab, ok, ko); }); })
      .then(function (buf) { brakeBuf = buf; })
      .catch(function () { brakeLoading = false; });
  }
  function skid() {
    if (!brakeBuf) { loadBrake(); return; }
    var src = audio.createBufferSource(), g = audio.createGain();
    src.buffer = brakeBuf; g.gain.value = 0.45;
    src.connect(g); g.connect(audio.destination);
    src.start();
  }
  var canHover = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canHover) {
    document.querySelectorAll(".road__car").forEach(function (car) {
      var last = 0;
      car.addEventListener("mouseenter", function () {
        var now = Date.now();
        if (now - last < 1200) return;
        last = now;
        car.classList.remove("is-braking"); void car.offsetWidth; car.classList.add("is-braking");
        if (audio && audio.state === "running") { try { skid(); } catch (e) {} }
      });
    });
  }

  document.querySelectorAll(".road__car").forEach(function (car) {
    car.addEventListener("click", function () {
      try {
        getAudio();
        var t = audio.currentTime + 0.01;
        horn(t, 0.13);          // pi
        horn(t + 0.21, 0.26);   // pí
      } catch (e) { /* sin audio, solo la animación */ }
      car.classList.remove("is-honking");
      void car.offsetWidth;
      car.classList.add("is-honking");
    });
  });

  /* ---------- paisajes de fondo detrás de las polaroids ---------- */
  // Fotos propias (de Instagram), en HD y elegidas a mano: sin texto encima.
  // Si alguna faltara, el fondo pasa por degradados de color de la marca.
  var BG_PHOTOS = [
      "/assets/img/instagram/18124961662670705.webp",
      "/assets/img/instagram/17975621367111494.webp",
      "/assets/img/instagram/18131174488538752.webp",
      "/assets/img/instagram/17908806873244673.webp",
      "/assets/img/instagram/18047661281545002.webp",
      "/assets/img/instagram/18083171645586039.webp",
      "/assets/img/instagram/18304298470250182.webp",
      "/assets/img/instagram/18067189766151364.webp",
      "/assets/img/instagram/17877658149473059.webp",
      "/assets/img/instagram/17905353456430797.webp",
      "/assets/img/instagram/17946446847350699.webp",
      "/assets/img/instagram/18028664105824895.webp",
      "/assets/img/instagram/18077209043601154.webp",
      "/assets/img/instagram/18097443854031877.webp",
      "/assets/img/instagram/18100773881267979.webp",
      "/assets/img/instagram/18104555819124635.webp",
      "/assets/img/instagram/18105060155170195.webp",
      "/assets/img/instagram/18133461967594850.webp",
      "/assets/img/instagram/18421989400185366.webp",
      "/assets/img/instagram/18446632297189343.webp"
  ];
  var GRADIENTS = [
    "linear-gradient(120deg, #1f3e64, #3c6aa3 55%, #77854f)",
    "linear-gradient(160deg, #f6c945, #e0873a 45%, #274c78)",
    "linear-gradient(140deg, #566337, #9bab68 50%, #f8d878)",
    "linear-gradient(120deg, #0d1d33, #274c78 50%, #c08ad6)",
    "linear-gradient(160deg, #3c6aa3, #5a90cf 50%, #efece7)"
  ];
  function scene(all) {
    var layers = document.querySelectorAll(".scene__img");
    if (layers.length < 2) return;
    var hd = BG_PHOTOS.slice();
    hd.sort(function () { return Math.random() - .5; });
    hd = hd.slice(0, 16);
    var i = 0, g = 0, front = 0;
    function paint(bg) {
      var next = layers[1 - front];
      next.style.backgroundImage = bg;
      // reinicia el movimiento solo de la foto que entra; la que sale sigue el
      // suyo mientras se funden (así no hay saltos de tamaño)
      next.style.animation = "none"; void next.offsetWidth; next.style.animation = "";
      next.classList.add("is-on");
      layers[front].classList.remove("is-on");
      front = 1 - front;
    }
    function nextBg() {
      if (hd.length < 3) { paint(GRADIENTS[g++ % GRADIENTS.length]); return; }
      var url = hd[i++ % hd.length], img = new Image();
      img.onload = function () { paint("url('" + url + "')"); };   // se cambia cuando ya está cargada
      img.src = url;
    }
    var started = true;
    nextBg();
    if (!reduce) setInterval(function () { if (started) nextBg(); }, 3500);
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
        var img = el("img", { src: d.cover, alt: copy ? "" : d.title, decoding: "async" });
        if (copy) img.setAttribute("loading", "lazy");
        var ph = el("div", { class: "film__ph" }); ph.appendChild(img);
        var sp = el("span"); sp.textContent = d.title;
        a.appendChild(ph); a.appendChild(sp);
        track.appendChild(a);
      });
    });
  }
})();
