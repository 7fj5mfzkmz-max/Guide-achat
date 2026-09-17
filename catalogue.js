(function () {
  "use strict";

  var root = document.getElementById("catalogue");
  if (!root) return;

  var dataUrl = root.dataset.category + ".json";
  var grid = document.getElementById("catalogue-groups");
  var search = document.getElementById("catalogue-search");
  var status = document.getElementById("catalogue-status");
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

  function escapeText(value) {
    return value == null ? "" : String(value);
  }

  function matches(p, query) {
    if (!query) return true;
    var haystack = [p.nom, p.marque, p.critere_principal].concat(p.profil_adapte || []).join(" ").toLowerCase();
    return haystack.indexOf(query.toLowerCase()) !== -1;
  }

  function createCard(p) {
    var article = document.createElement("article");
    article.className = "catalogue-card";
    article.id = "catalogue-" + p.id;

    var top = document.createElement("div");
    top.className = "catalogue-card-top";
    var brand = document.createElement("span");
    brand.className = "catalogue-brand";
    brand.textContent = escapeText(p.marque);
    var role = document.createElement("span");
    role.className = "catalogue-role";
    role.textContent = escapeText(p.critere_principal || "À documenter");
    top.appendChild(brand); top.appendChild(role);

    var title = document.createElement("h3");
    title.textContent = escapeText(p.nom);

    var price = document.createElement("p");
    price.className = "catalogue-price";
    price.textContent = typeof p.prix_indicatif === "number" ? "≈ " + p.prix_indicatif + " €" : "Prix à vérifier";

    var profile = document.createElement("p");
    profile.className = "catalogue-profile";
    profile.textContent = p.pour_qui || "Fiche détaillée à compléter avant publication.";

    var tags = document.createElement("div");
    tags.className = "catalogue-tags";
    (p.profil_adapte || []).slice(0, 4).forEach(function (item) {
      var tag = document.createElement("span");
      tag.textContent = item;
      tags.appendChild(tag);
    });

    var actions = document.createElement("div");
    actions.className = "catalogue-actions";
    var details = document.createElement("a");
    details.className = "btn btn-primary";
    details.href = "#produit-" + p.id;
    details.textContent = "Voir la fiche";
    if (!document.getElementById("produit-" + p.id)) {
      details.href = "#catalogue-" + p.id;
    }
    actions.appendChild(details);

    if (p.ready_for_recommendation !== false) {
      var compare = document.createElement("button");
      compare.type = "button";
      compare.className = "btn";
      compare.dataset.compareId = p.id;
      compare.textContent = "Ajouter au comparateur";
      compare.addEventListener("click", function () {
        var key = "guide-achat-compare-selection";
        var ids = [];
        try { ids = JSON.parse(sessionStorage.getItem(key) || "[]"); } catch (e) {}
        if (ids.indexOf(p.id) === -1) ids.push(p.id);
        ids = ids.slice(-5);
        sessionStorage.setItem(key, JSON.stringify(ids));
        window.location.href = "comparateur.html";
      });
      actions.appendChild(compare);
    }

    article.appendChild(top);
    article.appendChild(title);
    article.appendChild(price);
    article.appendChild(profile);
    article.appendChild(tags);
    article.appendChild(actions);
    return article;
  }

  function render() {
    var query = search ? search.value.trim() : "";
    grid.innerHTML = "";
    var visible = products.filter(function (p) { return matches(p, query); });
    status.textContent = visible.length + " modèle" + (visible.length > 1 ? "s" : "") + " dans le catalogue.";

    GROUPS.forEach(function (group) {
      var items = visible.filter(group.test);
      if (!items.length) return;

      var details = document.createElement("details");
      details.className = "catalogue-group";
      if (group.id !== "a-documenter") details.open = true;

      var summary = document.createElement("summary");
      var left = document.createElement("span");
      left.innerHTML = "<strong>" + group.label + "</strong><small>" + items.length + " modèle" + (items.length > 1 ? "s" : "") + "</small>";
      summary.appendChild(left);
      details.appendChild(summary);

      var list = document.createElement("div");
      list.className = "catalogue-grid";
      items.forEach(function (p) { list.appendChild(createCard(p)); });
      details.appendChild(list);
      grid.appendChild(details);
    });
  }

  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("Réponse HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      products = data.produits || [];
      render();
    })
    .catch(function (err) {
      status.textContent = "Le catalogue n'a pas pu charger les modèles (" + err.message + ").";
    });

  if (search) search.addEventListener("input", render);
})();
