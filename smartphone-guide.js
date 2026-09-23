(function () {
  "use strict";

  var toggle = document.getElementById("detail-mode-toggle");
  var label = document.getElementById("detail-mode-label");
  var help = document.getElementById("detail-mode-help");
  var details = Array.prototype.slice.call(document.querySelectorAll(".detail-content"));
  if (!toggle || !details.length) return;

  function setDetailed(enabled) {
    details.forEach(function (block) {
      block.hidden = !enabled;
    });
    toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    toggle.textContent = enabled ? "Désactiver les explications détaillées" : "Activer les explications détaillées";
    if (label) label.textContent = enabled ? "Explications détaillées — ON" : "Explications détaillées — OFF";
    if (help) help.textContent = enabled
      ? "Mode complet : fonctionnement technique, chiffres, exceptions et explications supplémentaires."
      : "Mode simple : on vous présente chaque élément et on vous explique uniquement ce qui est utile pour choisir.";
    document.documentElement.classList.toggle("detail-mode-on", enabled);
  }

  setDetailed(false);
  toggle.addEventListener("click", function () {
    setDetailed(toggle.getAttribute("aria-pressed") !== "true");
  });
})();
