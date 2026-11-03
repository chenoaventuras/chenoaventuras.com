/* Mapa interactivo de aventuras (Leaflet alojado en /assets/vendor/leaflet).
   Los datos salen de los posts con lat/lng y los inserta scripts/build-blog.mjs
   en <script type="application/json" id="mapa-data">. */
(function () {
  var el = document.getElementById("mapa");
  var dataEl = document.getElementById("mapa-data");
  if (!el || !dataEl || !window.L) return;

  var posts;
  try { posts = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var COLORS = { Actividades: "#274c78", Pueblos: "#77854f", Spots: "#d9a406", Curiosidades: "#8a5a9e" };
  var NIGHT = "#274c78";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SPAIN = [[35.9, -9.4], [43.9, 4.4]];

  var map = L.map(el, { scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(map);
  // Si la página se abre en una pestaña en segundo plano el mapa mide 0 px: se vuelve a encuadrar al hacerse visible.
  var sizedFit = el.clientWidth > 0;
  map.fitBounds(SPAIN);

  // En pantallas táctiles el mapa no atrapa el dedo: con un dedo se sigue bajando por la página y
  // el mapa se mueve y se amplía con dos dedos (se avisa si intentan moverlo con uno).
  var touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (touch) {
    map.dragging.disable();
    el.classList.add("is-dosdedos");
    var tip = document.createElement("div");
    tip.className = "mapa__tip"; tip.textContent = "Usa dos dedos para mover el mapa";
    tip.setAttribute("aria-hidden", "true");
    el.parentNode.insertBefore(tip, el.nextSibling);
    var tipT = 0, tx0 = 0, ty0 = 0;
    el.addEventListener("touchstart", function (e) { if (e.touches.length === 1) { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; } }, { passive: true });
    el.addEventListener("touchmove", function (e) {
      if (e.touches.length !== 1) return;
      if (Math.abs(e.touches[0].clientX - tx0) + Math.abs(e.touches[0].clientY - ty0) < 24) return;
      tip.classList.add("is-on"); clearTimeout(tipT);
      tipT = setTimeout(function () { tip.classList.remove("is-on"); }, 1600);
    }, { passive: true });
  }

  // La rueda del ratón solo hace zoom tras pulsar en el mapa (no atrapa el scroll de la página).
  map.on("click", function () { map.scrollWheelZoom.enable(); });
  map.on("mouseout", function () { map.scrollWheelZoom.disable(); });

  // Botón «← Todas las zonas» (arriba a la izquierda): quita comunidad y provincia y vuelve a encuadrar toda España.
  map.zoomControl.setPosition("topright");
  var backBtn = null;
  var BackCtl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function () {
      var b = L.DomUtil.create("button", "mapback");
      b.type = "button"; b.hidden = true;
      b.innerHTML = '<span aria-hidden="true">←</span> Todas las zonas';
      L.DomEvent.disableClickPropagation(b);
      L.DomEvent.on(b, "click", function () {
        state.region = ""; state.prov = "";
        if (regionSel) regionSel.value = "";
        fillProv();
        render(false);
        map.fitBounds(SPAIN, { animate: !reduce });
      });
      backBtn = b;
      return b;
    }
  });
  var layer = L.layerGroup().addTo(map);
  var state = { types: [], region: "", prov: "", destino: new URLSearchParams(location.search).get("destino") || "" };
  var noticeEl = document.getElementById("map-notice");
  var countEl = document.getElementById("map-count");
  var regionSel = document.getElementById("map-region");
  var provSel = document.getElementById("map-prov");
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-map-type]"));

  function text(tag, cls, content) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content) n.textContent = content;
    return n;
  }

  function popupFor(items) {
    var wrap = text("div", "mpop");
    items.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "mpop__item" + (items.length === 1 ? " mpop__item--single" : "");
      a.href = p.url;
      if (p.cover) {
        var img = document.createElement("img");
        img.src = p.cover;
        img.alt = "";
        img.loading = "lazy";
        a.appendChild(img);
      }
      var body = text("span", "mpop__body");
      body.appendChild(text("strong", "", p.title));
      body.appendChild(text("small", "", [p.type, p.region].filter(Boolean).join(" · ")));
      if (items.length === 1 && p.excerpt) body.appendChild(text("span", "mpop__excerpt", p.excerpt));
      if (items.length === 1) body.appendChild(text("span", "mpop__cta", "Leer artículo →"));
      a.appendChild(body);
      wrap.appendChild(a);
    });
    var dest = items[0].destino;
    if (dest) {
      var more = document.createElement("a");
      more.className = "mpop__dest";
      more.href = "/destinos/" + dest + ".html";
      more.textContent = "Ver todo sobre " + items[0].destinoNombre + " →";
      wrap.appendChild(more);
    }
    return wrap;
  }

  function iconFor(items) {
    var n = items.length;
    var color = n > 1 ? NIGHT : COLORS[items[0].type] || NIGHT;
    var span = document.createElement("span");
    span.className = "mpin" + (n > 1 ? " mpin--group" : "");
    span.style.setProperty("--c", color);
    span.textContent = n > 1 ? String(n) : "";
    return n > 1
      ? L.divIcon({ className: "mpin-wrap", html: span.outerHTML, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] })
      : L.divIcon({ className: "mpin-wrap", html: span.outerHTML, iconSize: [30, 40], iconAnchor: [15, 38], popupAnchor: [0, -34] });
  }

  function groups(list) {
    var g = {};
    list.forEach(function (p) {
      var k = p.lat.toFixed(2) + "," + p.lng.toFixed(2);
      (g[k] = g[k] || []).push(p);
    });
    return Object.keys(g).map(function (k) { return g[k]; });
  }

  function render(fit) {
    layer.clearLayers();
    var list = posts.filter(function (p) {
      return (!state.types.length || state.types.indexOf(p.type) !== -1) && (!state.region || p.region === state.region) && (!state.prov || p.prov === state.prov) && (!state.destino || p.destino === state.destino);
    });
    var pts = [];
    groups(list).forEach(function (items) {
      var c = items[0];
      var title = items.length === 1 ? c.title : items.length + " artículos en este lugar";
      var m = L.marker([c.lat, c.lng], { icon: iconFor(items), title: title, riseOnHover: true });
      m.bindPopup(function () { return popupFor(items); }, { maxWidth: 300, minWidth: 220 });
      m.addTo(layer);
      pts.push([c.lat, c.lng]);
    });
    if (noticeEl) {
      if (state.destino && list.length) {
        noticeEl.hidden = false;
        noticeEl.textContent = "";
        noticeEl.appendChild(document.createTextNode("Mostrando solo " + list[0].destinoNombre + ". "));
        var all = document.createElement("a");
        all.href = "/mapa.html";
        all.textContent = "Ver todos los lugares";
        noticeEl.appendChild(all);
      } else {
        noticeEl.hidden = true;
      }
    }
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? " lugar" : " lugares");
    if (backBtn) backBtn.hidden = !(state.region || state.prov);
    if (fit) {
      if (!pts.length) return;
      if (!state.types.length && !state.region && !state.prov && !state.destino) map.fitBounds(SPAIN, { animate: !reduce });
      else map.fitBounds(pts, { padding: [50, 50], maxZoom: 11, animate: !reduce });
    }
  }

  chips.forEach(function (b) {
    b.addEventListener("click", function () {
      // cada tipo se marca y desmarca por separado; «Todos» quita la selección
      var t = b.getAttribute("data-map-type") || "";
      if (!t) state.types = [];
      else if (state.types.indexOf(t) !== -1) state.types = state.types.filter(function (x) { return x !== t; });
      else state.types = state.types.concat(t);
      chips.forEach(function (c) {
        var ct = c.getAttribute("data-map-type") || "";
        var on = ct ? state.types.indexOf(ct) !== -1 : !state.types.length;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      render(true);
    });
  });
  // al elegir una comunidad aparece el desplegable de sus provincias (o islas), como en el blog
  var TODO = { "Canarias": "Todas las islas", "Islas Baleares": "Todas las islas", "Aragón": "Todo Aragón", "País Vasco": "Todo el País Vasco" };
  function fillProv() {
    if (!provSel) return;
    var r = state.region, seen = {};
    posts.forEach(function (p) { if (r && p.prov && p.region === r) seen[p.prov] = (seen[p.prov] || 0) + 1; });
    var names = Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, "es"); });
    provSel.innerHTML = "";
    var o0 = document.createElement("option"); o0.value = ""; o0.textContent = TODO[r] || ("Toda " + r); provSel.appendChild(o0);
    names.forEach(function (n) { var o = document.createElement("option"); o.value = n; o.textContent = n; provSel.appendChild(o); });
    provSel.hidden = names.length < 2;
    state.prov = "";
  }
  if (regionSel) {
    regionSel.addEventListener("change", function () {
      state.region = regionSel.value;
      fillProv();
      render(true);
    });
  }
  if (provSel) {
    provSel.addEventListener("change", function () {
      state.prov = provSel.value;
      render(true);
    });
  }
  new BackCtl().addTo(map);
  render(!!state.destino);

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      if (!el.clientWidth) return;
      map.invalidateSize();
      if (!sizedFit && !state.types.length && !state.region && !state.destino) map.fitBounds(SPAIN, { animate: false });
      sizedFit = true;
    }).observe(el);
  }
})();
