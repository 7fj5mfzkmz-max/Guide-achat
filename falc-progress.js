(function () {
  "use strict";
  var bar = document.getElementById("falc-progress-bar");
  var more = document.querySelector(".falc-more");
  if (!bar || !more) return;

  function update() {
    var start = document.querySelector(".falc-point");
    if (!start) return;
    var startTop = start.getBoundingClientRect().top + window.scrollY;
    var endEl = more;
    var endTop = endEl.getBoundingClientRect().top + window.scrollY;
    var total = Math.max(endTop - startTop, 1);
    var scrolled = window.scrollY + window.innerHeight * 0.4 - startTop;
    var pct = Math.min(Math.max(scrolled / total, 0), 1) * 100;
    bar.style.width = pct + "%";
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
