(function () {
  "use strict";
  var button = document.getElementById("detail-bubble-toggle");
  if (!button) return;

  var root = document.documentElement;
  var status = document.getElementById("detail-mode-status");
  var label = button.querySelector("[data-detail-label]");

  function setMode(deep) {
    root.classList.toggle("detail-mode-on", deep);
    button.setAttribute("aria-pressed", String(deep));
    button.classList.toggle("is-on", deep);
    button.classList.toggle("is-off", !deep);
    if (label) label.textContent = deep ? "Mode détails" : "Mode simple";
    if (status) {
      status.textContent = deep
        ? "Explications techniques approfondies affichées."
        : "Explications simples affichées.";
    }
    try { localStorage.setItem("guide-achat-detail-mode", deep ? "1" : "0"); } catch (_) {}
  }

  var saved = false;
  try { saved = localStorage.getItem("guide-achat-detail-mode") === "1"; } catch (_) {}
  setMode(saved);

  button.addEventListener("click", function () {
    setMode(!root.classList.contains("detail-mode-on"));
  });
})();
