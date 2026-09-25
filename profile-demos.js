(function () {
  "use strict";

  /* Les démonstrations restent visuellement immobiles.
     Le seul comportement conservé est le curseur manuel du comparatif photo. */
  var sliders = document.querySelectorAll(".photo-slider-container");
  if (!sliders.length) return;

  sliders.forEach(function (slider) {
    var handle = slider.querySelector(".photo-slider-handle");
    var before = slider.querySelector(".photo-slider-before");
    if (!handle || !before) return;

    var isDown = false;

    function update(e) {
      if (!isDown) return;
      var rect = slider.getBoundingClientRect();
      var clientX = e.clientX;
      if (clientX == null && e.touches && e.touches[0]) clientX = e.touches[0].clientX;
      if (clientX == null) return;
      var x = clientX - rect.left;
      var pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      before.style.width = pct + "%";
      handle.style.left = pct + "%";
    }

    handle.addEventListener("mousedown", function () { isDown = true; });
    document.addEventListener("mousemove", update);
    document.addEventListener("mouseup", function () { isDown = false; });
    handle.addEventListener("touchstart", function () { isDown = true; }, { passive: true });
    document.addEventListener("touchmove", update, { passive: true });
    document.addEventListener("touchend", function () { isDown = false; });

    before.style.width = "50%";
    handle.style.left = "50%";
  });
})();