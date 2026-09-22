(function () {
  "use strict";

  function initGuideTools() {
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
      themeButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var next = root.classList.contains("dark-theme") ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem("guide-achat-theme", next); } catch (e) {}
      }, false);
    }

    function setSearch(open) {
      if (!searchPanel) return;
      searchPanel.hidden = !open;
      searchPanel.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("search-open", open);
      if (searchButton) searchButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && searchInput) {
        setTimeout(function () { searchInput.focus(); }, 60);
      }
    }

    if (searchButton) {
      searchButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setSearch(true);
      }, false);
    }
    if (searchClose) searchClose.addEventListener("click", function () { setSearch(false); }, false);
    if (searchBackdrop) searchBackdrop.addEventListener("click", function () { setSearch(false); }, false);

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
    initEditorialMotion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGuideTools, { once: true });
  } else {
    initGuideTools();
  }
})();
