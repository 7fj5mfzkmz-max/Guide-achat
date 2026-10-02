(function () {
  "use strict";
  var box = document.getElementById("comparateur");
  if (!box) return;
  var picker = document.getElementById("compare-picker");
  var resultBox = document.getElementById("compare-result");
  var category = box.dataset.category;
  var dataUrl = category + ".json";
  var MAX_SELECTION = 5, MIN_SELECTION = 2;
  var STORAGE_KEY = "guide-achat-compare-selection";

  /* ---------------------------------------------------------------------
   * Mêmes 5 critères, mêmes clés et mêmes libellés que l'audit
   * (#purchase-audit, site-tools.js) et le scoring (smartphones-scoring.js).
   * On lit ici la structure compatibilite.*, la même donnée structurée que
   * le scoring utilise, pas le texte libre de caracteristiques.*.
   * ------------------------------------------------------------------- */
  var CRITERES = [
    {
      cle: "ecran", label: "Écran",
      formatter: function (c) {
        if (!c) return null;
        var parts = [];
        if (c.technologie) parts.push(c.technologie);
        if (c.frequence_max_hz != null) parts.push(c.frequence_max_hz + " Hz");
        if (c.luminosite_nits != null) parts.push(c.luminosite_nits + " nits");
        return parts.length ? parts.join(" · ") : null;
      }
    },
    {
      cle: "performance", label: "Performance",
      formatter: function (c) {
        if (!c) return null;
        var parts = [];
        if (c.soc) parts.push(c.soc);
        if (c.ram_go_max != null) parts.push("jusqu'à " + c.ram_go_max + " Go de RAM");
        return parts.length ? parts.join(" · ") : null;
      }
    },
    {
      cle: "photo", label: "Photo",
      formatter: function (c) {
        if (!c) return null;
        var parts = [];
        if (c.mp_principal != null) parts.push(c.mp_principal + " Mpx");
        if (c.ois === true) parts.push("stabilisation optique (OIS)");
        else if (c.ois === false) parts.push("sans stabilisation optique");
        return parts.length ? parts.join(" · ") : null;
      }
    },
    {
      cle: "batterie", label: "Batterie et recharge",
      formatter: function (c) {
        if (!c) return null;
        var parts = [];
        if (c.capacite_mah != null) parts.push(c.capacite_mah + " mAh");
        if (c.recharge_watts != null) parts.push(c.recharge_watts + " W");
        if (c.chimie) parts.push(c.chimie);
        return parts.length ? parts.join(" · ") : null;
      }
    },
    {
      cle: "durete", label: "Protection",
      formatter: function (c) {
        if (!c) return null;
        var parts = [];
        if (c.protection_ip) parts.push(c.protection_ip);
        if (c.android_version_sortie) parts.push("Android " + c.android_version_sortie + " à la sortie");
        return parts.length ? parts.join(" · ") : null;
      }
    }
  ];

  var produits = [];
  var comparables = []; // sous-ensemble ready_for_recommendation + compatibilite exploitable

  function readSelection() {
    var ids = [];
    try { ids = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) {}
    var params = new URLSearchParams(window.location.search).get("selection");
    if (params) ids = params.split(",").filter(Boolean);
    return ids.slice(0, MAX_SELECTION);
  }
  function saveSelection(ids) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_SELECTION))); }
  function idsSelectionnes() { return Array.prototype.slice.call(picker.querySelectorAll("input:checked")).map(function (i) { return i.value; }); }

  function construirePicker(initial) {
    picker.innerHTML = "";
    var toolbar = document.createElement("div"); toolbar.className = "compare-toolbar";
    var count = document.createElement("span"); count.id = "compare-count"; count.className = "compare-count";
    var clear = document.createElement("button"); clear.type = "button"; clear.className = "btn"; clear.textContent = "Effacer la sélection";
    clear.addEventListener("click", function () { saveSelection([]); picker.querySelectorAll("input").forEach(function (i) { i.checked = false; }); surSelectionChangee(); });
    toolbar.appendChild(count); toolbar.appendChild(clear); picker.appendChild(toolbar);
    comparables.forEach(function (p) {
      var label = document.createElement("label"); label.className = "compare-choice";
      var input = document.createElement("input"); input.type = "checkbox"; input.value = p.id; input.checked = initial.indexOf(p.id) !== -1; input.addEventListener("change", surSelectionChangee);
      label.appendChild(input); label.appendChild(document.createTextNode(p.nom + " : ≈ " + (typeof p.prix_indicatif === "number" ? p.prix_indicatif + " €" : "prix à vérifier")));
      picker.appendChild(label);
    });
    updateCount(initial);
  }
  function updateCount(ids) { var count = document.getElementById("compare-count"); if (count) count.textContent = ids.length + " / " + MAX_SELECTION + " modèle" + (ids.length > 1 ? "s" : "") + " sélectionné" + (ids.length > 1 ? "s" : ""); }
  function surSelectionChangee() {
    var ids = idsSelectionnes();
    if (ids.length > MAX_SELECTION) ids = ids.slice(0, MAX_SELECTION);
    saveSelection(ids); updateCount(ids);
    picker.querySelectorAll("input").forEach(function (input) { input.disabled = !input.checked && ids.length >= MAX_SELECTION; });
    afficherComparatif(ids);
  }

  function afficherComparatif(ids) {
    resultBox.innerHTML = "";
    if (ids.length < MIN_SELECTION) {
      var hint = document.createElement("p"); hint.className = "hint"; hint.textContent = "Sélectionnez au moins " + MIN_SELECTION + " modèles pour afficher la comparaison. Vous pouvez en sélectionner jusqu'à " + MAX_SELECTION + "."; resultBox.appendChild(hint); return;
    }
    var selection = comparables.filter(function (p) { return ids.indexOf(p.id) !== -1; });

    var wrap = document.createElement("div"); wrap.className = "table-wrap";
    var table = document.createElement("table"); table.className = "compare-table";
    var thead = document.createElement("thead"); var trHead = document.createElement("tr");
    var firstHead = document.createElement("th"); firstHead.textContent = "Critère"; trHead.appendChild(firstHead);
    selection.forEach(function (p) { var th = document.createElement("th"); th.textContent = p.nom; trHead.appendChild(th); });
    thead.appendChild(trHead); table.appendChild(thead);

    var tbody = document.createElement("tbody");

    // Ligne prix, toujours en tête, même logique de mise en forme que le reste du site
    var prixRow = document.createElement("tr");
    var prixLabel = document.createElement("td"); prixLabel.textContent = "Prix indicatif"; prixRow.appendChild(prixLabel);
    selection.forEach(function (p) {
      var td = document.createElement("td");
      td.textContent = typeof p.prix_indicatif === "number" ? "≈ " + p.prix_indicatif + " €" : "À vérifier";
      prixRow.appendChild(td);
    });
    tbody.appendChild(prixRow);

    // Une ligne par critère des 5 mêmes catégories que l'audit et le scoring.
    // Les différences importantes sont mises en évidence : quand les modèles
    // comparés n'ont pas tous la même valeur sur un critère, la ligne est
    // marquée pour ressortir visuellement (voir .compare-row-diff en CSS).
    CRITERES.forEach(function (crit) {
      var values = selection.map(function (p) { return crit.formatter(p.compatibilite && p.compatibilite[crit.cle]); });
      var distinctKnown = values.filter(function (v, i, arr) { return v != null && arr.indexOf(v) === i; });
      var hasDifference = distinctKnown.length > 1;

      var tr = document.createElement("tr");
      if (hasDifference) tr.className = "compare-row-diff";
      var td0 = document.createElement("td"); td0.textContent = crit.label; tr.appendChild(td0);
      values.forEach(function (v) {
        var td = document.createElement("td");
        td.textContent = v != null ? v : "À documenter";
        if (v == null) td.className = "compare-cell-missing";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody); wrap.appendChild(table); resultBox.appendChild(wrap);

    var legend = document.createElement("p");
    legend.className = "hint compare-legend";
    legend.textContent = "Les lignes surlignées signalent un critère où les modèles comparés diffèrent réellement.";
    resultBox.appendChild(legend);
  }

  fetch(dataUrl).then(function (r) { if (!r.ok) throw new Error("Réponse HTTP " + r.status); return r.json(); }).then(function (data) {
    produits = data.produits || [];
    comparables = produits.filter(function (p) { return p.ready_for_recommendation && p.compatibilite; });
    var initial = readSelection().filter(function (id) { return comparables.some(function (p) { return p.id === id; }); });
    construirePicker(initial); afficherComparatif(initial);
  }).catch(function (err) { picker.innerHTML = ""; var e = document.createElement("p"); e.className = "hint"; e.textContent = "Le comparateur n'a pas pu charger les données produits (" + err.message + ")."; picker.appendChild(e); });
})();
