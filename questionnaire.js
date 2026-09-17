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
    "moins-100": { min: 0, max: 100 },
    "100-200": { min: 100, max: 200 },
    "moins-200": { min: 0, max: 200 },
    "200-300": { min: 200, max: 300 },
    "300-500": { min: 300, max: 500 },
    "500-700": { min: 500, max: 700 },
    "700-plus": { min: 700, max: null }
  };

  function chargerProduits() {
    if (produitsCache) return Promise.resolve(produitsCache);
    return fetch(dataUrl).then(function (r) {
      if (!r.ok) throw new Error("Réponse HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      produitsCache = (data.produits || []).filter(function (p) {
        return p.ready_for_recommendation !== false && typeof p.prix_indicatif === "number" && p.scores;
      });
      return produitsCache;
    });
  }

  function scoreProduit(produit, priorites) {
    var total = 0, poidsTotal = 0;
    CRITERES.forEach(function (critere) {
      var poids = priorites.indexOf(critere) !== -1 ? 3 : 1;
      var valeur = typeof produit.scores[critere] === "number" ? produit.scores[critere] : 0;
      total += valeur * poids;
      poidsTotal += poids;
    });
    return poidsTotal ? total / poidsTotal : 0;
  }

  function filtrerParBudget(produits, bandeId) {
    var bande = BUDGET_BANDS[bandeId];
    if (!bande) return produits;
    return produits.filter(function (p) {
      return p.prix_indicatif >= bande.min && (bande.max === null || p.prix_indicatif < bande.max);
    });
  }

  function texteProduit(produit) {
    return JSON.stringify(produit || {}).toLowerCase();
  }

  function correspondTaille(produit, choix) {
    if (!choix || choix === "indifferent") return true;
    var score = produit.scores && typeof produit.scores.taille === "number" ? produit.scores.taille : null;
    if (score === null) return true;
    if (choix === "compact") return score >= 8;
    if (choix === "standard") return score >= 5 && score < 8;
    if (choix === "grand") return score < 5;
    return true;
  }

  function correspondIndispensable(produit, choix) {
    if (!choix || choix === "aucune") return true;
    var t = texteProduit(produit);
    if (choix === "nfc") return /nfc|sans contact/.test(t);
    if (choix === "esim") return /esim/.test(t);
    if (choix === "ip") return /ip6[5678]|ip5[234]/.test(t);
    if (choix === "sans-fil") return /recharge sans fil|charge sans fil|qi|magsafe/.test(t);
    return true;
  }

  function ajouterComparaison(id) {
    var key = "guide-achat-compare-selection", ids = [];
    try { ids = JSON.parse(sessionStorage.getItem(key) || "[]"); } catch (e) {}
    if (ids.indexOf(id) === -1) ids.push(id);
    ids = ids.slice(-5);
    sessionStorage.setItem(key, JSON.stringify(ids));
    window.location.href = "comparateur.html";
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

    var intro = document.createElement("p");
    intro.className = "result-fit";
    intro.textContent = produit.pour_qui || "Ce modèle correspond à une partie de vos critères.";
    carte.appendChild(intro);

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
    [[produit.fabricant_url, "Fabricant"], [produit.kimovil_url, "Kimovil"], [produit.idealo_url, "Idealo"]].forEach(function (item) {
      if (!item[0]) return;
      var a=document.createElement("a"); a.href=item[0]; a.target="_blank"; a.rel="noopener"; a.className="btn"; a.textContent=item[1]; actions.appendChild(a);
    });
    var compare=document.createElement("button"); compare.type="button"; compare.className="btn btn-primary"; compare.textContent="Comparer ce modèle";
    compare.addEventListener("click", function () { ajouterComparaison(produit.id); });
    actions.appendChild(compare);
    carte.appendChild(actions);
    return carte;
  }

  function afficherResultats(produits, priorites) {
    resultsBox.innerHTML = "";
    if (!produits.length) {
      var vide=document.createElement("p"); vide.className="hint";
      vide.textContent="Aucun modèle documenté dans cette tranche de budget pour le moment. La sélection sera enrichie progressivement.";
      resultsBox.appendChild(vide); return;
    }
    var classes=produits.map(function(p){return {produit:p,score:scoreProduit(p,priorites)};}).sort(function(a,b){return b.score-a.score;}).slice(0,3);
    var intro=document.createElement("p"); intro.className="result-intro";
    intro.textContent="Voici jusqu’à 3 modèles documentés qui correspondent à votre budget et à vos priorités.";
    resultsBox.appendChild(intro);
    classes.forEach(function(entry,index){ resultsBox.appendChild(creerFiche(entry.produit,index)); });
  }

  form.addEventListener("change", function (event) {
    if (event.target.name !== "priorite") return;
    var checked = form.querySelectorAll('input[name="priorite"]:checked');
    form.querySelectorAll('input[name="priorite"]').forEach(function (input) {
      input.disabled = !input.checked && checked.length >= MAX_PRIORITES;
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data=new FormData(form);
    var budget=data.get("budget");
    var priorites=data.getAll("priorite").slice(0,MAX_PRIORITES);
    var tailleUsage=data.get("taille_usage");
    var indispensable=data.get("indispensable");
    if (!budget || !priorites.length) {
      resultsBox.innerHTML='<p class="hint">Choisissez un budget et au moins une priorité (jusqu’à 3) pour obtenir vos recommandations.</p>';
      return;
    }
    resultsBox.innerHTML='<p class="hint">Recherche des modèles adaptés…</p>';
    chargerProduits().then(function(produits){
      var candidats = filtrerParBudget(produits,budget).filter(function (p) {
        return correspondTaille(p, tailleUsage) && correspondIndispensable(p, indispensable);
      });
      afficherResultats(candidats,priorites);
    }).catch(function(err){
      resultsBox.innerHTML='<p class="hint">Le questionnaire n’a pas pu charger les données produits ('+err.message+').</p>';
    });
  });
})();
