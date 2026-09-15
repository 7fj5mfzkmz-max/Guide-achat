/**
 * Questionnaire de recommandation.
 * Tout le calcul se fait dans le navigateur : on charge le JSON de la
 * catégorie, on filtre par budget, puis on trie par score pondéré selon
 * la priorité choisie. Aucun appel serveur, aucune API externe.
 */
(function () {
  "use strict";

  var form = document.getElementById("quiz-form");
  if (!form) return; // pas de questionnaire sur cette page

  var resultsBox = document.getElementById("quiz-results");
  var category = form.dataset.category; // ex. "smartphones"
  var dataUrl = category + ".json";

  // Bornes des tranches de budget (en euros). "max: null" = pas de plafond.
  var BUDGET_BANDS = {
    "moins-200": { min: 0, max: 200, label: "moins de 200 €" },
    "200-300": { min: 200, max: 300, label: "200–300 €" },
    "300-500": { min: 300, max: 500, label: "300–500 €" },
    "500-700": { min: 500, max: 700, label: "500–700 €" },
    "700-plus": { min: 700, max: null, label: "700 € et plus" }
  };

  // Critères de score disponibles dans les données produits.
  var CRITERES = ["performance", "autonomie", "photo", "prix", "gaming", "taille"];

  var produitsCache = null;

  function chargerProduits() {
    if (produitsCache) return Promise.resolve(produitsCache);
    return fetch(dataUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("Réponse HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        produitsCache = data.produits || [];
        return produitsCache;
      });
  }

  function scoreProduit(produit, prioriteChoisie) {
    var totalPoids = 0;
    var totalPondere = 0;
    CRITERES.forEach(function (critere) {
      var poids = critere === prioriteChoisie ? 3 : 1;
      var valeur = produit.scores && typeof produit.scores[critere] === "number" ? produit.scores[critere] : 5;
      totalPondere += valeur * poids;
      totalPoids += poids;
    });
    return totalPoids ? totalPondere / totalPoids : 0;
  }

  function filtrerParBudget(produits, bandeId) {
    var bande = BUDGET_BANDS[bandeId];
    if (!bande) return produits;
    return produits.filter(function (p) {
      var prix = p.prix_indicatif;
      var okMin = prix >= bande.min;
      var okMax = bande.max === null || prix <= bande.max;
      return okMin && okMax;
    });
  }

  function formatCarteResultat(produit, rang) {
    var carte = document.createElement("div");
    carte.className = "result-card";

    var rangEl = document.createElement("div");
    rangEl.className = "rank";
    rangEl.textContent = rang === 0 ? "Recommandation n°1" : "Alternative n°" + (rang + 1);
    carte.appendChild(rangEl);

    var titre = document.createElement("h4");
    titre.textContent = produit.nom;
    carte.appendChild(titre);

    var desc = document.createElement("p");
    var forces = (produit.points_forts || []).slice(0, 2).join(", ");
    desc.textContent = "≈ " + produit.prix_indicatif + " € — points forts : " + (forces || "voir la fiche");
    carte.appendChild(desc);

    if (produit.id) {
      var lien = document.createElement("a");
      lien.href = "#produit-" + produit.id;
      lien.className = "btn";
      lien.style.marginTop = "0.6rem";
      lien.textContent = "Voir la fiche complète";
      carte.appendChild(lien);
    }

    return carte;
  }

  function afficherResultats(produits, bandeId, priorite) {
    resultsBox.innerHTML = "";

    if (produits.length === 0) {
      var vide = document.createElement("p");
      vide.className = "hint";
      var bande = BUDGET_BANDS[bandeId];
      vide.textContent = "Aucun produit de notre sélection actuelle ne correspond à la tranche " +
        (bande ? bande.label : "choisie") + ". Notre catalogue s'agrandit progressivement — élargissez le budget pour voir d'autres profils.";
      resultsBox.appendChild(vide);
      return;
    }

    var classes = produits
      .map(function (p) { return { produit: p, score: scoreProduit(p, priorite) }; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3);

    classes.forEach(function (entry, index) {
      resultsBox.appendChild(formatCarteResultat(entry.produit, index));
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var formData = new FormData(form);
    var bandeId = formData.get("budget");
    var priorite = formData.get("priorite");

    if (!bandeId || !priorite) {
      resultsBox.innerHTML = "";
      var msg = document.createElement("p");
      msg.className = "hint";
      msg.textContent = "Choisissez un budget et une priorité pour voir les recommandations.";
      resultsBox.appendChild(msg);
      return;
    }

    resultsBox.innerHTML = '<p class="hint">Calcul en cours…</p>';
    chargerProduits()
      .then(function (produits) {
        var filtres = filtrerParBudget(produits, bandeId);
        afficherResultats(filtres, bandeId, priorite);
      })
      .catch(function (err) {
        resultsBox.innerHTML = "";
        var errEl = document.createElement("p");
        errEl.className = "hint";
        errEl.textContent = "Le questionnaire n'a pas pu charger les données produits (" + err.message + ").";
        resultsBox.appendChild(errEl);
      });
  });
})();
