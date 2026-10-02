/* Registre des catégories — SOURCE UNIQUE.
   Pour ajouter une catégorie : passer live:true (et href) ou ajouter une entrée.
   Le menu, l'accueil (cartes, hero, bandeau, exemples) et les couleurs s'adaptent seuls.
   Avec plusieurs catégories live, le hero et les exemples de l'accueil font la ronde. */
(function () {
  "use strict";
  var LIST = [
    { id: "smartphones", label: "Smartphones", live: true, href: "smartphones.html", tone: "orchid", icon: "phone",
      blurb: "Écran, autonomie, photo et performances : les points qui changent réellement l’usage.",
      terms: ["Écran", "Batterie", "Photo", "Puce", "Autonomie", "Charge", "Étanchéité", "Mises à jour", "Stockage", "Prix"],
      chips: [["120 Hz", "hz"], ["5 000 mAh", "battery"], ["IP67", "drop"], ["OLED", "pixels"]],
      weights: "smartphones",
      pairs: [
        ["120 Hz", "À 120 Hz, l’écran peut renouveler son affichage jusqu’à 120 fois par seconde ; les mouvements paraissent généralement plus fluides."],
        ["IP67", "IP67 correspond à une protection contre la poussière et à une immersion temporaire dans des conditions définies."],
        ["OLED", "Chaque pixel produit sa propre lumière ; il peut donc être fortement atténué ou éteint pour afficher un noir très profond."]
      ],
      example: { name: "Samsung Galaxy A56", note: "300 € indicatif", scores: [["Étudiant", 8], ["Professionnel", 8], ["Photographe", 7], ["Gamer", 6]] },
      stage: { title: "Compatibilité", bars: [89, 78, 67], score: 8 } },
    { id: "pc", label: "PC portables", live: false, tone: "teal", icon: "laptop",
      blurb: "Choisir un PC selon les logiciels, la mobilité et le budget.", terms: ["Processeur", "RAM", "Stockage", "Écran", "Poids", "Autonomie"] },
    { id: "batteries", label: "Batteries externes", live: false, tone: "lime", icon: "battery",
      blurb: "Capacité, puissance de charge et compatibilité USB-C.", terms: ["Capacité", "Puissance", "USB-C", "Poids"] },
    { id: "ecouteurs", label: "Écouteurs Bluetooth", live: false, tone: "coral", icon: "buds",
      blurb: "Qualité sonore, confort, autonomie et réduction de bruit.", terms: ["Son", "Confort", "Autonomie", "Réduction de bruit"] },
    { id: "montres", label: "Montres", live: false, tone: "blue", icon: "watch",
      blurb: "Fonctions utiles, suivi sportif et autonomie réelle.", terms: ["Capteurs", "GPS", "Autonomie", "Écran"] },
    { id: "projecteurs", label: "Projecteurs", live: false, tone: "amber", icon: "projector",
      blurb: "Luminosité, contraste et distance de projection.", terms: ["Luminosité", "Contraste", "Distance", "Résolution"] }
  ];

  /* Dessins de catégorie (traits simples, colorés par --tone côté CSS). */
  var ICONS = {
    phone: '<rect x="42" y="6" width="36" height="68" rx="9"/><rect x="47" y="16" width="26" height="44" rx="3"/><path d="M55 10h10"/>',
    laptop: '<rect x="28" y="14" width="64" height="40" rx="4"/><path d="M18 62h84l-6 8H24z"/>',
    battery: '<rect x="22" y="24" width="68" height="32" rx="6"/><path d="M92 34h6v12h-6"/><path d="M52 31l-9 10h11l-5 9 15-14H54z"/>',
    buds: '<path d="M40 20a12 12 0 0 1 12 12v18a7 7 0 0 1-14 0V33"/><path d="M80 20a12 12 0 0 0-12 12v18a7 7 0 0 0 14 0V33"/>',
    watch: '<path d="M48 6h24v68H48z"/><rect x="35" y="22" width="50" height="36" rx="10"/><circle cx="60" cy="40" r="9"/>',
    projector: '<rect x="22" y="26" width="70" height="30" rx="7"/><circle cx="40" cy="41" r="8"/><path d="M62 34h22M62 41h16M62 48h11"/>'
  };

  var C = window.GuideCategories = {
    list: LIST,
    live: function () { return LIST.filter(function (c) { return c.live; }); },
    get: function (id) { return LIST.filter(function (c) { return c.id === id; })[0]; },
    icon: function (c) { return '<svg viewBox="0 0 120 80" aria-hidden="true" focusable="false">' + (ICONS[c.icon] || "") + "</svg>"; },
    /* « J’ai déjà un produit » : direct si une seule catégorie est ouverte, sinon choix des catégories. */
    analyzeHref: function () { var l = C.live(); return l.length === 1 ? l[0].href + "#analyse-modele" : "index.html#categories"; },
    startLabel: function () { var l = C.live(); return l.length === 1 ? "Ouvrir le guide " + l[0].label.toLowerCase() : "Choisir une catégorie"; },
    startHref: function () { var l = C.live(); return l.length === 1 ? l[0].href : "index.html#categories"; }
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }

  /* Menu : rendu identique sur toutes les pages. */
  var nav = document.querySelector(".site-nav");
  if (nav) {
    nav.innerHTML = LIST.map(function (c) {
      return c.live
        ? '<a href="' + c.href + '" data-tone="' + c.tone + '">' + esc(c.label) + "</a>"
        : '<span aria-disabled="true" class="site-nav-disabled" title="Bientôt disponible">' + esc(c.label) + "</span>";
    }).join("");
  }

  /* Liens génériques posés dans les pages : data-cat-link="start | analyze". */
  document.querySelectorAll("[data-cat-link]").forEach(function (a) {
    var k = a.getAttribute("data-cat-link");
    a.setAttribute("href", k === "analyze" ? C.analyzeHref() : C.startHref());
    if (a.hasAttribute("data-cat-label")) a.textContent = C.startLabel() + " →";
  });

  /* Cartes de catégories (accueil). */
  var cards = document.getElementById("hx-cards");
  if (cards) {
    cards.innerHTML = LIST.map(function (c) {
      var inner = '<div class="hx-card-text"><span class="hx-badge' + (c.live ? "" : " hx-badge-soon") + '">' + (c.live ? "Guide disponible" : "Bientôt disponible") + "</span><h3>" + esc(c.label) + "</h3><p>" + esc(c.blurb) + "</p>" +
        (c.live ? '<span class="hx-arrow">Lire le guide <i aria-hidden="true">→</i></span>' : "") + "</div>" +
        '<div class="hx-card-art" aria-hidden="true"><span class="hx-card-icon">' + C.icon(c) + "</span>" +
        (c.chips ? c.chips.map(function (t) { return t[0]; }) : c.terms).slice(0, 4).map(function (t, i) { return '<span class="hx-mini-chip m' + (i + 1) + '">' + esc(t) + "</span>"; }).join("") + "</div>";
      return c.live
        ? '<a class="hx-card hx-card-live hx-reveal" data-tone="' + c.tone + '" href="' + c.href + '">' + inner + "</a>"
        : '<div class="hx-card hx-card-soon hx-reveal" data-tone="' + c.tone + '">' + inner + "</div>";
    }).join("");
  }

  /* Bandeaux défilants : termes des catégories ouvertes. */
  var marquee = document.getElementById("hx-marquee");
  if (marquee) {
    var terms = [];
    C.live().forEach(function (c) { terms = terms.concat(c.terms); });
    var tones = ["orchid", "teal", "lime", "coral", "blue", "amber"];
    var chip = function (arr) { var h = arr.map(function (t, i) { return '<span data-tone="' + tones[i % tones.length] + '">' + esc(t) + "</span>"; }).join(""); return h + h; };
    marquee.innerHTML = '<div class="hx-track">' + chip(terms) + '</div><div class="hx-track is-rev">' + chip(terms.slice().reverse()) + "</div>";
  }
})();
