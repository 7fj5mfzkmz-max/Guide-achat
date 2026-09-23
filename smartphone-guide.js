(function () {
  "use strict";

  var toggle = document.getElementById("detail-mode-toggle");
  var label = document.getElementById("detail-mode-label");
  var help = document.getElementById("detail-mode-help");
  var details = Array.prototype.slice.call(document.querySelectorAll(".detail-content"));

  function setDetailed(enabled) {
    details.forEach(function (block) { block.hidden = !enabled; });
    if (toggle) {
      toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggle.textContent = enabled ? "Détails : ON" : "Détails : OFF";
    }
    if (label) label.textContent = enabled ? "Détails : ON" : "Détails : OFF";
    if (help) help.textContent = enabled
      ? "Mode complet : fonctionnement technique, chiffres, exceptions et explications supplémentaires."
      : "Mode simple : les explications utiles pour choisir rapidement.";
    document.documentElement.classList.toggle("detail-mode-on", enabled);
  }

  if (toggle) {
    setDetailed(false);
    toggle.addEventListener("click", function () {
      setDetailed(toggle.getAttribute("aria-pressed") !== "true");
    });
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

  /* Pause motion when the tab is hidden to avoid unnecessary work. */
  document.addEventListener("visibilitychange", function () {
    hzRunning = !document.hidden;
    if (hzRunning) {
      hzStart = performance.now();
      requestAnimationFrame(animateHz);
    }
  });
})();
