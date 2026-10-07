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
  map.fitBounds(SPAIN);

  // La rueda del ratón solo hace zoom tras pulsar en el mapa (no atrapa el scroll de la página).
  map.on("click", function () { map.scrollWheelZoom.enable(); });
  map.on("mouseout", function () { map.scrollWheelZoom.disable(); });

  var layer = L.layerGroup().addTo(map);
  var state = { type: "", region: "", destino: new URLSearchParams(location.search).get("destino") || "" };
  var noticeEl = document.getElementById("map-notice");
  var countEl = document.getElementById("map-count");
  var regionSel = document.getElementById("map-region");
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-map-type]"));
  var goBtns = Array.prototype.slice.call(document.querySelectorAll("[data-map-go]"));

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
      return (!state.type || p.type === state.type) && (!state.region || p.region === state.region) && (!state.destino || p.destino === state.destino);
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
    if (fit) {
      if (!pts.length) return;
      if (!state.type && !state.region && !state.destino) map.fitBounds(SPAIN, { animate: !reduce });
      else map.fitBounds(pts, { padding: [50, 50], maxZoom: 11, animate: !reduce });
    }
  }

  chips.forEach(function (b) {
    b.addEventListener("click", function () {
      state.type = b.getAttribute("data-map-type") || "";
      chips.forEach(function (c) { c.classList.toggle("is-active", c === b); });
      render(true);
    });
  });
  if (regionSel) {
    regionSel.addEventListener("change", function () {
      state.region = regionSel.value;
      render(true);
    });
  }
  var JUMPS = { canarias: { c: [28.3, -16.3], z: 8 }, marruecos: { c: [31.4, -8.2], z: 6 } };
  goBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var j = JUMPS[b.getAttribute("data-map-go")];
      if (!j) return;
      state.type = "";
      state.region = "";
      if (regionSel) regionSel.value = "";
      chips.forEach(function (c) { c.classList.toggle("is-active", !c.getAttribute("data-map-type")); });
      render(false);
      if (reduce) map.setView(j.c, j.z); else map.flyTo(j.c, j.z, { duration: 1.1 });
    });
  });

  render(!!state.destino);
})();
