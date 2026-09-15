/**
 * Choix guidé : filtre par budget + 1 à 3 priorités.
 * Les recommandations et fiches sont construites à partir du JSON local.
 */
(function () {
  "use strict";

  var form = document.getElementById("quiz-form");
  if (!form) return;

  var resultsBox = document.getElementById("quiz-results");
  var category = form.dataset.category;
  var dataUrl = category + ".json";
  var produitsCache = null;
  var MAX_PRIORITES = 3;
  var CRITERES = ["performance", "autonomie", "photo", "prix", "gaming", "taille"];

  var BUDGET_BANDS = {
    "moins-200": { min: 0, max: 200, label: "moins de 200 €" },
    "200-300": { min: 200, max: 300, label: "200–300 €" },
    "300-500": { min: 300, max: 500, label: "300–500 €" },
    "500-700": { min: 500, max: 700, label: "500–700 €" },
    "700-plus": { min: 700, max: null, label: "700 € et plus" }
  };

  function chargerProduits() {
    if (produitsCache) return Promise.resolve(produitsCache);
    return fetch(dataUrl).then(function (r) {
      if (!r.ok) throw new Error("Réponse HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      produitsCache = data.produits || [];
      return produitsCache;
    });
  }

  function scoreProduit(produit, priorites) {
    var total = 0;
    var poidsTotal = 0;
    CRITERES.forEach(function (critere) {
      var poids = priorites.indexOf(critere) !== -1 ? 3 : 1;
      var valeur = produit.scores && typeof produit.scores[critere] === "number" ? produit.scores[critere] : 5;
      total += valeur * poids;
      poidsTotal += poids;
    });
    return poidsTotal ? total / poidsTotal : 0;
  }

  function filtrerParBudget(produits, bandeId) {
    var bande = BUDGET_BANDS[bandeId];
    if (!bande) return produits;
    return produits.filter(function (p) {
      return p.prix_indicatif >= bande.min && (bande.max === null || p.prix_indicatif <= bande.max);
    });
  }

  function creerFiche(produit, rang) {
    var carte = document.createElement("article");
    carte.className = "fiche result-fiche";

    var head = document.createElement("div");
    head.className = "fiche-head";
    var identite = document.createElement("div");
    var nom = document.createElement("p"); nom.className = "fiche-name"; nom.textContent = produit.nom;
    var marque = document.createElement("p"); marque.className = "fiche-brand"; marque.textContent = produit.marque || "";
    identite.appendChild(nom); identite.appendChild(marque);
    var prix = document.createElement("div"); prix.className = "fiche-price"; prix.textContent = "≈ " + produit.prix_indicatif + " €";
    head.appendChild(identite); head.appendChild(prix); carte.appendChild(head);

    var badge = document.createElement("div");
    badge.className = "result-rank";
    badge.textContent = rang === 0 ? "Correspond le mieux à vos critères" : "Alternative " + (rang + 1);
    carte.appendChild(badge);

    var grid = document.createElement("div"); grid.className = "result-detail-grid";
    var specs = document.createElement("div");
    specs.innerHTML = "<h4>En bref</h4>";
    var ul = document.createElement("ul");
    Object.keys(produit.caracteristiques || {}).forEach(function (cle) {
      var li = document.createElement("li");
      var label = cle.charAt(0).toUpperCase() + cle.slice(1);
      li.innerHTML = "<strong>" + label + " :</strong> " + produit.caracteristiques[cle];
      ul.appendChild(li);
    });
    specs.appendChild(ul);

    var forces = document.createElement("div");
    forces.innerHTML = "<h4>Points forts</h4>";
    var fl = document.createElement("ul");
    (produit.points_forts || []).forEach(function (x) { var li=document.createElement("li"); li.textContent=x; fl.appendChild(li); });
    forces.appendChild(fl);
    forces.innerHTML += "<h4 class='result-subhead'>Points faibles</h4>";
    var fa = document.createElement("ul");
    (produit.points_faibles || []).forEach(function (x) { var li=document.createElement("li"); li.textContent=x; fa.appendChild(li); });
    forces.appendChild(fa);
    grid.appendChild(specs); grid.appendChild(forces); carte.appendChild(grid);

    var actions = document.createElement("div"); actions.className = "fiche-actions";
    [
      [produit.fabricant_url, "Fabricant"],
      [produit.kimovil_url, "Kimovil"],
      [produit.idealo_url, "Idealo"]
    ].forEach(function (item) {
      if (!item[0]) return;
      var a=document.createElement("a"); a.href=item[0]; a.target="_blank"; a.rel="noopener"; a.className="btn"; a.textContent=item[1]; actions.appendChild(a);
    });
    var compare=document.createElement("a"); compare.href="#comparateur"; compare.className="btn btn-primary"; compare.textContent="Comparer ce modèle"; actions.appendChild(compare);
    carte.appendChild(actions);
    return carte;
  }

  function afficherResultats(produits, bandeId, priorites) {
    resultsBox.innerHTML = "";
    if (!produits.length) {
      var vide=document.createElement("p"); vide.className="hint";
      vide.textContent="Aucun modèle de notre sélection actuelle ne correspond à cette tranche de budget. Essayez une tranche voisine.";
      resultsBox.appendChild(vide); return;
    }
    var classes=produits.map(function(p){return {produit:p,score:scoreProduit(p,priorites)};}).sort(function(a,b){return b.score-a.score;}).slice(0,3);
    var intro=document.createElement("p"); intro.className="result-intro";
    intro.textContent="Voici jusqu’à 3 modèles correspondant à votre budget et à vos priorités.";
    resultsBox.appendChild(intro);
    classes.forEach(function(entry,index){ resultsBox.appendChild(creerFiche(entry.produit,index)); });
  }

  form.addEventListener("change", function (event) {
    if (event.target.name !== "priorite") return;
    var checked = form.querySelectorAll('input[name="priorite"]:checked');
    if (checked.length >= MAX_PRIORITES) {
      form.querySelectorAll('input[name="priorite"]:not(:checked)').forEach(function (input) { input.disabled = true; });
    } else {
      form.querySelectorAll('input[name="priorite"]').forEach(function (input) { input.disabled = false; });
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data=new FormData(form);
    var budget=data.get("budget");
    var priorites=data.getAll("priorite").slice(0,MAX_PRIORITES);
    if (!budget || !priorites.length) {
      resultsBox.innerHTML='<p class="hint">Choisissez un budget et au moins une priorité (jusqu’à 3) pour obtenir vos recommandations.</p>';
      return;
    }
    resultsBox.innerHTML='<p class="hint">Recherche des modèles adaptés…</p>';
    chargerProduits().then(function(produits){
      afficherResultats(filtrerParBudget(produits,budget),budget,priorites);
    }).catch(function(err){
      resultsBox.innerHTML='<p class="hint">Le questionnaire n’a pas pu charger les données produits ('+err.message+').</p>';
    });
  });
})();
