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

  // Llegada desde el buscador de escapadas: la página aparece fundiéndose.
  try {
    if (sessionStorage.getItem("chenoFade")) {
      sessionStorage.removeItem("chenoFade");
      document.documentElement.classList.add("cheno-fade");
    }
  } catch (e) {}

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
    "El casco viejo de San Sebastián y su playa de la Concha aparecen cada año entre las mejores playas urbanas del mundo.",
    "Cabo Fisterra, en Galicia, era para los romanos el “finis terrae”: el fin del mundo conocido.",
    "La Tomatina de Buñol (Valencia) lanza cada año unos 120.000 kilos de tomates en poco más de una hora.",
    "Frigiliana (Málaga) es de los pocos lugares de la Europa continental donde todavía se elabora miel de caña.",
    "En Atapuerca (Burgos) se han hallado restos humanos de hasta 1,2 millones de años, entre los más antiguos de Europa.",
    "El Parque Natural de las Sierras de Cazorla, Segura y Las Villas (Jaén) es el espacio protegido más grande de España, con más de 214.000 hectáreas.",
    "Ibiza es una de las pocas declaraciones “mixtas” de la UNESCO: reconoce a la vez su naturaleza y su cultura.",
    "España suma 50 lugares Patrimonio de la Humanidad, la quinta cifra más alta del mundo.",
    "Canarias va una hora por detrás de la península todo el año: comparte huso horario con Portugal y el Reino Unido.",
    "El desierto de Tabernas (Almería) se parece tanto a Marte que la ESA lo usa para probar los róveres que viajarán al planeta rojo.",
    "Las Salinas de Añana (Álava) llevan produciendo sal desde hace más de 7.000 años, una de las salinas en activo más antiguas del mundo.",
    "Úbeda y Baeza (Jaén) comparten un único título de Patrimonio de la Humanidad por su arquitectura renacentista.",
    "El faro de Fisterra marca, para muchos peregrinos, un final simbólico del Camino de Santiago más allá de la propia Compostela.",
    "España tiene la red de tren de alta velocidad más extensa de Europa y la segunda del mundo, solo por detrás de China.",
    "La playa de Rodas, en las Islas Cíes (Galicia), ha sido elegida varias veces mejor playa del mundo por medios internacionales.",
    "Peñíscola (Castellón) ha sido escenario de rodajes tan distintos como “El Cid” y “Juego de Tronos”.",
    "El Parque Nacional de Monfragüe (Cáceres) es uno de los mejores lugares de Europa para ver buitres negros y águilas imperiales en libertad.",
    "Baeza y Úbeda comparten arquitecto: Andrés de Vandelvira firmó buena parte de sus edificios renacentistas.",
    "España es el primer productor mundial de aceite de oliva, con el olivo cultivado en la península desde hace milenios.",
    "La dehesa, con encinas y alcornoques repartidos entre Extremadura, Andalucía y Castilla y León, sostiene la ganadería del cerdo ibérico.",
    "El toro de Osborne, la silueta negra que se ve junto a algunas carreteras, nació en 1956 como cartel publicitario de un brandy.",
    "El Bosque de Secuoyas de Cabezón de la Sal (Cantabria) se plantó en los años 40 con ejemplares traídos de California; hoy supera los 40 metros de altura.",
    "La Laguna de Gallocanta (Aragón) es la mayor laguna salada de interior de España y acoge cada otoño la mayor concentración de grullas migratorias de Europa.",
    "El Torcal de Antequera (Málaga) es uno de los paisajes kársticos más espectaculares de Europa, esculpido por la erosión durante millones de años.",
    "Las Hoces del Río Duratón (Segovia) forman un cañón de más de 20 km y refugian una de las mayores colonias de buitre leonado de España.",
    "El Camino Primitivo, que sale de Oviedo, está considerado el itinerario más antiguo del Camino de Santiago.",
    "Mérida conserva el teatro romano mejor conservado de España, todavía en uso para representaciones cada verano.",
    "El Bosque de Muniellos (Asturias) es una de las masas de robles autóctonos mejor conservadas de Europa, con acceso limitado para protegerlo.",
    "En Sanlúcar de Barrameda (Cádiz) se celebran carreras de caballos sobre la arena de la playa desde el siglo XIX.",
    "Según la tradición, el Monasterio de Santo Toribio de Liébana (Cantabria) guarda el mayor fragmento conocido de la Cruz de Cristo.",
    "El puente de Alcántara, sobre el río Tajo en Cáceres, lleva en pie casi 2.000 años y sigue soportando tráfico.",
    "El Hierro fue, durante siglos, el punto más occidental conocido de Europa y se usó como meridiano cero antes de Greenwich.",
    "Vejer de la Frontera (Cádiz) fue durante siglos un pueblo donde las mujeres salían a la calle cubiertas por completo con un manto negro.",
    "La Ruta del Cares, entre Asturias y León, discurre por una garganta excavada a mano por los canteros en el siglo XX.",
    "El Caminito del Rey (Málaga) pasó de ser considerado la ruta más peligrosa del mundo a una de las más seguras tras su reforma."
  ];

  /* ---------- Efemérides: "un día como hoy" ----------
     Hechos reales con fecha exacta (día y mes), relacionados con viajes,
     naturaleza y patrimonio de España. Si hoy coincide con alguna, sustituye
     a una de las curiosidades del pool general. Todas verificadas.
  ------------------------------------------------------------------- */
  var EFEMERIDES = [
    { m: 1, d: 11, y: 1999, text: "Un día como hoy de 1999 se declaraba el Parque Nacional de Sierra Nevada." },
    { m: 1, d: 22, y: 1954, text: "Un día como hoy de 1954 se creaba el Parque Nacional del Teide, en Tenerife." },
    { m: 3, d: 2, y: 2007, text: "Un día como hoy de 2007 se declaraba el Parque Nacional de Monfragüe, en Cáceres." },
    { m: 3, d: 19, y: 1882, text: "Un día como hoy de 1882 se colocaba la primera piedra de la Sagrada Familia de Barcelona." },
    { m: 3, d: 25, y: 1981, text: "Un día como hoy de 1981 se declaraba el Parque Nacional de Garajonay, en La Gomera." },
    { m: 3, d: 28, y: 2015, text: "Un día como hoy de 2015 reabría el Caminito del Rey (Málaga) tras su reforma." },
    { m: 4, d: 18, y: 2013, text: "Un día como hoy de 2013 se ampliaba la Reserva de la Biosfera de Doñana hasta casi 270.000 hectáreas." },
    { m: 5, d: 9, y: 1984, text: "Un día como hoy de 1984 la Mezquita-Catedral de Córdoba era declarada Patrimonio de la Humanidad." },
    { m: 6, d: 25, y: 2013, text: "Un día como hoy de 2013 se declaraba el Parque Nacional de la Sierra de Guadarrama." },
    { m: 7, d: 1, y: 2002, text: "Un día como hoy de 2002 se declaraba el Parque Nacional de las Islas Atlánticas de Galicia." },
    { m: 7, d: 1, y: 2021, text: "Un día como hoy de 2021 se declaraba el Parque Nacional de la Sierra de las Nieves, en Málaga." },
    { m: 7, d: 22, y: 1918, text: "Un día como hoy de 1918 nacía Covadonga, el primer parque nacional de España." },
    { m: 7, d: 23, y: 2003, text: "Un día como hoy de 2003 los conjuntos renacentistas de Úbeda y Baeza eran declarados Patrimonio de la Humanidad." },
    { m: 8, d: 8, y: 1879, text: "Un día como hoy de 1879 Marcelino Sanz de Sautuola daba a conocer las pinturas de la cueva de Altamira." },
    { m: 8, d: 9, y: 1974, text: "Un día como hoy de 1974 se creaba el Parque Nacional de Timanfaya, en Lanzarote." },
    { m: 8, d: 16, y: 1918, text: "Un día como hoy de 1918 se creaba el Parque Nacional de Ordesa, en el Pirineo aragonés." },
    { m: 9, d: 6, y: 1522, text: "Un día como hoy de 1522 Juan Sebastián Elcano llegaba a Sanlúcar de Barrameda, completando la primera vuelta al mundo." },
    { m: 9, d: 20, y: 1519, text: "Un día como hoy de 1519 la expedición de Magallanes y Elcano zarpaba de Sanlúcar de Barrameda hacia lo desconocido." },
    { m: 10, d: 12, y: 1492, text: "Un día como hoy de 1492 la expedición de Cristóbal Colón avistaba tierra en América." },
    { m: 10, d: 16, y: 1969, text: "Un día como hoy de 1969 se declaraba el Parque Nacional de Doñana." },
    { m: 10, d: 18, y: 1997, text: "Un día como hoy de 1997 abría sus puertas el Museo Guggenheim Bilbao." },
    { m: 10, d: 21, y: 1955, text: "Un día como hoy de 1955 se creaba el Parque Nacional de Aigüestortes i Estany de Sant Maurici, en el Pirineo catalán." },
    { m: 10, d: 23, y: 1987, text: "Un día como hoy de 1987 el Camino de Santiago era declarado primer Itinerario Cultural Europeo." },
    { m: 11, d: 2, y: 1984, text: "Un día como hoy de 1984 la Alhambra y el Generalife de Granada eran declarados Patrimonio de la Humanidad." },
    { m: 11, d: 20, y: 1995, text: "Un día como hoy de 1995 se declaraba el Parque Nacional de Cabañeros, en Castilla-La Mancha." },
    { m: 11, d: 26, y: 1986, text: "Un día como hoy de 1986 Toledo era declarada ciudad Patrimonio de la Humanidad." },
    { m: 12, d: 4, y: 1985, text: "Un día como hoy de 1985 la ciudad vieja de Santiago de Compostela era declarada Patrimonio de la Humanidad." },
    { m: 12, d: 6, y: 1985, text: "Un día como hoy de 1985 Segovia y Ávila eran declaradas Patrimonio de la Humanidad." },
    { m: 12, d: 6, y: 1996, text: "Un día como hoy de 1996 Cuenca era declarada ciudad Patrimonio de la Humanidad." }
  ];

  var bar = document.querySelector("[data-curiosbar]");
  var clock = document.querySelector("[data-curios-clock]");
  if (bar || clock) {
    var out = bar ? bar.querySelector(".curiosbar__text") : null;
    var pool = CURIOSIDADES;
    if (bar) {
      try {
        var fromAttr = bar.getAttribute("data-curiosidades");
        if (fromAttr) {
          var parsed = JSON.parse(fromAttr);
          if (Array.isArray(parsed) && parsed.length) pool = parsed;
        }
      } catch (e) { /* usa el pool por defecto */ }
    }

    // Índice de día LOCAL (mismo criterio que el cronómetro: cambia a medianoche).
    function localDay() {
      var m = new Date(); m.setHours(0, 0, 0, 0);
      return Math.round(m.getTime() / 86400000);
    }
    // Si hoy coincide con alguna efeméride real, la elegimos (determinista si
    // hubiera varias el mismo día) para dejar hueco a las curiosidades del pool.
    function todayEfemeride() {
      var now = new Date();
      var mm = now.getMonth() + 1, dd = now.getDate();
      var matches = [];
      for (var i = 0; i < EFEMERIDES.length; i++) {
        if (EFEMERIDES[i].m === mm && EFEMERIDES[i].d === dd) matches.push(EFEMERIDES[i]);
      }
      if (!matches.length) return null;
      return matches[localDay() % matches.length];
    }
    // Trío del día (determinista a partir de la fecha).
    function pickToday() {
      var day = localDay(), arr = [];
      var efem = todayEfemeride();
      var need = efem ? 2 : 3;
      for (var k = 0; k < Math.min(need, pool.length); k++) {
        arr.push(pool[((day * 3 + k) % pool.length + pool.length) % pool.length]);
      }
      if (efem) arr.unshift(efem.text);
      return arr;
    }

    var today = pickToday();
    var i = 0;
    if (out) {
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

    // Cronómetro hasta las nuevas curiosidades (próxima medianoche local).
    if (clock) {
      var pad = function (n) { return (n < 10 ? "0" : "") + n; };
      var tick = function () {
        var now = new Date();
        var next = new Date(now); next.setHours(24, 0, 0, 0);
        var diff = next - now;
        if (diff <= 0) {                 // ha cambiado el día: nuevo trío
          today = pickToday(); i = 0;
          if (out) out.textContent = today[0];
          diff = 0;
        }
        var s = Math.floor(diff / 1000);
        clock.textContent =
          pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
      };
      tick();
      setInterval(tick, 1000);
    }
  }

  /* ---------- Aparición al hacer scroll ----------
     Elementos con .reveal (bloques) y .reveal--media (imágenes con zoom-out).
     Se puede volver a escanear tras inyectar contenido nuevo (ver Instagram).
  ------------------------------------------------------------------- */
  var REVEAL_SEL = ".reveal, .reveal--media";
  var io = ("IntersectionObserver" in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px 200px 0px", threshold: 0.01 })
    : null;

  function revealScan(root) {
    var els = (root || document).querySelectorAll(REVEAL_SEL);
    if (io) { els.forEach(function (el) { io.observe(el); }); }
    else { els.forEach(function (el) { el.classList.add("is-visible"); }); }
  }
  revealScan(document);
  // Red de seguridad: si el observer no dispara, muestra todo.
  setTimeout(function () {
    document.querySelectorAll(REVEAL_SEL).forEach(function (el) { el.classList.add("is-visible"); });
  }, 3000);

  /* ---------- Últimas publicaciones de Instagram ----------
     Lee assets/data/instagram.json, que actualiza a diario una GitHub Action
     (.github/workflows/instagram.yml). Si no hay datos, se queda el contenido
     de ejemplo que ya está en el HTML.
  ------------------------------------------------------------------- */
  /* ---------- Modal: reproduce el reel/publicación de Instagram sin salir
     de la web (el vídeo lo sirve Instagram, así que las reproducciones
     siguen contando ahí). ---------- */
  var igModal, igModalBox;
  function ensureIgModal() {
    if (igModal) return;
    igModal = document.createElement("div");
    igModal.className = "ig-modal";
    igModal.hidden = true;
    igModal.innerHTML =
      '<button type="button" class="ig-modal__close" aria-label="Cerrar">&times;</button>' +
      '<div class="ig-modal__box"></div>';
    document.body.appendChild(igModal);
    igModalBox = igModal.querySelector(".ig-modal__box");
    igModal.addEventListener("click", function (ev) {
      if (ev.target === igModal) closeIgModal();
    });
    igModal.querySelector(".ig-modal__close").addEventListener("click", closeIgModal);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && igModal && !igModal.hidden) closeIgModal();
    });
  }
  function closeIgModal() {
    if (!igModal) return;
    igModal.hidden = true;
    igModalBox.innerHTML = "";
    document.body.style.overflow = "";
  }
  function openIgModal(permalink) {
    ensureIgModal();
    igModal.hidden = false;
    document.body.style.overflow = "hidden";
    // Construido con el DOM (no innerHTML) para que el permalink, aunque
    // venga de fuera (assets/data/instagram.json), no pueda inyectar HTML.
    igModalBox.innerHTML = "";
    var quote = document.createElement("blockquote");
    quote.className = "instagram-media";
    quote.setAttribute("data-instgrm-captioned", "");
    quote.setAttribute("data-instgrm-permalink", permalink);
    quote.setAttribute("data-instgrm-version", "14");
    quote.style.margin = "0";
    var loading = document.createElement("div");
    loading.className = "ig-modal__loading";
    var link = document.createElement("a");
    link.href = permalink;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Cargando publicación de Instagram…";
    loading.appendChild(link);
    quote.appendChild(loading);
    igModalBox.appendChild(quote);
    function process() {
      if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    }
    if (window.instgrm && window.instgrm.Embeds) {
      process();
    } else {
      var existing = document.getElementById("ig-embed-script");
      if (existing) {
        existing.addEventListener("load", process);
      } else {
        var s = document.createElement("script");
        s.id = "ig-embed-script";
        s.async = true;
        s.src = "https://www.instagram.com/embed.js";
        s.addEventListener("load", process);
        document.body.appendChild(s);
      }
    }
  }

  /* ---------- Enlaces dentro de los posts del blog ----------
     Los reels/publicaciones de Instagram se abren con el mismo modal que
     usa la sección de Aventuras (sin salir de la web), y los de Google Maps
     con un mapa embebido en un modal equivalente. Un enlace con la clase
     "ig-external" (p. ej. el CTA del post del dron) se libra del modal y
     abre Instagram de verdad, tal y como se pide en ese caso concreto.
  ------------------------------------------------------------------- */
  var mapModal, mapModalBox;
  function ensureMapModal() {
    if (mapModal) return;
    mapModal = document.createElement("div");
    mapModal.className = "ig-modal map-modal";
    mapModal.hidden = true;
    mapModal.innerHTML =
      '<button type="button" class="ig-modal__close" aria-label="Cerrar">&times;</button>' +
      '<div class="ig-modal__box"></div>';
    document.body.appendChild(mapModal);
    mapModalBox = mapModal.querySelector(".ig-modal__box");
    mapModal.addEventListener("click", function (ev) {
      if (ev.target === mapModal) closeMapModal();
    });
    mapModal.querySelector(".ig-modal__close").addEventListener("click", closeMapModal);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && mapModal && !mapModal.hidden) closeMapModal();
    });
  }
  function closeMapModal() {
    if (!mapModal) return;
    mapModal.hidden = true;
    mapModalBox.innerHTML = "";
    document.body.style.overflow = "";
  }
  function openMapModal(mapsUrl) {
    ensureMapModal();
    mapModal.hidden = false;
    document.body.style.overflow = "hidden";
    var query = "";
    try { query = new URL(mapsUrl).searchParams.get("query") || ""; } catch (e) { /* URL no válida, sin query */ }
    var embedSrc = "https://www.google.com/maps?q=" + encodeURIComponent(query) + "&output=embed";
    mapModalBox.innerHTML =
      '<iframe src="' + embedSrc + '" class="map-modal__frame" loading="lazy" ' +
      'referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
  }

  var articleLinks = document.querySelectorAll(".article__body a[href]");
  for (var al = 0; al < articleLinks.length; al++) {
    (function (a) {
      var href = a.getAttribute("href") || "";
      if (a.classList.contains("ig-external")) return;
      if (/instagram\.com\/(reel|p)\//.test(href)) {
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          openIgModal(href);
        });
      } else if (/google\.[a-z.]+\/maps/.test(href)) {
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          openMapModal(href);
        });
      }
    })(articleLinks[al]);
  }

  var igWraps = document.querySelectorAll("[data-ig-posts]");
  if (igWraps.length && window.fetch) {
    function igCard(p, firstLineOnly) {
      if (!p || !p.permalink) return null;
      var a = document.createElement("a");
      a.className = "placecard reveal reveal--media";
      a.href = p.permalink;
      a.rel = "noopener";
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        openIgModal(p.permalink);
      });
      var img = document.createElement("img");
      img.src = p.thumb || p.image || "assets/img/blog/cola-de-caballo.webp";
      img.alt = p.caption
        ? p.caption.replace(/\s+/g, " ").slice(0, 100)
        : "Publicación de Chenoaventuras en Instagram";
      if (p.pos) img.style.objectPosition = p.pos;
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 600;
      img.height = 600;
      var body = document.createElement("div");
      body.className = "placecard__body";
      var h3 = document.createElement("h3");
      h3.textContent = p.type === "VIDEO" || p.type === "REEL" ? "Reel" : "Publicación";
      var span = document.createElement("span");
      var caption = "Ver en Instagram";
      if (p.caption) {
        caption = firstLineOnly
          ? p.caption.split("\n")[0].trim()
          : p.caption.replace(/\s+/g, " ").slice(0, 60) + "…";
      }
      span.textContent = caption;
      body.appendChild(h3);
      body.appendChild(span);
      a.appendChild(img);
      a.appendChild(body);
      return a;
    }

    fetch("assets/data/instagram.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var posts = data && Array.isArray(data.posts) ? data.posts : (Array.isArray(data) ? data : null);
        if (!posts || !posts.length) return;
        igWraps.forEach(function (igWrap) {
          // data-ig-posts="all" -> todas las publicaciones (con "Ver más" cargando
          // de "data-ig-step" en "data-ig-step"); si no, solo las 3 últimas.
          var isAll = igWrap.getAttribute("data-ig-posts") === "all";
          var pageSize = isAll ? (Number(igWrap.getAttribute("data-ig-page-size")) || 9) : 4;
          var step = Number(igWrap.getAttribute("data-ig-step")) || 3;
          var moreWrap = igWrap.parentElement ? igWrap.parentElement.querySelector("[data-ig-more-wrap]") : null;
          var moreBtn = moreWrap ? moreWrap.querySelector("[data-ig-more]") : null;
          var shown = 0;
          // "Lo último" (no "all") se salta las marcadas con home:false.
          var list = isAll ? posts : posts.filter(function (p) { return p.home !== false; });

          function renderNext(n) {
            list.slice(shown, shown + n).forEach(function (p) {
              var card = igCard(p, isAll);
              if (card) igWrap.appendChild(card);
            });
            shown = Math.min(shown + n, list.length);
            revealScan(igWrap);
            if (moreWrap) moreWrap.hidden = shown >= list.length;
          }

          igWrap.innerHTML = "";
          renderNext(pageSize);
          if (moreBtn) {
            moreBtn.addEventListener("click", function () { renderNext(step); });
          }
        });
      })
      .catch(function () { /* deja el contenido de ejemplo */ });
  }

  /* ---------- Descarga de guía en PDF a cambio del email ---------- */
  document.querySelectorAll("form[data-guide-source]").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var box = f.closest("[data-guide-box]") || f.parentElement;
      var msg = box.querySelector("[data-guide-msg]");
      var link = box.querySelector("[data-guide-link]");
      var btn = f.querySelector("button[type=submit]");
      var emailInput = f.querySelector('input[type="email"]');
      if (btn) btn.disabled = true;
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput ? emailInput.value : "",
          source: f.getAttribute("data-guide-source") || ""
        }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); })
        .then(function (res) {
          if (msg) { msg.hidden = false; msg.style.color = res.ok ? "" : "#ffb4a9"; }
          if (res.ok) {
            f.hidden = true;
            var legal = box.querySelector(".guidebox__legal");
            if (legal) legal.hidden = true;
            var path = res.json && res.json.guide;
            if (path && link) {
              link.href = path;
              link.hidden = false;
              if (msg) msg.textContent = "¡Listo! Tu guía ya está disponible (también te la he enviado por correo):";
            } else if (msg) {
              msg.textContent = "¡Listo! Te he enviado la guía por correo.";
            }
          } else {
            if (msg) msg.textContent = (res.json && res.json.error) || "No se pudo enviar. Inténtalo de nuevo.";
            if (btn) btn.disabled = false;
          }
        })
        .catch(function () {
          if (msg) { msg.hidden = false; msg.style.color = "#ffb4a9"; msg.textContent = "No se pudo enviar. Inténtalo de nuevo."; }
          if (btn) btn.disabled = false;
        });
    });
  });

  /* ---------- Hero: alterna entre varias fotos cada 5 s ---------- */
  var heroRot = document.querySelector("[data-hero-rotate]");
  var heroReduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroRot && !heroReduce) {
    var heroImgs = [].slice.call(heroRot.querySelectorAll("img"));
    Promise.all(
      heroImgs.map(function (im) {
        return new Promise(function (res) {
          if (im.complete) return res();
          im.addEventListener("load", res, { once: true });
          im.addEventListener("error", res, { once: true });
        });
      })
    ).then(function () {
      // descarta las que no hayan cargado (p. ej. el archivo aún no existe)
      heroImgs.forEach(function (im) {
        if (im.naturalWidth === 0) im.remove();
      });
      var live = heroImgs.filter(function (im) {
        return im.naturalWidth > 0;
      });
      if (live.length < 2) return;
      heroRot.classList.add("js-rotate");
      var idx = 0;
      live[0].classList.add("is-on");
      setInterval(function () {
        live[idx].classList.remove("is-on");
        idx = (idx + 1) % live.length;
        live[idx].classList.add("is-on");
      }, 7000);
    });
  }

  /* ---------- Senderista: ciclo de fotogramas + sigue el corte del papel roto ---------- */
  var hiker = document.querySelector(".hiker");
  var hikerInner = hiker && hiker.querySelector(".hiker__inner");
  if (hiker && hikerInner && !heroReduce) {
    var hFrames = [].slice.call(hikerInner.querySelectorAll("img"));
    if (hFrames.length) {
      var hIdx = 0;
      hFrames[0].classList.add("on");
      setInterval(function () {
        hFrames[hIdx].classList.remove("on");
        hIdx = (hIdx + 1) % hFrames.length;
        hFrames[hIdx].classList.add("on");
      }, 125);
    }

    // Perfil del borde (assets/img/edges/torn-paper.svg), viewBox 1200x34.
    var EDGE = [
      [0, 15], [24, 19], [47, 9], [72, 17], [98, 7], [128, 18], [156, 10],
      [188, 20], [214, 9], [246, 17], [278, 6], [312, 16], [342, 11], [374, 21],
      [404, 9], [436, 17], [470, 7], [500, 18], [532, 8], [566, 17], [598, 6],
      [632, 15], [664, 10], [698, 19], [728, 8], [762, 16], [794, 6], [828, 17],
      [860, 7], [892, 16], [924, 11], [958, 19], [988, 8], [1020, 16], [1052, 6],
      [1086, 17], [1118, 9], [1150, 18], [1178, 10], [1200, 15]
    ];
    var TILE = 1200, VALLEY = 21; // y máximo del perfil = punto más bajo
    function edgeY(px) {
      for (var i = 0; i < EDGE.length - 1; i++) {
        if (px >= EDGE[i][0] && px <= EDGE[i + 1][0]) {
          var t = (px - EDGE[i][0]) / (EDGE[i + 1][0] - EDGE[i][0]);
          return EDGE[i][1] + t * (EDGE[i + 1][1] - EDGE[i][1]);
        }
      }
      return EDGE[EDGE.length - 1][1];
    }
    var heroEl = hiker.parentElement;
    var MARGIN = 120;                 // px fuera de pantalla antes de reaparecer
    var dir = 1;                      // 1 = hacia la derecha, -1 = hacia la izquierda
    var posX = -MARGIN;               // posición horizontal dentro del hero (px)
    var last = null;

    // Al pulsar el senderista, se da la vuelta.
    hiker.addEventListener("click", function () {
      dir = -dir;
    });

    (function follow(ts) {
      var her = heroEl.getBoundingClientRect();
      var heroW = her.width;
      if (last == null) last = ts || 0;
      var dt = Math.min(((ts || 0) - last) / 1000, 0.05); // s, con tope anti-saltos
      last = ts || 0;

      var speed = (heroW + 2 * MARGIN) / 30; // ~30 s de lado a lado, como antes
      posX += dir * speed * dt;
      if (dir > 0 && posX > heroW + MARGIN) posX = -MARGIN;
      else if (dir < 0 && posX < -MARGIN) posX = heroW + MARGIN;
      hiker.style.transform = "translateX(" + posX + "px)";

      // Altura: seguir el corte del papel roto (patrón repeat-x centrado).
      var footX = her.left + posX + hiker.offsetWidth / 2;
      var origin = her.left + heroW / 2 - TILE / 2;
      var px = (((footX - origin) % TILE) + TILE) % TILE;
      var lift = VALLEY - edgeY(px); // 0 en el valle, ~15 en la cresta
      hikerInner.style.transform =
        "translateY(" + -lift + "px) scaleX(" + dir + ")";

      requestAnimationFrame(follow);
    })();
  }

  /* ---------- Secreto: el foco de la imagen de "Equipo con el que viajo" ----------
     Pulsar alterna: normal <-> super encendido. */
  var focoBtn = document.querySelector(".focofx");
  if (focoBtn) {
    var focoBox = focoBtn.closest(".split__media");
    focoBtn.addEventListener("click", function () {
      focoBox.classList.toggle("is-foco-on");
    });
  }

  /* ---------- Año dinámico ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Formularios: contacto (/api/contact) y newsletter (/api/subscribe) ---------- */
  document.querySelectorAll("form[data-demo]").forEach(function (f) {
    var isSubscribe = f.classList.contains("subscribe");
    var endpoint = isSubscribe ? "/api/subscribe" : "/api/contact";
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = f.querySelector("[data-demo-msg]") ||
        (f.parentElement && f.parentElement.querySelector("[data-demo-msg]"));
      var btn = f.querySelector("button[type=submit]");
      var data;
      if (isSubscribe) {
        var emailInput = f.querySelector('input[type="email"]');
        data = { email: emailInput ? emailInput.value : "" };
      } else {
        data = {};
        // campos repetidos (p. ej. varios motivos marcados) se juntan en uno
        new FormData(f).forEach(function (v, k) { data[k] = data[k] ? data[k] + ", " + v : v; });
      }
      if (btn) btn.disabled = true;
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); })
        .then(function (res) {
          if (msg) {
            msg.hidden = false;
            msg.style.color = res.ok ? "" : "#b3261e";
            msg.textContent = res.ok
              ? (isSubscribe ? "¡A la aventura! Ya eres parte de la comunidad." : "¡Mensaje enviado! Te contesto pronto.")
              : "Ha habido un error. Prueba de nuevo o escríbeme a chenoaventuras@gmail.com.";
          }
          if (res.ok) {
            f.reset();
            if (isSubscribe && btn) {
              var originalText = btn.textContent;
              btn.textContent = "¡Listo!";
              btn.classList.remove("btn--light");
              btn.classList.add("btn--gold");
              setTimeout(function () {
                btn.textContent = originalText;
                btn.classList.remove("btn--gold");
                btn.classList.add("btn--light");
                btn.disabled = false;
              }, 5000);
              return; // se queda deshabilitado esos 5 s, ya no hace falta reenviar
            }
          }
          if (btn) btn.disabled = false;
        })
        .catch(function () {
          if (msg) {
            msg.hidden = false;
            msg.style.color = "#b3261e";
            msg.textContent = "Ha habido un error. Prueba de nuevo o escríbeme a chenoaventuras@gmail.com.";
          }
          if (btn) btn.disabled = false;
        });
    });
  });

  /* ---------- Tarjetas de descuento: giro 180º ---------- */
  // En escritorio el giro es por :hover (CSS). En pantallas táctiles, al tocar;
  // y si pasan 10 s sin volver a tocar, se gira sola de vuelta.
  document.querySelectorAll(".dealgrid .deal").forEach(function (d) {
    var flipBackTimer = null;
    d.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) return;
      if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      var flipped = d.classList.toggle("is-flipped");
      clearTimeout(flipBackTimer);
      if (flipped) {
        flipBackTimer = setTimeout(function () {
          d.classList.remove("is-flipped");
        }, 10000);
      }
    });
  });

  /* ---------- Copiar códigos de descuento ---------- */
  // Sonido "cha-ching" de caja registradora (Web Audio, sin archivos).
  var _actx = null;
  function _getCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!_actx) { try { _actx = new AC(); } catch (e) { return null; } }
    return _actx;
  }
  // iOS/Android exigen desbloquear el audio en la primera interacción del usuario.
  ["pointerdown", "touchend", "click"].forEach(function (ev) {
    document.addEventListener(ev, function unlock() {
      var ctx = _getCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
    }, { once: true, passive: true });
  });

  function chaChing() {
    var ctx = _getCtx();
    if (!ctx) return;
    var play = function () {
      try {
        var t0 = ctx.currentTime + 0.02;
        // dos campanitas metálicas (ding-ding)
        [[988, 0], [1319, 0.085]].forEach(function (p) {
          var freq = p[0], t = t0 + p[1];
          var g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.42, t + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
          g.connect(ctx.destination);
          [1, 2.01, 3.03].forEach(function (mult, i) {
            var o = ctx.createOscillator();
            o.type = i === 0 ? "triangle" : "sine";
            o.frequency.value = freq * mult;
            var og = ctx.createGain();
            og.gain.value = i === 0 ? 1 : 0.35 / i;
            o.connect(og); og.connect(g);
            o.start(t); o.stop(t + 0.5);
          });
        });
        // "clic" corto del cajón al principio
        var nb = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        var d = nb.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        var ns = ctx.createBufferSource(); ns.buffer = nb;
        var ng = ctx.createGain(); ng.gain.value = 0.12;
        var flt = ctx.createBiquadFilter(); flt.type = "highpass"; flt.frequency.value = 1500;
        ns.connect(flt); flt.connect(ng); ng.connect(ctx.destination);
        ns.start(t0);
      } catch (e) { /* sin sonido */ }
    };
    if (ctx.state === "suspended") ctx.resume().then(play, function () {});
    else play();
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject();
      } catch (e) { reject(e); }
    });
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  document.querySelectorAll("[data-deal-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var row = btn.closest(".deal__code-row") || btn.parentNode;
      var codeEl = row && row.querySelector("[data-deal-code]");
      if (!codeEl) return;
      chaChing();
      var label = btn.textContent;
      copyText(codeEl.textContent.trim()).then(function () {
        btn.textContent = "¡Copiado!";
        btn.classList.add("is-copied");
      }, function () {
        // último recurso: seleccionar el código para copiarlo a mano
        try {
          var sel = window.getSelection(), r = document.createRange();
          r.selectNodeContents(codeEl); sel.removeAllRanges(); sel.addRange(r);
        } catch (e) {}
        btn.textContent = "Selecciónalo y copia";
      }).then(function () {
        setTimeout(function () {
          btn.textContent = label;
          btn.classList.remove("is-copied");
        }, 1900);
      });
    });
  });

  /* ---------- Aviso de cookies ----------
     Sin analítica ni publicidad: el único aviso real es que, al reproducir
     un reel desde la web (ver modal de Instagram más arriba), Instagram
     puede guardar sus propias cookies. El resto (tema del 404, mejor
     puntuación del minijuego) es almacenamiento necesario, sin aviso legal. */
  (function () {
    var KEY = "cheno-cookies-ok";
    try {
      if (localStorage.getItem(KEY)) return;
    } catch (e) {}
    var bar = document.createElement("div");
    bar.className = "cookiebar";
    bar.innerHTML =
      '<div class="cookiebar__media">' +
      '<img class="cookiebar__img" src="/assets/img/cookies.webp" width="1787" height="419" alt="Una ruta con cookies es mejor. Solo se guardará tu puntuación si juegas al minijuego." />' +
      '<button type="button" class="cookiebar__cta btn" data-cookie-ok>¡Entendido!</button>' +
      '</div>' +
      '<p class="cookiebar__links">Más información: <a href="/politica-cookies.html">política de cookies</a> · <a href="/politica-privacidad.html">política de privacidad</a></p>';
    document.body.appendChild(bar);
    bar.querySelector("[data-cookie-ok]").addEventListener("click", function () {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      bar.remove();
    });
  })();
})();

