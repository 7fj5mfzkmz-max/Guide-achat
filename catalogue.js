(function () {
  "use strict";

  var root = document.getElementById("catalogue");
  if (!root) return;

  var dataUrl = root.dataset.category + ".json";
  var grid = document.getElementById("catalogue-groups");
  var status = document.getElementById("catalogue-status");
  var budget = document.getElementById("catalogue-budget");
  var criterion = document.getElementById("catalogue-criterion");
  var brand = document.getElementById("catalogue-brand");
  var reset = document.getElementById("catalogue-reset");
  var products = [];

  var CRITERION_ALIASES = {
    autonomie: ["autonomie", "batterie"],
    photo: ["photo", "photographie", "camera"],
    performance: ["performance", "processeur"],
    gaming: ["gaming", "jeux", "jeu"],
    taille: ["taille", "compact", "format"],
    prix: ["prix", "qualite", "rapport"]
  };

  /* Année utilisée uniquement comme indice visuel.
     Les données peuvent ensuite être complétées directement dans le JSON. */
  var RELEASE_YEARS = {
    "Samsung Galaxy A56": 2025,
    "Xiaomi 15T": 2025,
    "Apple iPhone 17 Pro": 2025,
    "OnePlus 15": 2025,
    "ROG Phone 9": 2024,
    "Galaxy Z Fold8": 2026,
    "Pixel 10 Pro XL": 2025,
    "Pixel 10": 2025,
    "Galaxy S26 Ultra": 2026,
    "iPhone 18 Pro Max": 2026,
    "Xperia 1 VII": 2025,
    "iPhone 18 Pro": 2026,
    "Galaxy S26+": 2026,
    "Pixel 10a": 2026,
    "OnePlus Nord 5": 2025,
    "iPhone Duo": 2026,
    "Nothing Phone (4)": 2026,
    "Xiaomi 16 Pro": 2025,
    "Honor Magic 8 Pro": 2025,
    "Galaxy S26": 2026,
    "Pixel 10 Pro": 2025,
    "Motorola Edge 70 Pro": 2026,
    "Xiaomi 16 Ultra": 2026,
    "Samsung Galaxy A17 5G": 2025,
    "Xiaomi Redmi Note 15 4G": 2025,
    "Xiaomi Redmi Note 15 5G": 2025,
    "realme P3 5G": 2025,
    "realme C67": 2023,
    "Xiaomi Redmi 15C": 2025,
    "realme C75": 2024,
    "Xiaomi Redmi Note 14 5G": 2024,
    "Motorola Moto G55 5G": 2024,
    "HONOR 400 Lite": 2025,
    "POCO C85": 2025,
    "Xiaomi Redmi Note 11S": 2022,
    "Samsung Galaxy A23 5G": 2022,
    "Motorola Moto G06 Power": 2025,
    "Motorola Moto G06": 2025,
    "Blackview Shark 8": 2023,
    "ZTE Blade V70 Vita": 2025,
    "Xiaomi Redmi A5": 2025,
    "POCO C71": 2025,
    "Xiaomi Redmi A3": 2024
  };

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("fr-FR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function matchesBudget(p) {
    var value = budget && budget.value;
    if (!value || typeof p.prix_indicatif !== "number") return false;
    if (value === "moins-200") return p.prix_indicatif < 200;
    if (value === "200-300") return p.prix_indicatif >= 200 && p.prix_indicatif < 300;
    if (value === "300-500") return p.prix_indicatif >= 300 && p.prix_indicatif < 500;
    if (value === "500-700") return p.prix_indicatif >= 500 && p.prix_indicatif < 700;
    if (value === "700-plus") return p.prix_indicatif >= 700;
    return false;
  }

  function matchesCriterion(p) {
    if (!criterion || !criterion.value) return false;
    var haystack = normalize([
      p.critere_principal,
      (p.profil_adapte || []).join(" "),
      p.pour_qui,
      Object.keys(p.scores || {}).join(" ")
    ].join(" "));
    return (CRITERION_ALIASES[criterion.value] || [criterion.value]).some(function (term) {
      return haystack.indexOf(normalize(term)) !== -1;
    });
  }

  function matchesBrand(p) {
    return !!brand && !!brand.value && normalize(p.marque) === normalize(brand.value);
  }

  function criterionScore(p) {
    return p.scores && typeof p.scores[criterion.value] === "number" ? p.scores[criterion.value] : 0;
  }

  function yearFor(p) {
    return p.annee_sortie || RELEASE_YEARS[p.nom] || "année ?";
  }

  function createRecommendation(p, index) {
    var article = document.createElement("article");
    article.className = "catalogue-recommendation";
    article.style.animationDelay = (index * 0.06) + "s";

    var name = document.createElement("h3");
    name.className = "rec-name";
    name.textContent = p.nom || "Modèle non renseigné";
    article.appendChild(name);

    var meta = document.createElement("div");
    meta.className = "rec-meta";

    var price = document.createElement("span");
    price.textContent = typeof p.prix_indicatif === "number" ? "≈ " + p.prix_indicatif + " €" : "prix ?";
    meta.appendChild(price);

    var year = document.createElement("span");
    year.textContent = yearFor(p);
    meta.appendChild(year);

    article.appendChild(meta);
    return article;
  }

  function populateBrands() {
    if (!brand) return;
    var names = [];
    products.forEach(function (p) {
      if (p.marque && names.indexOf(p.marque) === -1) names.push(p.marque);
    });
    names.sort(function (a, b) { return a.localeCompare(b, "fr"); });
    names.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      brand.appendChild(opt);
    });
  }

  function render() {
    if (!grid) return;
    grid.innerHTML = "";

    var complete = budget && budget.value && criterion && criterion.value && brand && brand.value;
    if (!complete) {
      if (status) status.textContent = "Choisissez les 3 critères pour afficher les recommandations.";
      return;
    }

    var visible = products
      .filter(function (p) { return matchesBudget(p) && matchesCriterion(p) && matchesBrand(p); })
      .sort(function (a, b) { return criterionScore(b) - criterionScore(a); })
      .slice(0, 3);

    if (status) {
      status.textContent = visible.length
        ? visible.length + " recommandation" + (visible.length > 1 ? "s" : "") + " correspondant à vos critères."
        : "Aucun modèle ne correspond à ces 3 critères.";
    }

    visible.forEach(function (p, i) { grid.appendChild(createRecommendation(p, i)); });
  }

  function resetFilters() {
    if (budget) budget.value = "";
    if (criterion) criterion.value = "";
    if (brand) brand.value = "";
    render();
  }

  [budget, criterion, brand].forEach(function (el) {
    if (el) el.addEventListener("change", render);
  });
  if (reset) reset.addEventListener("click", resetFilters);

  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("Réponse HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      products = data.produits || [];
      populateBrands();
      render();
    })
    .catch(function (err) {
      if (status) status.textContent = "Le catalogue n'a pas pu charger les modèles (" + err.message + ").";
    });
})();