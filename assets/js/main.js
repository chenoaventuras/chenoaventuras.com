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
      img.src = p.image || "assets/img/blog/cola-de-caballo.webp";
      img.alt = p.caption
        ? p.caption.replace(/\s+/g, " ").slice(0, 100)
        : "Publicación de Chenoaventuras en Instagram";
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

          function renderNext(n) {
            posts.slice(shown, shown + n).forEach(function (p) {
              var card = igCard(p, isAll);
              if (card) igWrap.appendChild(card);
            });
            shown = Math.min(shown + n, posts.length);
            revealScan(igWrap);
            if (moreWrap) moreWrap.hidden = shown >= posts.length;
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
        new FormData(f).forEach(function (v, k) { data[k] = v; });
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
      '<img class="cookiebar__img" src="/assets/img/cookies.webp" alt="Una ruta con cookies es mejor. Solo se guardará tu puntuación si juegas al minijuego." />' +
      '<button type="button" class="cookiebar__cta btn" data-cookie-ok>¡Entendido!</button>' +
      '</div>';
    document.body.appendChild(bar);
    bar.querySelector("[data-cookie-ok]").addEventListener("click", function () {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      bar.remove();
    });
  })();
})();
