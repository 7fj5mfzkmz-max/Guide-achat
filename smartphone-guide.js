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

  var hz = document.getElementById("hz-demo");
  var hzValue = document.getElementById("hz-demo-value");
  var hzDot = document.getElementById("hz-dot");
  var hzText = document.getElementById("hz-demo-text");
  function updateHz() {
    if (!hz) return;
    var value = Number(hz.value);
    if (hzValue) hzValue.textContent = value + " Hz";
    if (hzDot) hzDot.style.animationDuration = (1 / value * 8).toFixed(3) + "s";
    if (hzText) {
      hzText.textContent = value === 60
        ? "60 Hz reste parfaitement utilisable, mais les mouvements paraissent moins continus."
        : value === 90
          ? "90 Hz améliore déjà nettement le confort du défilement. C'est souvent un bon compromis."
          : "120 Hz rend le mouvement plus continu. La différence concerne surtout le défilement et les animations.";
    }
  }
  if (hz) { hz.addEventListener("input", updateHz); updateHz(); }

  var resolutionButtons = Array.prototype.slice.call(document.querySelectorAll(".resolution-btn"));
  var resolutionValue = document.getElementById("resolution-demo-value");
  var resolutionText = document.getElementById("resolution-demo-text");
  var resolutionPreview = document.getElementById("resolution-preview");
  resolutionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      resolutionButtons.forEach(function (b) { b.classList.remove("is-active"); });
      button.classList.add("is-active");
      var value = button.getAttribute("data-resolution");
      if (resolutionValue) resolutionValue.textContent = value;
      if (resolutionPreview) resolutionPreview.setAttribute("data-resolution", value);
      if (resolutionText) resolutionText.textContent = value === "HD"
        ? "HD affiche moins de détails. Sur un smartphone moderne, la différence de finesse peut être visible surtout sur le texte et les petits éléments."
        : value === "FHD+"
          ? "FHD+ offre déjà une bonne finesse sur la plupart des smartphones. La résolution n'indique ni la luminosité, ni le contraste, ni la fluidité."
          : "QHD affiche davantage de détails, mais le gain peut être discret face à une bonne dalle FHD+ et peut demander davantage d'énergie.";
    });
  });
})();