/* ---------- Volver al post anterior ----------
   Si llegas a un post desde otro post del blog (p. ej. de «Qué ver en Tenerife» al Arco de Tajao),
   el enlace «← Blog» pasa a «← Volver a Tenerife» y aparece un botón flotante al bajar.
   Usa el «atrás» del navegador para volver al mismo punto de la página. */
(function () {
  var art = document.querySelector("article[data-post]");
  if (!art) return;
  var KEY = "chenoPrevPost";
  var prev = null;
  try { prev = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
  try { sessionStorage.setItem(KEY, JSON.stringify({ url: location.pathname, title: art.getAttribute("data-post") })); } catch (e) {}

  var ref = null;
  try { ref = document.referrer ? new URL(document.referrer) : null; } catch (e) {}
  var norm = function (u) { return u.replace(/\.html$/, "").replace(/\/$/, ""); };
  if (!prev || !ref || ref.origin !== location.origin) return;
  if (norm(ref.pathname) !== norm(prev.url) || norm(prev.url) === norm(location.pathname)) return;

  var label = "Volver a " + prev.title;
  var goBack = function (ev) {
    if (history.length > 1) { ev.preventDefault(); history.back(); }
  };
  var top = document.querySelector("[data-back-link]");
  if (top) {
    top.href = prev.url;
    top.textContent = "← " + label;
    top.classList.add("article__back");
    top.addEventListener("click", goBack);
  }
  var fab = document.createElement("a");
  fab.className = "backfab";
  fab.href = prev.url;
  fab.innerHTML = '<span aria-hidden="true">←</span> ' + label.replace(/[<>&]/g, "");
  fab.addEventListener("click", goBack);
  document.body.appendChild(fab);
  var onScroll = function () { fab.classList.toggle("is-visible", window.scrollY > 500); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ---------- Portada: buscador de escapadas ----------
   La ilustración de Cheno en su escritorio: al elegir zona, la cámara entra en la pantalla
   y el mapa (assets/data/mapa-espana.svg) se acerca a la zona; fuera de España, un avión
   vuela desde Madrid. «Ver planes» lleva al blog filtrado con un zoom a la pantalla.
   Datos: assets/data/zonas.json (lo genera scripts/build-blog.mjs). */
(async function () {
  const TODO = { Canarias: "Todas las islas", "Islas Baleares": "Todas las islas", "Aragón": "Todo Aragón", "País Vasco": "Todo el País Vasco" };
  const box = document.querySelector("[data-esc]");
  if (!box || !window.fetch) return;
  const [z, svg] = await Promise.all([fetch("/assets/data/zonas.json", { cache: "no-cache" }).then(r => r.json()), fetch("/assets/data/mapa-espana.svg?v=2").then(r => r.text())]);
  box.querySelector("[data-map]").innerHTML = svg;
  const map = box.querySelector("svg.esmap"), cam = box.querySelector("[data-cam]"), screen = box.querySelector("[data-screen]"), stage = box.querySelector(".esc__stage");
  const zs = box.querySelector("[data-zona]"), ps = box.querySelector("[data-prov]");
  const ts = box.querySelector("[data-tipo]");
  const count = box.querySelector("[data-count]"), go = box.querySelector("[data-go]"), tag = box.querySelector("[data-tag]");
  zs.innerHTML = '<option value="">Cualquier zona</option>' + z.zonas.map((x) => `<option value="${x.v}">${x.l || x.v}</option>`).join("");
  if (ts) ts.innerHTML = '<option value="">De todo</option>' + (z.tipos || []).map((x) => `<option value="${x.v}">${x.v} (${x.n})</option>`).join("");
  function fillProv() {
    const zona = z.zonas.find((x) => x.v === zs.value);
    ps.innerHTML = zona ? `<option value="">${TODO[zona.v] || "Toda " + (zona.l || zona.v)}</option>` + zona.provs.map((p) => `<option value="${p.v}">${p.v} (${p.n})</option>`).join("") : '<option value="">Elige antes la zona</option>';
    ps.disabled = !zona || zona.provs.length < 2;
  }
  // Cámara: en reposo centra el escritorio; con zona elegida, la pantalla llena el escenario.
  function camera(zoom) {
    const W = stage.clientWidth, H = stage.clientHeight, side = Math.round(Math.min(W * 0.95, H * 1.08, 620));
    cam.style.width = cam.style.height = side + "px";
    const cw = side, ch = side;
    // En reposo, las botas quedan apoyadas cerca del borde inferior, con algo de sombra (87,5 % de la ilustración).
    if (!zoom) { cam.style.transform = `translate(${-cw / 2}px, ${H / 2 - ch * 0.875}px) scale(1)`; return; }
    const sx = screen.offsetLeft, sy = screen.offsetTop, sw = screen.offsetWidth, sh = screen.offsetHeight;
    const s = Math.min(W * 0.96 / sw, H * 0.96 / sh);
    // la cámara está anclada en el centro del escenario: llevamos el centro de la pantalla allí
    const tx = -(sx + sw / 2) * s, ty = -(sy + sh / 2) * s;
    cam.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }
  // El mapa se acerca animando su viewBox, con la misma duración y curva que la cámara.
  // Encaje: el mapa entero centrado en la pantalla del ordenador, con el mismo margen por todos lados.
  const glass = box.querySelector("[data-glass]");
  const ratio = () => glass.offsetWidth / glass.offsetHeight || 1.5;
  function fit(x0, y0, x1, y1, pad) {
    let w = (x1 - x0) * pad, h = (y1 - y0) * pad, r = ratio();
    if (w / h > r) h = w / r; else w = h * r;
    return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
  }
  // Encaje inicial: solo España (no los países vecinos de fondo).
  const all = (() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; map.querySelectorAll("path[data-c]").forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); }); return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }; })();
  const FULL = () => fit(all.x, all.y, all.x + all.width, all.y + all.height, 1.32);
  let vb = FULL(), anim = 0;
  map.setAttribute("viewBox", vb.join(" "));
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function zoomBox(x0, y0, x1, y1) { animarVB(fit(x0, y0, x1, y1, 1)); }
  function zoomMap(paths) {
    let to = FULL();
    if (paths.length) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      paths.forEach((p) => { const b = p.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max(x1 - x0, 90) / 2, hh = Math.max(y1 - y0, 72) / 2;
      to = fit(cx - hw, cy - hh, cx + hw, cy + hh, 1.6);
    }
    animarVB(to);
  }
  function animarVB(to) {
    const from = vb.slice(), t0 = performance.now(), id = ++anim;
    (function frame(now) {
      if (id !== anim) return;
      const t = Math.min(1, (now - t0) / 1300), e = ease(t);
      vb = from.map((v, i) => v + (to[i] - v) * e);
      map.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" "));
      if (t < 1) requestAnimationFrame(frame);
    })(t0);
  }
  // Proyección aproximada (lat/lng → mapa) guardada en el SVG.
  const PX = map.dataset.px.split(",").map(Number), PY = map.dataset.py.split(",").map(Number);
  const proj = (la, ln) => { const f = [1, ln, la, ln * ln, la * la, ln * la]; return [f.reduce((a, v, i) => a + v * PX[i], 0), f.reduce((a, v, i) => a + v * PY[i], 0)]; };
  const NS = "http://www.w3.org/2000/svg";
  let vuelo = null;
  function volar(zona) {
    map.querySelectorAll(".ruta,.avion,.destino").forEach((n) => n.remove());
    cancelAnimationFrame(vuelo);
    if (!zona || !zona.ext) return null;
    const [x0, y0] = proj(40.42, -3.7); // Madrid
    let [x1, y1] = proj(zona.ext.lat, zona.ext.lng);
    const lejos = zona.ext.lat < 20 || zona.ext.lat > 50 || zona.ext.lng < -25 || zona.ext.lng > 20;
    if (lejos) { // muy lejos: el avión sale por el borde en esa dirección
      const ang = Math.atan2(-(zona.ext.lat - 40.42), zona.ext.lng + 3.7);
      x1 = x0 + Math.cos(ang) * 900; y1 = y0 + Math.sin(ang) * 900;
    }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, len = Math.hypot(x1 - x0, y1 - y0);
    const cx = mx + (y1 - y0) * 0.25, cy = my - (x1 - x0) * 0.25 - len * 0.1;
    const ruta = document.createElementNS(NS, "path");
    ruta.setAttribute("class", "ruta");
    map.appendChild(ruta);
    // Punto y tramo de la curva hasta t (de Casteljau), para que la estela vaya apareciendo tras el avión.
    const B = (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
    const tramo = (t) => { const qx = x0 + (cx - x0) * t, qy = y0 + (cy - y0) * t, [ex, ey] = B(t); return `M${x0} ${y0} Q${qx} ${qy} ${ex} ${ey}`; };
    const avion = document.createElementNS(NS, "path");
    avion.setAttribute("class", "avion");
    avion.setAttribute("d", "M14 0 L4 -2 L-2 -10 L-5 -10 L-1 -2 L-8 -1.5 L-11 -5 L-13 -5 L-11 0 L-13 5 L-11 5 L-8 1.5 L-1 2 L-5 10 L-2 10 L4 2 Z");
    map.appendChild(avion);
    const k = Math.max(len, 300) / 150;
    let dest = null;
    if (!lejos) {
      dest = document.createElementNS(NS, "g"); dest.setAttribute("class", "destino"); dest.style.opacity = 0;
      dest.innerHTML = `<circle cx="${x1}" cy="${y1}" r="9"/><text x="${x1 + 14}" y="${y1 + 8}">${zona.l || zona.v}</text>`;
      map.appendChild(dest);
    }
    const t0 = performance.now() + 900, D = 1800;
    (function frame(now) {
      const t = Math.max(0, Math.min(1, (now - t0) / D)), e = ease(t);
      ruta.setAttribute("d", tramo(e));
      const [px, py] = B(e), [qx, qy] = B(Math.min(1, e + .01));
      const a = Math.atan2(qy - py, qx - px) * 180 / Math.PI;
      avion.setAttribute("transform", `translate(${px} ${py}) rotate(${a}) scale(${k})`);
      if (t >= 1 && dest) dest.style.transition = "opacity .5s", dest.style.opacity = 1;
      if (t < 1) vuelo = requestAnimationFrame(frame);
    })(performance.now());
    return lejos ? [x0, y0, x0, y0] : [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
  }
  function paint() {
    const c = zs.value, p = ps.value;
    map.classList.toggle("has-sel", !!c);
    const sel = [];
    map.querySelectorAll("path[data-c]").forEach((el) => {
      const isC = el.dataset.c === c, isP = !!p && el.dataset.p === p;
      el.classList.toggle("is-c", isC && !isP); el.classList.toggle("is-p", isP);
      if (isP || (isC && !p)) sel.push(el);
    });
    map.querySelectorAll("path[data-pais]").forEach((el) => el.classList.toggle("is-c", el.dataset.pais === c));
    const zona = z.zonas.find((x) => x.v === c);
    const n = !zona ? z.total : p ? (zona.provs.find((x) => x.v === p) || {}).n : zona.n;
    const name = p || (zona ? zona.l || zona.v : "España");
    count.innerHTML = `<b>${n}</b> planes en ${name}`;
    tag.textContent = "📍 " + name; tag.classList.toggle("on", !!c);
    const qs = new URLSearchParams(); if (c) qs.set("comunidad", c); if (p) qs.set("provincia", p); if (ts && ts.value) qs.set("tipo", ts.value);
    go.href = "/blog" + (qs.toString() ? "?" + qs : "");
    box.classList.toggle("zoom", !!c);
    camera(!!c);
    map.classList.toggle("ext", !!(zona && zona.ext));
    const caja = volar(zona);
    if (caja) { // destino de fuera: encuadre que incluye Madrid y el destino
      const [a, b, cc, d] = caja, ex = Math.max(cc - a, 200) * .3, ey = Math.max(d - b, 160) * .3;
      zoomBox(a - ex, b - ey, cc + ex, d + ey);
    } else zoomMap(sel);
  }
  // Cada vez que eliges algo, Cheno teclea.
  const mano = box.querySelector("[data-mano]");
  const teclear = () => { if (!mano) return; mano.classList.remove("tecleo"); void mano.offsetWidth; mano.classList.add("tecleo"); };
  zs.addEventListener("change", () => { teclear(); fillProv(); paint(); });
  ps.addEventListener("change", () => { teclear(); paint(); });
  if (ts) ts.addEventListener("change", () => { teclear(); paint(); });
  map.addEventListener("click", (e) => {
    const el = e.target.closest("path[data-c]"); if (!el) return;
    const zona = z.zonas.find((x) => x.v === el.dataset.c); if (!zona) return;
    if (zs.value === zona.v && zona.provs.some((p) => p.v === el.dataset.p)) ps.value = el.dataset.p;
    else { zs.value = zona.v; fillProv(); }
    paint();
  });
  box.querySelector("[data-back]").addEventListener("click", () => { zs.value = ""; fillProv(); paint(); });
  window.addEventListener("resize", () => camera(!!zs.value));
  // Si la caja cambia de alto (fuentes o fotos que terminan de cargar), se recoloca la escena.
  if (window.ResizeObserver) new ResizeObserver(() => { const t = cam.style.transition; cam.style.transition = "none"; camera(!!zs.value); cam.offsetWidth; cam.style.transition = t; }).observe(stage);
  // «Ver planes»: la cámara entra del todo en la pantalla y se funde con la página siguiente.
  const veil = document.createElement("div"); veil.className = "esc-veil"; document.body.appendChild(veil);
  go.addEventListener("click", (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    teclear();
    const href = go.href;
    if (!zs.value) { box.classList.add("zoom"); camera(true); }
    const r = screen.getBoundingClientRect();
    const k = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.15;
    setTimeout(() => {
      stage.style.overflow = "visible"; box.style.overflow = "visible"; box.style.zIndex = 50;
      const form = box.querySelector(".esc__form"); form.style.transition = "opacity .3s"; form.style.opacity = 0; stage.style.zIndex = 3;
      const sr = screen.getBoundingClientRect(), dx = innerWidth / 2 - (sr.left + sr.width / 2), dy = innerHeight / 2 - (sr.top + sr.height / 2);
      stage.style.transition = "transform .9s cubic-bezier(.65,0,.25,1)";
      stage.style.transformOrigin = `${sr.left + sr.width / 2 - stage.getBoundingClientRect().left}px ${sr.top + sr.height / 2 - stage.getBoundingClientRect().top}px`;
      stage.style.transform = `translate(${dx}px, ${dy}px) scale(${Math.max(innerWidth / sr.width, innerHeight / sr.height) * 1.1})`;
      setTimeout(() => veil.classList.add("on"), 550);
      setTimeout(() => { try { sessionStorage.setItem("chenoFade", "1"); } catch (e) {} location.href = href; }, 1000);
    }, zs.value ? 0 : 1300);
  });
  window.addEventListener("pageshow", (ev) => { if (!ev.persisted) return; veil.classList.remove("on"); stage.style.transform = ""; stage.style.transition = ""; box.querySelector(".esc__form").style.opacity = ""; });
  cam.style.transition = "none"; fillProv(); paint(); cam.offsetWidth; cam.style.transition = "";

  // Dibujos de fondo
  const dibs = [...box.querySelectorAll(".dibujos img")], dn = box.querySelector("[data-dib-name]");
  let k = 0;
  function nextDib() { dibs.forEach((d, i) => d.classList.toggle("on", i === k)); dn.textContent = dibs[k].dataset.name; k = (k + 1) % dibs.length; }
  dibs.forEach((d) => (d.loading = "eager"));
  nextDib(); setInterval(nextDib, 5000);
})();

