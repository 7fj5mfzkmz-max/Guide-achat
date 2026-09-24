(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap) return;

  var gs = window.gsap;

  /* ===== AUTONOMIE : animation du niveau de batterie ===== */
  var batteryPhones = document.querySelectorAll(".battery-phone");
  if (batteryPhones.length) {
    batteryPhones.forEach(function (phone) {
      var level = phone.querySelector(".battery-level");
      var scenario = phone.dataset.scenario;
      var fillPercent = scenario === "faible" ? 35 : 85;
      var timeline = gs.timeline({ repeat: -1, repeatDelay: 1.5 });
      timeline.fromTo(level, { "--fill": "0%" }, { "--fill": fillPercent + "%", duration: 2.5, ease: "power1.inOut" }, 0);
    });
  }

  /* ===== LUMINOSITÉ : pulsation du texte et barre ===== */
  var brightnessPhones = document.querySelectorAll(".brightness-phone");
  if (brightnessPhones.length) {
    brightnessPhones.forEach(function (phone) {
      var bar = phone.querySelector(".brightness-bar");
      if (bar) {
        gs.to(bar, { opacity: 0.4, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
    });
  }

  /* ===== HZ DEMO : balle qui se déplace en "sautillant" ===== */
  var hzPanels = document.querySelectorAll(".hz-panel");
  if (hzPanels.length) {
    hzPanels.forEach(function (panel) {
      var ball = panel.querySelector(".hz-ball");
      var hz = parseInt(panel.dataset.hz, 10);
      if (!ball) return;
      
      var duration = 2;
      var positions = [];
      var stepCount = hz / 60;
      for (var i = 0; i <= stepCount; i++) {
        positions.push({ left: (i / stepCount) * 76 + "%", duration: duration / stepCount });
      }
      
      var timeline = gs.timeline({ repeat: -1, repeatDelay: 0.8 });
      positions.forEach(function (pos) {
        timeline.to(ball, { left: pos.left, duration: pos.duration, ease: "linear" }, "<");
      });
    });
  }

  /* ===== PHOTO SLIDER : interaction drag (avant/après) ===== */
  var sliders = document.querySelectorAll(".photo-slider-container");
  if (sliders.length) {
    sliders.forEach(function (slider) {
      var handle = slider.querySelector(".photo-slider-handle");
      var before = slider.querySelector(".photo-slider-before");
      if (!handle || !before) return;

      var isDown = false;
      function update(e) {
        if (!isDown) return;
        var rect = slider.getBoundingClientRect();
        var x = e.clientX ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
        var pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
        before.style.width = pct + "%";
        handle.style.left = pct + "%";
      }

      handle.addEventListener("mousedown", function () { isDown = true; });
      document.addEventListener("mousemove", update);
      document.addEventListener("mouseup", function () { isDown = false; });

      handle.addEventListener("touchstart", function () { isDown = true; });
      document.addEventListener("touchmove", update);
      document.addEventListener("touchend", function () { isDown = false; });

      // Initialiser à 50%
      before.style.width = "50%";
      handle.style.left = "50%";
    });
  }
})();
