(function () {
  "use strict";

  var root = document.documentElement;
  var header = document.querySelector(".site-header");
  var fab = document.getElementById("mobile-fab");
  var drawer = document.getElementById("mobile-drawer");
  var drawerClose = document.getElementById("drawer-close");
  var backdrop = document.getElementById("drawer-backdrop");
  var themeButton = document.getElementById("theme-toggle");
  var searchInput = document.getElementById("site-search-input");
  var searchResults = document.getElementById("site-search-results");

  function applyTheme(theme) {
    root.classList.toggle("dark-theme", theme === "dark");
    if (themeButton) {
      themeButton.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      themeButton.setAttribute("aria-label", theme === "dark" ? "Désactiver le thème sombre" : "Activer le thème sombre");
      var strong = themeButton.querySelector("strong");
      var small = themeButton.querySelector("small");
      var icon = themeButton.querySelector(".drawer-action-icon");
      if (strong) strong.textContent = theme === "dark" ? "Thème clair" : "Thème sombre";
      if (small) small.textContent = theme === "dark" ? "Revenir aux couleurs claires" : "Adapter les couleurs à la lecture de nuit";
      if (icon) icon.textContent = theme === "dark" ? "☀" : "◐";
    }
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem("guide-achat-theme"); } catch (e) {}
  var initialTheme = savedTheme || "dark";
  applyTheme(initialTheme);

  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var next = root.classList.contains("dark-theme") ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("guide-achat-theme", next); } catch (e) {}
    });
  }

  function setDrawer(open) {
    if (!drawer) return;
    drawer.hidden = !open;
    document.body.classList.toggle("drawer-open", open);
    if (fab) fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && searchInput) setTimeout(function () { searchInput.focus(); }, 80);
  }
  if (fab) fab.addEventListener("click", function () { setDrawer(true); });
  if (drawerClose) drawerClose.addEventListener("click", function () { setDrawer(false); });
  if (backdrop) backdrop.addEventListener("click", function () { setDrawer(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setDrawer(false); });

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  var index = [];
  var pages = [
    { url: "index.html", label: "Accueil" },
    { url: "smartphones.html", label: "Smartphones" },
    { url: "lexique.html", label: "Lexique" },
    { url: "comparateur.html", label: "Comparateur" }
  ];

  function cleanText(text) { return (text || "").replace(/\s+/g, " ").trim(); }

  function addPageToIndex(doc, page) {
    var seen = {};
    doc.querySelectorAll("h1, h2, h3, .cat-card h3, .faq-item summary").forEach(function (heading) {
      var title = cleanText(heading.textContent);
      if (!title || seen[title]) return;
      seen[title] = true;
      var section = heading.closest("section");
      var container = section || heading.closest(".cat-card") || heading.parentElement;
      var text = cleanText(container ? container.textContent : heading.textContent);
      var id = section && section.id ? section.id : "";
      index.push({ title: title, text: text.slice(0, 260), page: page.label, url: page.url + (id ? "#" + id : "") });
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

  function renderResults(query) {
    if (!searchResults) return;
    var q = cleanText(query).toLowerCase();
    searchResults.innerHTML = "";
    if (!q) {
      searchResults.innerHTML = '<p class="search-empty">Recherchez une caractéristique, un usage ou un modèle.</p>';
      return;
    }
    var terms = q.split(/\s+/).filter(Boolean);
    var matches = index.filter(function (item) {
      var haystack = (item.title + " " + item.text).toLowerCase();
      return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
    }).slice(0, 12);
    if (!matches.length) {
      searchResults.innerHTML = '<p class="search-empty">Aucun résultat. Essayez un terme plus général.</p>';
      return;
    }
    matches.forEach(function (item) {
      var link = document.createElement("a");
      link.className = "search-result";
      link.href = item.url;
      link.innerHTML = '<span class="search-result-page"></span><strong></strong><p></p>';
      link.querySelector(".search-result-page").textContent = item.page;
      link.querySelector("strong").textContent = item.title;
      link.querySelector("p").textContent = item.text;
      link.addEventListener("click", function () { setDrawer(false); });
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
      window.gsap.fromTo(el, {autoAlpha: 0, y: 22}, {
        autoAlpha: 1, y: 0, duration: .65, ease: "power2.out", delay: Math.min(i * .025, .18)
      });
    });

    var phones = document.querySelectorAll(".site-redesign .media-device-front, .site-redesign .media-phone-stack, .site-redesign .visual-phone");
    phones.forEach(function(el, i) {
      window.gsap.to(el, {
        y: i % 2 ? -8 : 8,
        rotation: "+=" + (i % 2 ? 1.5 : -1.5),
        duration: 3.2 + i * .25,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });

    var pulses = document.querySelectorAll(".site-redesign .visual-pulse, .site-redesign .media-float-dot");
    pulses.forEach(function(el) {
      window.gsap.to(el, {scale: 1.18, opacity: .2, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut"});
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditorialMotion);
  } else {
    initEditorialMotion();
  }
})();
