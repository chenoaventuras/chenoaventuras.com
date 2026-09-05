/* =========================================================================
   CHENO AVENTURAS — JS global
   - Menú responsive
   - Barra "¿Sabías que…?": 3 curiosidades que cambian cada día
   - Últimas publicaciones de Instagram (assets/data/instagram.json)
   - Animación de aparición al hacer scroll
   - Año dinámico y formularios de demostración
   ========================================================================= */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------- Menú móvil ---------- */
  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
  }

  /* ---------- Curiosidades del hero ----------
     Cada día se muestran 3 curiosidades distintas, elegidas de forma
     determinista a partir de la fecha (mismo trío para todo el mundo ese día).
     La barra va alternando entre esas 3.
     Para añadir/editar: toca CURIOSIDADES abajo. Temas: ciudades españolas,
     cultura, fauna, pueblos, demografía... nunca nada ofensivo.
  ------------------------------------------------------------------- */
  var CURIOSIDADES = [
    "España es el país del mundo con más Reservas de la Biosfera de la UNESCO: más de 50.",
    "El Teide (3.715 m) es el pico más alto de España y el tercer mayor volcán del planeta medido desde su base.",
    "El acueducto de Segovia se levantó hace casi 2.000 años solo con encaje de sillares, sin argamasa.",
    "En España se hablan cuatro lenguas oficiales: castellano, catalán, gallego y euskera (más el aranés en su valle).",
    "El lince ibérico pasó de unos 100 ejemplares en 2002 a más de 2.000 dos décadas después.",
    "Doñana es uno de los mayores humedales de Europa y zona de paso de millones de aves migratorias.",
    "Setenil de las Bodegas (Cádiz) tiene calles enteras de casas construidas bajo la roca del desfiladero.",
    "La Alhambra de Granada es el monumento más visitado de España, con más de 2,7 millones de visitas al año.",
    "Almería alberga el único desierto de Europa continental, Tabernas, donde se rodaron cientos de wésterns.",
    "El quebrantahuesos es la única ave que se alimenta casi solo de huesos: los rompe dejándolos caer al vuelo.",
    "Las Casas Colgadas de Cuenca se asoman al vacío sobre la hoz del río Huécar.",
    "Las Médulas (León) son el paisaje que dejó la mayor mina de oro a cielo abierto del Imperio Romano.",
    "El buitre leonado casi desapareció de Europa; hoy España acoge alrededor del 90 % de la población europea.",
    "Ronda (Málaga) está partida por un tajo de más de 100 m que se cruza por el Puente Nuevo.",
    "El oso pardo cantábrico ronda ya los 370 ejemplares tras rozar la extinción en los años 90.",
    "La palabra “siesta” viene del latín “hora sexta”: el mediodía, cuando el calor obligaba a parar.",
    "El Guadalquivir es el único gran río navegable de España: los barcos llegan hasta Sevilla, a 80 km del mar.",
    "España tiene más de 8.100 municipios, y en más de la mitad viven menos de 1.000 personas.",
    "Una de cada tres personas en España vive en Andalucía o en Cataluña.",
    "Trevélez (Granada), a casi 1.500 m, es uno de los municipios más altos de la España peninsular.",
    "La Rioja tiene miles de huellas de dinosaurio repartidas por más de un centenar de yacimientos.",
    "El flamenco fue declarado Patrimonio Cultural Inmaterial de la Humanidad por la UNESCO en 2010.",
    "Genalguacil (Málaga) es un museo al aire libre: casi cada casa del pueblo expone obras de arte.",
    "Albarracín (Teruel) conserva abrigos con arte rupestre de miles de años, Patrimonio de la Humanidad.",
    "La cueva de Altamira (Cantabria) guarda pinturas de bisontes de hace más de 20.000 años.",
    "La sabina de El Hierro crece doblada hasta tocar el suelo por la fuerza constante del viento alisio.",
    "Madrid es una de las capitales más altas de Europa: está a unos 650 m sobre el nivel del mar.",
    "España suma unos 8.000 km de costa y más de 3.500 playas.",
    "El Camino de Santiago no es uno: son decenas de rutas; la Francesa recorre unos 770 km.",
    "Muchos pueblos del interior nacieron alrededor de un balneario y su “agua milagrosa”.",
    "La red “Los Pueblos más Bonitos de España” reúne más de un centenar de localidades de toda la península e islas.",
    "El casco viejo de San Sebastián y su playa de la Concha aparecen cada año entre las mejores playas urbanas del mundo."
  ];

  var bar = document.querySelector("[data-curiosbar]");
  if (bar) {
    var out = bar.querySelector(".curiosbar__text");
    var pool = CURIOSIDADES;
    try {
      var fromAttr = bar.getAttribute("data-curiosidades");
      if (fromAttr) {
        var parsed = JSON.parse(fromAttr);
        if (Array.isArray(parsed) && parsed.length) pool = parsed;
      }
    } catch (e) { /* usa el pool por defecto */ }

    // Trío del día (determinista)
    var day = Math.floor(Date.now() / 86400000);
    var today = [];
    for (var k = 0; k < Math.min(3, pool.length); k++) {
      today.push(pool[((day * 3 + k) % pool.length + pool.length) % pool.length]);
    }

    var i = 0;
    out.textContent = today[0];
    if (today.length > 1) {
      setInterval(function () {
        out.classList.add("is-fading");
        setTimeout(function () {
          i = (i + 1) % today.length;
          out.textContent = today[i];
          out.classList.remove("is-fading");
        }, 400);
      }, 6000);
    }
  }

  /* ---------- Últimas publicaciones de Instagram ----------
     Lee assets/data/instagram.json, que actualiza a diario una GitHub Action
     (.github/workflows/instagram.yml). Si no hay datos, se queda el contenido
     de ejemplo que ya está en el HTML.
  ------------------------------------------------------------------- */
  var igWrap = document.querySelector("[data-ig-posts]");
  if (igWrap && window.fetch) {
    fetch("assets/data/instagram.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var posts = data && Array.isArray(data.posts) ? data.posts : (Array.isArray(data) ? data : null);
        if (!posts || !posts.length) return;
        igWrap.innerHTML = "";
        posts.slice(0, 3).forEach(function (p) {
          if (!p || !p.permalink) return;
          var a = document.createElement("a");
          a.className = "placecard reveal is-visible";
          a.href = p.permalink;
          a.target = "_blank";
          a.rel = "noopener";
          var img = document.createElement("img");
          img.src = p.image || "assets/img/blog/cola-de-caballo.jpg";
          img.alt = "";
          img.loading = "lazy";
          var body = document.createElement("div");
          body.className = "placecard__body";
          var h3 = document.createElement("h3");
          h3.textContent = p.type === "VIDEO" || p.type === "REEL" ? "Reel" : "Publicación";
          var span = document.createElement("span");
          span.textContent = (p.caption ? p.caption.replace(/\s+/g, " ").slice(0, 60) + "…" : "Ver en Instagram");
          body.appendChild(h3);
          body.appendChild(span);
          a.appendChild(img);
          a.appendChild(body);
          igWrap.appendChild(a);
        });
      })
      .catch(function () { /* deja el contenido de ejemplo */ });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px 240px 0px", threshold: 0.01 });
    reveals.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }, 2500);
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Año dinámico ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Formularios de demostración (sin backend todavía) ---------- */
  document.querySelectorAll("form[data-demo]").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = f.querySelector("[data-demo-msg]");
      if (msg) { msg.hidden = false; }
      f.reset();
    });
  });
})();
