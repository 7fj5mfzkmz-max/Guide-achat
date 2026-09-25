(function () {
  "use strict";

  var bar = document.getElementById("falc-progress-bar");
  var progress = document.querySelector(".falc-progress");
  var endEl = document.querySelector(".falc-more");
  if (!bar || !progress || !endEl) return;

  function pageTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function update() {
    var startTop = pageTop(progress);
    var endTop = pageTop(endEl);
    var range = Math.max(endTop - startTop, 1);

    /* Le remplissage suit réellement la position de lecture,
       du début de la barre jusqu'au bloc "Approfondir". */
    var current = window.scrollY + window.innerHeight * 0.45;
    var pct = ((current - startTop) / range) * 100;
    pct = Math.min(Math.max(pct, 0), 100);

    bar.style.width = pct + "%";
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();