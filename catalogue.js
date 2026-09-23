(function () {
  "use strict";

  var root = document.getElementById("catalogue");
  if (!root) return;

  var dataUrl = root.dataset.category + ".json";
  var grid = document.getElementById("catalogue-groups");
  var search = document.getElementById("catalogue-search");
  var status = document.getElementById("catalogue-status");
  var budget = document.getElementById("catalogue-budget");
  var criterion = document.getElementById("catalogue-criterion");
  var brand = document.getElementById("catalogue-brand");
  var reset = document.getElementById("catalogue-reset");
  var products = [];

  var GROUPS = [
    { id: "moins-100", label: "Moins de 100 €", test: function (p) { return typeof p.prix_indicatif === "number" && p.prix_indicatif < 100; } },
    { id: "100-200", label: "100 à 200 €", test: function (p) { return typeof p.prix_indicatif === "number" && p.prix_indicatif >= 100 && p.prix_indicatif < 200; } },
    { id: "200-300", label: "200 à 300 €", test: function (p) { return typeof p.prix_indicatif === "number" && p.prix_indicatif >= 200 && p.prix_indicatif < 300; } },
    { id: "300-500", label: "300 à 500 €", test: function (p) { return typeof p.prix_indicatif === "number" && p.prix_indicatif >= 300 && p.prix_indicatif < 500; } },
    { id: "500-700", label: "500 à 700 €", test: function (p) { return typeof p.prix_indicatif === "number" && p.prix_indicatif >= 500 && p.prix_indicatif < 700; } },
    { id: "700-plus", label: "700 € et plus", test: function (p) { return typeof p.prix_indicatif === "number" && p.prix_indicatif >= 700; } },
    { id: "a-documenter", label: "Modèles en cours de documentation", test: function (p) { return typeof p.prix_indicatif !== "number"; } }
  ];

  var CRITERION_ALIASES = {
    autonomie: ["autonomie", "batterie"],
    photo: ["photo", "photographie", "camera"],
    performance: ["performance", "processeur"],
    gaming: ["gaming", "jeux", "jeu"],
    taille: ["taille", "compact", "format"],
    prix: ["prix", "qualite", "rapport"]
  };

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("fr-FR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeText(value) { return value == null ? "" : String(value); }

  function matchesText(p, query) {
    if (!query) return true;
    var haystack = normalize([
      p.nom, p.marque, p.critere_principal,
      (p.profil_adapte || []).join(" "),
      p.pour_qui,
      Object.values(p.caracteristiques || {}).join(" ")
    ].join(" "));
    var terms = normalize(query).split(/\s+/).filter(Boolean);
    return terms.every(function (term) {
      if (haystack.indexOf(term) !== -1) return true;
      return haystack.split(/\s+/).some(function (word) {
        return word.indexOf(term) === 0 || (term.length >= 5 && levenshtein(term, word) <= 1);
      });
    });
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 1) return 99;
    var prev = [], curr = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (j = 1; j <= b.length; j++) curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      var t = prev; prev = curr; curr = t;
    }
    return prev[b.length];
  }

  function matchesBudget(p) {
    var value = budget && budget.value;
    if (!value) return true;
    if (typeof p.prix_indicatif !== "number") return false;
    if (value === "moins-200") return p.prix_indicatif < 200;
    if (value === "200-300") return p.prix_indicatif >= 200 && p.prix_indicatif < 300;
    if (value === "300-500") return p.prix_indicatif >= 300 && p.prix_indicatif < 500;
    if (value === "500-700") return p.prix_indicatif >= 500 && p.prix_indicatif < 700;
    if (value === "700-plus") return p.prix_indicatif >= 700;
    return true;
  }

  function matchesCriterion(p) {
    var value = criterion && criterion.value;
    if (!value) return true;
    var haystack = normalize([p.critere_principal, (p.profil_adapte || []).join(" "), p.pour_qui].join(" "));
    return (CRITERION_ALIASES[value] || [value]).some(function (term) { return haystack.indexOf(normalize(term)) !== -1; });
  }

  function matchesBrand(p) {
    return !brand || !brand.value || normalize(p.marque) === normalize(brand.value);
  }

  function createCard(p) {
    var article = document.createElement("article");
    article.className = "catalogue-card";
    article.id = "catalogue-" + p.id;

    var top = document.createElement("div"); top.className = "catalogue-card-top";
    var brandEl = document.createElement("span"); brandEl.className = "catalogue-brand"; brandEl.textContent = escapeText(p.marque || "Marque à vérifier");
    var role = document.createElement("span"); role.className = "catalogue-role"; role.textContent = escapeText(p.critere_principal || (p.profil_adapte || [])[0] || "À documenter");
    top.appendChild(brandEl); top.appendChild(role); article.appendChild(top);

    var title = document.createElement("h3"); title.textContent = escapeText(p.nom); article.appendChild(title);
    var price = document.createElement("p"); price.className = "catalogue-price"; price.textContent = typeof p.prix_indicatif === "number" ? "≈ " + p.prix_indicatif + " €" : "Prix à vérifier"; article.appendChild(price);
    var profile = document.createElement("p"); profile.className = "catalogue-profile"; profile.textContent = p.pour_qui || "Fiche détaillée à compléter avant publication."; article.appendChild(profile);

    var tags = document.createElement("div"); tags.className = "catalogue-tags";
    (p.profil_adapte || []).slice(0, 4).forEach(function (item) { var tag=document.createElement("span"); tag.textContent=item; tags.appendChild(tag); });
    article.appendChild(tags);

    var actions = document.createElement("div"); actions.className = "catalogue-actions";
    var details = document.createElement("a"); details.className = "btn btn-primary"; details.href = "#catalogue-" + p.id; details.textContent = "Voir la fiche"; actions.appendChild(details);
    if (p.ready_for_recommendation !== false) {
      var compare = document.createElement("button"); compare.type="button"; compare.className="btn"; compare.textContent="Ajouter au comparateur";
      compare.addEventListener("click", function () {
        var key="guide-achat-compare-selection", ids=[]; try { ids=JSON.parse(sessionStorage.getItem(key)||"[]"); } catch(e) {}
        if (ids.indexOf(p.id)===-1) ids.push(p.id); sessionStorage.setItem(key, JSON.stringify(ids.slice(-5))); window.location.href="comparateur.html";
      });
      actions.appendChild(compare);
    }
    article.appendChild(actions);
    return article;
  }

  function populateBrands() {
    if (!brand) return;
    var names = [];
    products.forEach(function (p) { if (p.marque && names.indexOf(p.marque) === -1) names.push(p.marque); });
    names.sort(function(a,b){ return a.localeCompare(b, "fr"); });
    names.forEach(function (name) { var opt=document.createElement("option"); opt.value=name; opt.textContent=name; brand.appendChild(opt); });
  }

  function render() {
    if (!grid) return;
    var query = search ? search.value.trim() : "";
    grid.innerHTML = "";
    var visible = products.filter(function (p) {
      return matchesText(p, query) && matchesBudget(p) && matchesCriterion(p) && matchesBrand(p);
    });
    if (status) status.textContent = visible.length + " modèle" + (visible.length > 1 ? "s" : "") + " correspondent aux filtres.";

    var first = true;
    GROUPS.forEach(function (group) {
      var items = visible.filter(group.test);
      if (!items.length) return;
      var details=document.createElement("details"); details.className="catalogue-group"; details.open=first; first=false;
      var summary=document.createElement("summary");
      var left=document.createElement("span"); var strong=document.createElement("strong"); strong.textContent=group.label; var small=document.createElement("small"); small.textContent=items.length+" modèle"+(items.length>1?"s":""); left.appendChild(strong); left.appendChild(small); summary.appendChild(left); details.appendChild(summary);
      var list=document.createElement("div"); list.className="catalogue-grid"; items.forEach(function(p){list.appendChild(createCard(p));}); details.appendChild(list); grid.appendChild(details);
    });
    if (!visible.length) { var empty=document.createElement("p"); empty.className="catalogue-no-result"; empty.textContent="Aucun modèle ne correspond à ces critères. Élargissez le budget ou réinitialisez les filtres."; grid.appendChild(empty); }
  }

  function resetFilters() {
    if (search) search.value=""; if (budget) budget.value=""; if (criterion) criterion.value=""; if (brand) brand.value=""; render();
  }

  [search,budget,criterion,brand].forEach(function(el){ if(el) el.addEventListener("input",render); });
  if (reset) reset.addEventListener("click", resetFilters);

  fetch(dataUrl).then(function(r){ if(!r.ok) throw new Error("Réponse HTTP "+r.status); return r.json(); })
    .then(function(data){ products=data.produits||[]; populateBrands(); render(); })
    .catch(function(err){ if(status) status.textContent="Le catalogue n'a pas pu charger les modèles ("+err.message+")."; });
})();
