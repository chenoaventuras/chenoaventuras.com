/* =========================================================================
   CHENO AVENTURAS — JS global
   - Menú responsive
   - Rotador de "curiosidades" del hero
   - Animación de aparición al hacer scroll
   - Año dinámico en el footer
   ========================================================================= */
(function () {
  "use strict";

  /* Marca que hay JS: activa animaciones de aparición (ver styles.css). */
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

  /* ---------- Curiosidades del hero (barra rotativa) ----------
     TODO (Cheno): sustituir por las curiosidades reales.
     Se puede editar aquí o mediante el atributo data-curiosidades
     (JSON array de strings) en el elemento .curiosbar.
  ------------------------------------------------------------------- */
  var CURIOSIDADES_PLACEHOLDER = [
    "Curiosidad pendiente 1 — Cheno la enviará más adelante.",
    "Curiosidad pendiente 2 — texto provisional de ejemplo.",
    "Curiosidad pendiente 3 — aquí irá un dato de viaje real.",
    "Curiosidad pendiente 4 — sustituir por contenido definitivo.",
    "Curiosidad pendiente 5 — placeholder editable en main.js."
  ];

  var bar = document.querySelector("[data-curiosbar]");
  if (bar) {
    var out = bar.querySelector(".curiosbar__text");
    var list = CURIOSIDADES_PLACEHOLDER;
    try {
      var fromAttr = bar.getAttribute("data-curiosidades");
      if (fromAttr) {
        var parsed = JSON.parse(fromAttr);
        if (Array.isArray(parsed) && parsed.length) list = parsed;
      }
    } catch (e) { /* usa el placeholder */ }

    var i = 0;
    out.textContent = list[0];
    if (list.length > 1) {
      setInterval(function () {
        out.classList.add("is-fading");
        setTimeout(function () {
          i = (i + 1) % list.length;
          out.textContent = list[i];
          out.classList.remove("is-fading");
        }, 400);
      }, 5000);
    }
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
    // Red de seguridad: si algo impide que el observer dispare, muestra todo.
    setTimeout(function () {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }, 2500);
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Año dinámico ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Formularios de demo (sin backend) ---------- */
  document.querySelectorAll("form[data-demo]").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = f.querySelector("[data-demo-msg]");
      if (msg) { msg.hidden = false; }
      f.reset();
    });
  });
})();
