(function () {
  "use strict";

  var root = document.documentElement;
  var themeButton = document.getElementById("theme-toggle");
  var searchButton = document.getElementById("search-toggle");
  var searchPanel = document.getElementById("site-search");
  var searchInput = document.getElementById("site-search-input");
  var searchResults = document.getElementById("site-search-results");
  var searchClose = document.getElementById("search-close");

  function applyTheme(theme) {
    root.classList.toggle("dark-theme", theme === "dark");
    if (themeButton) {
      themeButton.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      themeButton.setAttribute("aria-label", theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre");
      themeButton.textContent = theme === "dark" ? "☀" : "◐";
    }
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem("guide-achat-theme"); } catch (e) {}
  var initialTheme = savedTheme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initialTheme);

  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var next = root.classList.contains("dark-theme") ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("guide-achat-theme", next); } catch (e) {}
    });
  }

  function openSearch() {
    if (!searchPanel) return;
    searchPanel.hidden = false;
    document.body.classList.add("search-open");
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 40);
  }

  function closeSearch() {
    if (!searchPanel) return;
    searchPanel.hidden = true;
    document.body.classList.remove("search-open");
  }

  if (searchButton) searchButton.addEventListener("click", openSearch);
  if (searchClose) searchClose.addEventListener("click", closeSearch);
  if (searchPanel) searchPanel.addEventListener("click", function (e) { if (e.target === searchPanel) closeSearch(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSearch(); });

  var index = [];
  var pages = [
    { url: "index.html", label: "Accueil" },
    { url: "smartphones.html", label: "Smartphones" }
  ];

  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

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
      if (current === page.url) {
        addPageToIndex(document, page);
        return;
      }
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
      searchResults.innerHTML = '<p class="search-empty">Recherchez un sujet, une caractéristique ou un mot-clé.</p>';
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
      link.innerHTML = '<span class="search-result-page">' + item.page + '</span><strong></strong><p></p>';
      link.querySelector("strong").textContent = item.title;
      link.querySelector("p").textContent = item.text;
      link.addEventListener("click", closeSearch);
      searchResults.appendChild(link);
    });
  }

  if (searchInput) searchInput.addEventListener("input", function () { renderResults(searchInput.value); });
  loadIndex();
})();
