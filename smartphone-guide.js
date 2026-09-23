(function () {
  "use strict";

  var root = document.documentElement;
  var toggle = document.getElementById("detail-toggle");
  var content = document.getElementById("smartphone-guide-content");
  var statusCopy = document.getElementById("detail-status-copy");
  var statusText = document.getElementById("detail-status-text");
  var STORAGE_KEY = "guide-achat-smartphone-details";

  function setDetails(on, save) {
    if (!content) return;
    root.classList.toggle("smartphone-details-on", on);
    document.querySelectorAll(".detailed-content").forEach(function (block) {
      block.hidden = !on;
    });
    if (toggle) {
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
      var label = toggle.querySelector("span");
      if (label) label.textContent = on ? "Détails : ON" : "Détails : OFF";
      toggle.setAttribute("aria-label", on ? "Désactiver les explications détaillées" : "Activer les explications détaillées");
    }
    if (statusCopy) statusCopy.textContent = on ? "Mode détaillé" : "Mode simple";
    if (statusText) statusText.textContent = on ? "Les explications techniques apparaissent dans chaque chapitre." : "Les explications utiles pour choisir rapidement.";
    if (save) {
      try { sessionStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch (e) {}
    }
  }

  if (toggle && content) {
    var initial = false;
    try { initial = sessionStorage.getItem(STORAGE_KEY) === "on"; } catch (e) {}
    setDetails(initial, false);
    toggle.addEventListener("click", function () { setDetails(!root.classList.contains("smartphone-details-on"), true); });
  }

  // Functional 60 / 90 / 120 Hz comparison.
  document.querySelectorAll("[data-hz-demo]").forEach(function (demo) {
    var caption = demo.querySelector("[data-hz-caption]");
    var captions = {
      "60": "60 Hz reste parfaitement utilisable, mais le mouvement paraît moins régulier.",
      "90": "90 Hz rend déjà le défilement sensiblement plus fluide et constitue un bon compromis.",
      "120": "120 Hz rend le mouvement encore plus continu, surtout dans les menus, les pages et les jeux."
    };
    demo.querySelectorAll("[data-hz]").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.dataset.hz;
        demo.dataset.hz = value;
        demo.querySelectorAll("[data-hz]").forEach(function (b) { b.setAttribute("aria-pressed", b === button ? "true" : "false"); });
        if (caption) caption.textContent = captions[value];
      });
    });
  });

  // Functional resolution comparison.
  document.querySelectorAll("[data-resolution-demo]").forEach(function (demo) {
    var caption = demo.querySelector("[data-resolution-caption]");
    var captions = {
      "HD": "HD affiche moins de pixels : le texte et les détails peuvent paraître moins fins sur un grand écran.",
      "FHD+": "FHD+ offre généralement un bon équilibre entre finesse, consommation et netteté sur un smartphone.",
      "QHD": "QHD augmente la finesse, mais le gain visuel peut être discret face à une bonne dalle FHD+ et demander davantage d'énergie."
    };
    demo.querySelectorAll("[data-resolution]").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.dataset.resolution;
        demo.dataset.resolution = value;
        demo.querySelectorAll("[data-resolution]").forEach(function (b) { b.setAttribute("aria-pressed", b === button ? "true" : "false"); });
        if (caption) caption.textContent = captions[value];
      });
    });
  });

  // Compact comparison using catalogue data. No ranking is produced.
  var compareBox = document.getElementById("product-compare");
  if (compareBox) {
    fetch("smartphones.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        var products = (data.produits || []).filter(function (p) { return p.ready_for_recommendation !== false && p.caracteristiques; }).slice(0, 3);
        if (!products.length) throw new Error("Aucun modèle disponible");
        var table = document.createElement("div");
        table.className = "product-compare-table-wrap";
        var rows = [
          ["Écran", "ecran"], ["Processeur", "processeur"], ["RAM", "ram"], ["Stockage", "stockage"], ["Batterie", "batterie"], ["Photo", "photo"], ["Protection", "etancheite"], ["Système", "os"]
        ];
        var head = "<table class=\"product-compare-table\"><thead><tr><th>Critère</th>" + products.map(function (p) { return "<th>" + escapeHtml(p.nom) + "</th>"; }).join("") + "</tr></thead><tbody>";
        var body = rows.map(function (row) {
          return "<tr><th>" + escapeHtml(row[0]) + "</th>" + products.map(function (p) { return "<td>" + escapeHtml((p.caracteristiques || {})[row[1]] || "—") + "</td>"; }).join("") + "</tr>";
        }).join("");
        table.innerHTML = head + body + "</tbody></table>";
        compareBox.innerHTML = "";
        compareBox.appendChild(table);
      })
      .catch(function () {
        compareBox.innerHTML = "<p class=\"hint\">La comparaison des modèles n’est pas disponible pour le moment.</p>";
      });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
})();