/* ---------- Portada: profundidad al bajar (parallax) ---------- */
(function () {
  var hero = document.querySelector("[data-parallax]");
  if (!hero || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
  var media = hero.querySelector(".hero__media");
  var inner = hero.querySelector(".hero__inner");
  var ticking = false;
  function update() {
    ticking = false;
    var h = hero.offsetHeight || 1;
    var y = Math.min(window.scrollY, h);
    // Se mueven las fotos, no su contenedor: así el borde de acuarela (máscara del contenedor) se queda quieto.
    if (media) {
      media.style.setProperty("--py", (y * 0.4).toFixed(1) + "px");
      media.style.setProperty("--ps", (1 + y / h * 0.08).toFixed(3));
    }
    if (inner) {
      inner.style.transform = "translate3d(0," + (y * 0.15).toFixed(1) + "px,0)";
      inner.style.opacity = Math.max(0, 1 - y / (h * 0.75)).toFixed(3);
    }
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ---------- Contacto: carné de piloto colgando de una cinta ----------
   Cuerda con física sencilla (verlet): se arrastra, rebota y con un clic se da la vuelta. */
(function () {
  const root = document.querySelector("[data-lan]");
  if (!root) return;
  const card = root.querySelector("[data-card]"), path = root.querySelector("#strapPath");
  // Cinta corta; en el móvil, más corta todavía y el carné más pequeño.
  const movil = window.matchMedia("(max-width: 760px)").matches;
  const N = movil ? 5 : 6, SEG = movil ? 17 : 24, SC = movil ? .72 : 1, G = 0.6, DAMP = 0.985;
  let W = root.clientWidth, ax = W / 2, ay = 22;
  const hook = root.querySelector("[data-hook]"), pin = root.querySelector("[data-hook-pin]");
  const pts = Array.from({ length: N }, (_, i) => ({ x: ax + i * 3, y: ay + i * SEG, px: ax + i * 3 - 6, py: ay + i * SEG }));
  let drag = null, angle = 0, av = 0, moved = 0;
  function step() {
    W = root.clientWidth; ax = W / 2;
    for (let i = 1; i < N; i++) {
      const p = pts[i];
      if (drag && i === N - 1) { p.px = p.x; p.py = p.y; p.x += (drag.x - p.x) * .5; p.y += (drag.y - p.y) * .5; continue; }
      const vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G;
    }
    pts[0].x = ax; pts[0].y = ay;
    for (let it = 0; it < 12; it++) {
      for (let i = 0; i < N - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - SEG) / d;
        if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; }
        else if (drag && i + 1 === N - 1) { a.x += dx * diff; a.y += dy * diff; }
        else { a.x += dx * diff * .5; a.y += dy * diff * .5; b.x -= dx * diff * .5; b.y -= dy * diff * .5; }
      }
      pts[0].x = ax; pts[0].y = ay;
    }
    const e = pts[N - 1], q = pts[N - 2];
    const target = Math.atan2(e.x - q.x, e.y - q.y) * -1;
    av = av * 0.86 + (target - angle) * 0.12; angle += av;
    const vx = e.x - e.px;
    card.style.transform = `translate(${e.x - 110}px, ${e.y - 8 * SC}px) rotate(${angle}rad) scale(${SC}) rotateY(${Math.max(-35, Math.min(35, vx * 2.2))}deg)`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < N - 1; i++) { const m = pts[i], n = pts[i + 1]; d += ` Q ${m.x} ${m.y} ${(m.x + n.x) / 2} ${(m.y + n.y) / 2}`; }
    d += ` L ${e.x} ${e.y}`;
    path.setAttribute("d", d);
    if (hook) { hook.setAttribute("cx", ax); hook.setAttribute("cy", ay - 4); pin.setAttribute("x", ax - 3); pin.setAttribute("y", ay - 28); }
    requestAnimationFrame(step);
  }
  function pos(ev) { const r = root.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top + 8 * SC }; }
  card.addEventListener("pointerdown", (ev) => { drag = pos(ev); moved = 0; card.setPointerCapture(ev.pointerId); });
  card.addEventListener("pointermove", (ev) => { if (!drag) return; const p = pos(ev); moved += Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y); drag = p; });
  card.addEventListener("pointerup", () => { if (moved < 6) card.classList.toggle("flip"); drag = null; });
  // Si se pierde el puntero (sale de la ventana, cambia de pestaña…), se suelta el carné.
  ["pointercancel", "lostpointercapture"].forEach((t) => card.addEventListener(t, () => { drag = null; }));
  window.addEventListener("blur", () => { drag = null; });
  requestAnimationFrame(step);
})();
