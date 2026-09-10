/**
 * Comparateur local : sélection de 2 à 5 produits parmi les données
 * de la catégorie, affichage d'un tableau des caractéristiques retenues.
 * Fonctionne uniquement avec les données locales du site.
 */
(function () {
  "use strict";

  var box = document.getElementById("comparateur");
  if (!box) return;

  var picker = document.getElementById("compare-picker");
  var resultBox = document.getElementById("compare-result");
  var category = box.dataset.category;
  var dataUrl = "smartphones.json";
  var MAX_SELECTION = 5;
  var MIN_SELECTION = 2;

  // Caractéristiques affichées dans le tableau, dans cet ordre.
  var CHAMPS = [
    { cle: "ecran", label: "Écran" },
    { cle: "processeur", label: "Processeur" },
    { cle: "ram", label: "Mémoire vive" },
    { cle: "stockage", label: "Stockage" },
    { cle: "batterie", label: "Batterie" },
    { cle: "photo", label: "Photo" },
    { cle: "etancheite", label: "Étanchéité" },
    { cle: "os", label: "Système" }
  ];

  var produits = [];

  function construirePicker() {
    picker.innerHTML = "";
    produits.forEach(function (p) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = p.id;
      input.addEventListener("change", surSelectionChangee);
      label.appendChild(input);
      label.appendChild(document.createTextNode(p.nom + " — ≈ " + p.prix_indicatif + " €"));
      picker.appendChild(label);
    });
  }

  function idsSelectionnes() {
    return Array.prototype.slice
      .call(picker.querySelectorAll("input:checked"))
      .map(function (input) { return input.value; });
  }

  function surSelectionChangee() {
    var ids = idsSelectionnes();

    // Empêche de sélectionner plus de MAX_SELECTION produits.
    var tousLesInputs = picker.querySelectorAll("input");
    tousLesInputs.forEach(function (input) {
      if (!input.checked) {
        input.disabled = ids.length >= MAX_SELECTION;
      }
    });

    afficherComparatif(ids);
  }

  function afficherComparatif(ids) {
    resultBox.innerHTML = "";

    if (ids.length < MIN_SELECTION) {
      var hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "Sélectionnez au moins " + MIN_SELECTION + " produits pour lancer la comparaison (" +
        MAX_SELECTION + " maximum).";
      resultBox.appendChild(hint);
      return;
    }

    var selection = produits.filter(function (p) { return ids.indexOf(p.id) !== -1; });

    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    var table = document.createElement("table");

    var thead = document.createElement("thead");
    var trHead = document.createElement("tr");
    var thVide = document.createElement("th");
    thVide.textContent = "Caractéristique";
    trHead.appendChild(thVide);
    selection.forEach(function (p) {
      var th = document.createElement("th");
      th.textContent = p.nom;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    var trPrix = document.createElement("tr");
    var tdPrixLabel = document.createElement("td");
    tdPrixLabel.textContent = "Prix indicatif";
    trPrix.appendChild(tdPrixLabel);
    selection.forEach(function (p) {
      var td = document.createElement("td");
      td.textContent = "≈ " + p.prix_indicatif + " €";
      trPrix.appendChild(td);
    });
    tbody.appendChild(trPrix);

    CHAMPS.forEach(function (champ) {
      var tr = document.createElement("tr");
      var tdLabel = document.createElement("td");
      tdLabel.textContent = champ.label;
      tr.appendChild(tdLabel);
      selection.forEach(function (p) {
        var td = document.createElement("td");
        var valeur = p.caracteristiques ? p.caracteristiques[champ.cle] : null;
        td.textContent = valeur || "—";
        td.style.whiteSpace = "normal";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
    resultBox.appendChild(wrap);
  }

  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("Réponse HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      produits = data.produits || [];
      construirePicker();
      afficherComparatif([]);
    })
    .catch(function (err) {
      picker.innerHTML = "";
      var errEl = document.createElement("p");
      errEl.className = "hint";
      errEl.textContent = "Le comparateur n'a pas pu charger les données produits (" + err.message + ").";
      resultBox.appendChild(errEl);
    });
})();
