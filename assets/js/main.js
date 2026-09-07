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
    // Trío del día (determinista a partir de la fecha).
    function pickToday() {
      var day = localDay(), arr = [];
      for (var k = 0; k < Math.min(3, pool.length); k++) {
        arr.push(pool[((day * 3 + k) % pool.length + pool.length) % pool.length]);
      }
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
          a.className = "placecard reveal reveal--media";
          a.href = p.permalink;
          a.target = "_blank";
          a.rel = "noopener";
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
          span.textContent = (p.caption ? p.caption.replace(/\s+/g, " ").slice(0, 60) + "…" : "Ver en Instagram");
          body.appendChild(h3);
          body.appendChild(span);
          a.appendChild(img);
          a.appendChild(body);
          igWrap.appendChild(a);
        });
        revealScan(igWrap);
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

  /* ---------- Senderista: ciclo de fotogramas ---------- */
  var hiker = document.querySelector(".hiker");
  if (hiker && !heroReduce) {
    var hFrames = [].slice.call(hiker.querySelectorAll("img"));
    if (hFrames.length) {
      var hIdx = 0;
      hFrames[0].classList.add("on");
      setInterval(function () {
        hFrames[hIdx].classList.remove("on");
        hIdx = (hIdx + 1) % hFrames.length;
        hFrames[hIdx].classList.add("on");
      }, 125);
    }
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
})();
