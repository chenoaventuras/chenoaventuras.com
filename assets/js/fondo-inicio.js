/* Fondo animado del inicio: manchas de color de la marca (verde, azul y
   amarillo) que se mueven muy despacio detrás de las zonas claras. */
(function () {
  var bg = document.createElement("div");
  bg.className = "homebg";
  bg.setAttribute("aria-hidden", "true");
  bg.innerHTML = "<i></i><i></i><i></i><i></i>";
  document.body.insertBefore(bg, document.body.firstChild);
})();
