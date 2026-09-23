(function () {
  "use strict";
  var root = document.documentElement;
  var header = document.querySelector(".site-header");
  var themeButton = document.getElementById("theme-toggle");
  var searchButton = document.getElementById("search-toggle");
  var searchPanel = document.getElementById("search-panel");
  var searchClose = document.getElementById("search-close");
  var searchBackdrop = searchPanel && searchPanel.querySelector(".search-panel-backdrop");
  var searchInput = document.getElementById("site-search-input");
  var searchResults = document.getElementById("site-search-results");

  function applyTheme(theme) {
    var dark = theme === "dark";
    root.classList.toggle("dark-theme", dark);
    if (!themeButton) return;
    themeButton.setAttribute("aria-pressed", dark ? "true" : "false");
    themeButton.setAttribute("aria-label", dark ? "Activer le thème clair" : "Activer le thème sombre");
    var icon = themeButton.querySelector(".theme-icon");
    if (icon) icon.textContent = dark ? "☀" : "☾";
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem("guide-achat-theme"); } catch (e) {}
  applyTheme(savedTheme === "dark" ? "dark" : "light");

  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var next = root.classList.contains("dark-theme") ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("guide-achat-theme", next); } catch (e) {}
    });
  }

  function setSearch(open) {
    if (!searchPanel) return;
    searchPanel.hidden = !open;
    document.body.classList.toggle("search-open", open);
    if (searchButton) searchButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && searchInput) {
      setTimeout(function () { searchInput.focus(); }, 60);
    }
  }
  if (searchButton) searchButton.addEventListener("click", function () { setSearch(true); });
  if (searchClose) searchClose.addEventListener("click", function () { setSearch(false); });
  if (searchBackdrop) searchBackdrop.addEventListener("click", function () { setSearch(false); });

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setSearch(false);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setSearch(true);
    }
  });

  (function markCurrentNav(){
    var current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".site-nav a").forEach(function(link){
      var href = (link.getAttribute("href") || "").split("#")[0];
      if (href === current) link.setAttribute("aria-current", "page");
    });
  })();

  var index = [];
  var pages = [
    { url: "index.html", label: "Accueil" },
    { url: "smartphones.html", label: "Smartphones" },
    { url: "lexique.html", label: "Lexique" },
    { url: "comparateur.html", label: "Comparateur" }
  ];
  function cleanText(text) { return (text || "").replace(/\s+/g, " ").trim(); }
  function normalizeText(text) {
    return cleanText(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  var SEARCH_ALIASES = {
    "autonomie": ["batterie", "mah", "tenir la journee", "duree de vie"],
    "batterie": ["autonomie", "mah", "charge"],
    "photo": ["appareil photo", "camera", "megapixels", "mpx", "zoom", "teleobjectif"],
    "camera": ["photo", "appareil photo", "mpx", "megapixels"],
    "ecran": ["display", "oled", "amoled", "lcd", "hz", "luminosite", "resolution"],
    "fluidite": ["hz", "60 hz", "90 hz", "120 hz", "rafraichissement"],
    "resolution": ["hd", "fhd", "fhd+", "qhd", "pixels", "nettete"],
    "performance": ["processeur", "puce", "gpu", "gaming", "jeu", "rapidite"],
    "ram": ["memoire vive", "multitache", "applications en arriere-plan"],
    "stockage": ["go", "ufs", "espace", "photos", "videos", "micro sd"],
    "charge": ["recharge", "watts", "w", "charge rapide"],
    "mise a jour": ["support logiciel", "securite", "correctifs", "android", "ios"],
    "mises a jour": ["support logiciel", "securite", "correctifs", "android", "ios"],
    "iphone": ["apple", "ios"],
    "android": ["galaxy", "pixel", "xiaomi", "oneplus", "hyperos", "one ui"],
    "teleobjectif": ["zoom optique", "photo", "appareil photo"],
    "120 hz": ["120hz", "fluidite", "rafraichissement"],
    "5000 mah": ["5000mah", "batterie", "autonomie"]
  };
  function addPageToIndex(doc, page) {
    var seen = {};
    doc.querySelectorAll("h1, h2, h3, h4, .cat-card h3, .faq-item summary, [data-search-title]").forEach(function (heading) {
      var title = cleanText(heading.textContent);
      if (!title || seen[title]) return;
      seen[title] = true;
      var section = heading.closest("section");
      var container = section || heading.closest(".cat-card") || heading.parentElement;
      var text = cleanText(container ? container.textContent : heading.textContent);
      var id = section && section.id ? section.id : "";
      index.push({ title: title, text: text.slice(0, 900), page: page.label, url: page.url + (id ? "#" + id : "") });
    });
  }
  function loadIndex() {
    pages.forEach(function (page) {
      var current = location.pathname.split("/").pop() || "index.html";
      if (current === page.url) { addPageToIndex(document, page); return; }
      fetch(page.url).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, "text/html");
        addPageToIndex(doc, page);
      }).catch(function () {});
    });
  }
  function searchScore(item, query) {
    var q = normalizeText(query);
    var title = normalizeText(item.title);
    var text = normalizeText(item.text);
    if (!q) return 0;
    var terms = q.split(/\s+/).filter(Boolean);
    var score = title === q ? 100 : 0;
    if (title.indexOf(q) !== -1) score += 45;
    terms.forEach(function (term) {
      if (title.indexOf(term) !== -1) score += 22;
      else if (text.indexOf(term) !== -1) score += 8;
      var aliases = SEARCH_ALIASES[term] || [];
      aliases.forEach(function (alias) {
        var a = normalizeText(alias);
        if (title.indexOf(a) !== -1) score += 14;
        else if (text.indexOf(a) !== -1) score += 5;
      });
    });
    // Small tolerance for a one-character typo on a meaningful term.
    if (terms.length === 1 && terms[0].length >= 5 && !title.includes(terms[0]) && !text.includes(terms[0])) {
      var words = (title + " " + text).split(/[^a-z0-9+]+/).filter(function(w){ return w.length >= 5; });
      var target = terms[0];
      words.forEach(function(word){
        var distance = 0, i, j;
        var a = target, b = word;
        var prev = Array.from({length:b.length+1}, function(_,k){return k;});
        for(i=0;i<a.length;i++){
          var cur=[i+1];
          for(j=0;j<b.length;j++) cur[j+1]=Math.min(cur[j]+1, prev[j+1]+1, prev[j]+(a[i]===b[j]?0:1));
          prev=cur;
        }
        distance=prev[b.length];
        if(distance <= 1) score += 4;
      });
    }
    return score;
  }
  function renderResults(query) {
    if (!searchResults) return;
    var q = cleanText(query);
    searchResults.innerHTML = "";
    if (!q) {
      searchResults.innerHTML = '<p class="search-empty">Recherchez une caractéristique, un usage ou un modèle.</p>';
      return;
    }
    var matches = index.map(function(item){ return {item:item, score:searchScore(item,q)}; }).filter(function(x){ return x.score > 0; }).sort(function(a,b){ return b.score-a.score; }).slice(0,12);
    if (!matches.length) {
      searchResults.innerHTML = '<p class="search-empty">Aucun résultat. Essayez « autonomie », « photo », « écran », « RAM », « stockage » ou un modèle.</p>';
      return;
    }
    matches.forEach(function (match) {
      var item=match.item;
      var link = document.createElement("a");
      link.className = "search-result";
      link.href = item.url;
      link.innerHTML = '<span class="search-result-page"></span><strong></strong><p></p>';
      link.querySelector(".search-result-page").textContent = item.page;
      link.querySelector("strong").textContent = item.title;
      link.querySelector("p").textContent = item.text;
      link.addEventListener("click", function () { setSearch(false); });
      searchResults.appendChild(link);
    });
  }
  if (searchInput) searchInput.addEventListener("input", function () { renderResults(searchInput.value); });
  loadIndex();

  function initEditorialMotion() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.gsap) return;
    var reveal = document.querySelectorAll(".site-redesign .section, .site-redesign .cat-card, .site-redesign .lex-entry, .site-redesign .article-hero-stage");
    reveal.forEach(function(el, i) {
      window.gsap.fromTo(el, {autoAlpha: 0, y: 22}, {autoAlpha: 1, y: 0, duration: .65, ease: "power2.out", delay: Math.min(i * .025, .18)});
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initEditorialMotion);
  else initEditorialMotion();
})();
