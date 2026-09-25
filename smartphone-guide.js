(function () {
  "use strict";

  var toggle = document.getElementById("detail-mode-toggle");
  var detailBubble = document.getElementById("detail-mode");
  var intro = document.getElementById("introduction");
  var help = document.getElementById("detail-mode-help");
  var details = Array.prototype.slice.call(document.querySelectorAll(".detail-content"));

  function setDetailed(enabled) {
    details.forEach(function (block) { block.hidden = !enabled; });
    if (toggle) {
      toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggle.classList.toggle("is-on", enabled);
      toggle.classList.toggle("is-off", !enabled);
    }
    if (help) {
      help.textContent = enabled
        ? "Mode complet : fonctionnement technique, chiffres, exceptions et explications supplémentaires."
        : "Mode simple : les explications utiles pour choisir rapidement.";
    }
    document.documentElement.classList.toggle("detail-mode-on", enabled);
  }

  if (toggle) {
    setDetailed(false);
    toggle.addEventListener("click", function () {
      setDetailed(toggle.getAttribute("aria-pressed") !== "true");
    });
  }

  /* La bulle n'apparaît qu'après l'introduction, puis reste discrètement flottante. */
  if (detailBubble && intro) {
    var revealDetailBubble = function () {
      var introBottom = intro.getBoundingClientRect().bottom;
      detailBubble.hidden = introBottom > 24;
    };
    revealDetailBubble();
    window.addEventListener("scroll", revealDetailBubble, { passive: true });
    window.addEventListener("resize", revealDetailBubble);
  }

  /* 60 / 90 / 120 Hz : three simultaneous frame-rate simulations. */
  var hz = document.getElementById("hz-demo");
  var hzValue = document.getElementById("hz-demo-value");
  var hzText = document.getElementById("hz-demo-text");
  var hzPanels = Array.prototype.slice.call(document.querySelectorAll(".hz-panel"));
  var hzRunning = true;
  var hzStart = performance.now();

  function updateHzHighlight() {
    if (!hz) return;
    var value = Number(hz.value);
    if (hzValue) hzValue.textContent = value + " Hz";
    hzPanels.forEach(function (panel) {
      panel.classList.toggle("is-selected", Number(panel.getAttribute("data-hz")) === value);
    });
    if (hzText) hzText.textContent = value === 60
      ? "60 Hz : moins de positions intermédiaires, mouvement plus saccadé dans la simulation."
      : value === 90
        ? "90 Hz : davantage de positions intermédiaires, compromis visible entre fluidité et consommation."
        : "120 Hz : davantage de positions intermédiaires, mouvement plus continu au défilement et dans les animations.";
  }

  function animateHz(now) {
    if (!hzRunning) return;
    var elapsed = (now - hzStart) / 1000;
    hzPanels.forEach(function (panel) {
      var rate = Number(panel.getAttribute("data-hz"));
      /* We deliberately compress the physical frame rates to 6/9/12 visible
         steps so the distinction remains obvious even on a 60 Hz monitor. */
      var steps = rate === 60 ? 6 : rate === 90 ? 9 : 12;
      var cycle = 1.6;
      var progress = (elapsed % cycle) / cycle;
      var frame = Math.floor(progress * steps) / steps;
      var ball = panel.querySelector(".hz-ball");
      if (ball) ball.style.left = (4 + frame * 92) + "%";
      ball.style.transform = "translateY(-50%)";
      panel.setAttribute("data-frame", String(Math.floor(progress * steps) + 1));
    });
    requestAnimationFrame(animateHz);
  }

  if (hz) {
    hz.addEventListener("input", updateHzHighlight);
    updateHzHighlight();
    requestAnimationFrame(animateHz);
  }

  /* Resolution + pixel density demonstration. */
  var resolutionButtons = Array.prototype.slice.call(document.querySelectorAll(".resolution-btn"));
  var resolutionValue = document.getElementById("resolution-demo-value");
  var resolutionText = document.getElementById("resolution-demo-text");
  var pixelGrid = document.getElementById("pixel-density-grid");
  var pixelLabel = document.getElementById("pixel-density-label");
  var pixelValue = document.getElementById("pixel-density-value");

  var resolutionData = {
    "HD": { cols: 8, rows: 5, ppi: "≈ 233 ppp", text: "HD affiche moins de pixels sur la même surface. Les contours et les petits textes peuvent paraître moins fins." },
    "FHD+": { cols: 16, rows: 10, ppi: "≈ 419 ppp", text: "FHD+ offre déjà une très bonne finesse sur un smartphone. C'est souvent le compromis le plus pertinent." },
    "QHD+": { cols: 24, rows: 15, ppi: "≈ 559 ppp", text: "QHD+ augmente nettement la densité de pixels. Le gain de finesse devient surtout intéressant lorsque vous regardez de très près." },
    "UHD": { cols: 32, rows: 18, ppi: "≈ 697 ppp", text: "UHD concentre encore plus de pixels. Sur un smartphone, le gain visuel supplémentaire devient rapidement difficile à distinguer à distance normale." }
  };

  function renderPixelGrid(data) {
    if (!pixelGrid) return;
    pixelGrid.innerHTML = "";
    pixelGrid.style.gridTemplateColumns = "repeat(" + data.cols + ", 1fr)";
    pixelGrid.style.gridTemplateRows = "repeat(" + data.rows + ", 1fr)";
    for (var i = 0; i < data.cols * data.rows; i++) {
      var cell = document.createElement("span");
      cell.setAttribute("aria-hidden", "true");
      pixelGrid.appendChild(cell);
    }
  }

  function setResolution(value) {
    var data = resolutionData[value] || resolutionData["FHD+"];
    resolutionButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-resolution") === value);
    });
    if (resolutionValue) resolutionValue.textContent = value;
    if (pixelLabel) pixelLabel.textContent = value;
    if (pixelValue) pixelValue.textContent = data.ppi;
    if (resolutionText) resolutionText.textContent = data.text;
    if (pixelGrid) pixelGrid.setAttribute("data-resolution", value);
    renderPixelGrid(data);
  }

  resolutionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setResolution(button.getAttribute("data-resolution"));
    });
  });
  setResolution("FHD+");

  /* RAM : remplissage cyclique des blocs pour montrer visuellement la capacité. */
  var ramCards = Array.prototype.slice.call(document.querySelectorAll(".ram-card"));
  ramCards.forEach(function (card) {
    var slots = card.querySelector(".ram-slots");
    var ram = Number(card.getAttribute("data-ram"));
    if (!slots) return;
    for (var i = 0; i < 12; i++) {
      var slot = document.createElement("span");
      slot.className = i < ram ? "is-used" : "";
      slot.style.setProperty("--ram-index", i);
      slot.setAttribute("aria-hidden", "true");
      slots.appendChild(slot);
    }
  });

  /* LTPO : la fréquence illustrée alterne entre action et veille. */
  var ltpoHz = document.getElementById("ltpo-hz-value");
  if (ltpoHz) {
    var ltpoActive = true;
    setInterval(function () {
      ltpoActive = !ltpoActive;
      ltpoHz.textContent = ltpoActive ? "120" : "10";
      ltpoHz.parentElement.parentElement.classList.toggle("is-idle", !ltpoActive);
    }, 2600);
  }

  /* Recharge : l'animation de remplissage est proportionnelle à la puissance affichée. */
  var chargingCards = Array.prototype.slice.call(document.querySelectorAll(".charging-card"));
  chargingCards.forEach(function (card) {
    var speed = Number(card.getAttribute("data-charge-speed")) || 25;
    var fill = card.querySelector(".battery-fill");
    if (fill) {
      /* Une valeur moyenne de la plage est utilisée pour 45–67 W et 80–120 W.
         C'est une illustration relative, pas une simulation de temps de charge réel. */
      var duration = Math.max(1.25, 5.8 * (25 / speed));
      fill.style.setProperty("--charge-duration", duration.toFixed(2) + "s");
    }
  });

  /* Illustrative information cards: reveal them as they enter the viewport. */
  var motionCards = Array.prototype.slice.call(document.querySelectorAll(".interactive-demo, .quick-scale, .guide-subsection, .takeaway"));
  motionCards.forEach(function (card) { card.classList.add("motion-card"); });

  if ("IntersectionObserver" in window) {
    var motionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          motionObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    motionCards.forEach(function (card) { motionObserver.observe(card); });
  } else {
    motionCards.forEach(function (card) { card.classList.add("is-visible"); });
  }

  /* Pause motion when the tab is hidden to avoid unnecessary work. */
  document.addEventListener("visibilitychange", function () {
    hzRunning = !document.hidden;
    if (hzRunning) {
      hzStart = performance.now();
      requestAnimationFrame(animateHz);
    }
  });
})();
