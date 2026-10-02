(function () {
  "use strict";
  var card = document.getElementById("analyse-modele");
  var form = document.getElementById("phone-analyzer-form");
  var input = document.getElementById("phone-product-url");
  var stage = document.getElementById("phone-analyzer-result");
  if (!card || !form || !input || !stage) return;

  var PROFILS = { etudiant: "Étudiant", professionnel: "Professionnel", gamer: "Gamer", photographe: "Photographe" };
  var SPEC_LABELS = { ecran: "Écran", refresh: "Fréquence d’écran", processeur: "Processeur", ram: "Mémoire", stockage: "Stockage", batterie: "Batterie", charge: "Charge", photo: "Photo", etancheite: "Étanchéité", os: "Système" };
  var CRIT_LABELS = { autonomie: "autonomie", performance: "performance", gaming: "jeu", prix: "prix" };
  var state = { catalogue: null, page: null, queue: [], year: null, pageOffered: false, needsCapture: false };

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function shorten(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function usable(v) { return v != null && String(v).trim() !== "" && !/^\s*à documenter\s*$/i.test(String(v)); }
  function myProfile() { try { return localStorage.getItem("guide-profile"); } catch (_) { return null; } }

  /* Un seul écran visible à la fois : le formulaire est masqué dès qu'une étape s'affiche. */
  function show(html, opts) {
    form.hidden = true;
    stage.hidden = false;
    stage.setAttribute("aria-busy", opts && opts.busy ? "true" : "false");
    stage.innerHTML = html;
    card.classList.add("is-active");
    var focus = stage.querySelector("[data-autofocus]");
    if (focus && focus.focus) focus.focus({ preventScroll: true });
  }
  function reset() {
    stage.hidden = true; stage.innerHTML = "";
    form.hidden = false; card.classList.remove("is-active");
    input.focus({ preventScroll: true });
  }
  function retryButton(label) { return '<button class="btn btn-secondary" type="button" data-act="reset">' + esc(label || "Essayer un autre lien") + "</button>"; }
  function loading(text) { show('<div class="model-analyzer-loading" role="status"><span class="model-analyzer-spinner" aria-hidden="true"></span><p>' + esc(text) + "</p></div>", { busy: true }); }

  function loadCatalogue() {
    if (state.catalogue) return Promise.resolve(state.catalogue);
    if (!window.GuideCatalogueSource) return Promise.resolve([]);
    return window.GuideCatalogueSource.load().then(function (d) { state.catalogue = d.produits || []; return state.catalogue; }).catch(function () { return []; });
  }
  function displayName(c, year) {
    var name = c.nom || c.model || "", brand = c.marque || c.brand || "";
    var label = brand && norm(name).indexOf(norm(brand)) < 0 ? brand + " " + name : name;
    var y = c.annee_sortie || year;
    return label + (y ? " (" + y + ")" : "");
  }
  function pageName() {
    var p = state.page;
    if (!p) return null;
    var n = (p.product && p.product.name) || (p.clues && (p.clues.name || p.clues.title));
    return n ? shorten(n, 110) : null;
  }

  /* --- vues --- */
  function viewNotAModel(label) {
    show('<div class="model-analyzer-card"><h3>Ce lien correspond à ' + esc(label || "une page générale") + '.</h3><p>Collez le lien d’une fiche produit précise pour poursuivre l’analyse.</p>' + retryButton() + "</div>");
  }
  function viewConfirm(label, onYes, onNo) {
    show('<div class="model-analyzer-card" role="group" aria-labelledby="ma-q"><h3 id="ma-q">Avez-vous bien sélectionné ' + esc(label) + " ?</h3>" +
      "<p>Le modèle n’a pas pu être identifié avec certitude. Confirmez la référence avant de lancer l’analyse.</p>" +
      '<div class="model-analyzer-actions"><button class="btn" type="button" data-act="yes" data-autofocus>Oui, c’est bien ce modèle</button><button class="btn btn-secondary" type="button" data-act="no">Non</button></div></div>');
    stage.querySelector('[data-act="yes"]').addEventListener("click", onYes);
    stage.querySelector('[data-act="no"]').addEventListener("click", onNo);
  }
  function viewManual(note, withCapture) {
    show('<div class="model-analyzer-card"><h3>Quel modèle recherchez-vous ?</h3><p>' + esc(note || "Le lien ne permet pas d’identifier le modèle avec certitude.") + " Saisissez sa marque et sa référence complète.</p>" +
      (withCapture ? '<p>Ce site bloque la lecture automatique : la <a href="capture.html">capture depuis votre navigateur</a> lit la page telle que vous la voyez.</p>' : "") +
      '<form class="model-analyzer-input-row" data-manual><input type="text" data-autofocus required placeholder="Ex. Samsung Galaxy A56" aria-label="Marque et modèle" autocomplete="off"><button class="btn" type="submit">Chercher</button></form>' + retryButton() + "</div>");
    stage.querySelector("[data-manual]").addEventListener("submit", function (e) {
      e.preventDefault();
      var text = e.target.querySelector("input").value.trim();
      if (text) searchAndContinue({ hints: [text] }, true);
    });
  }
  function scoreBar(v) { var n = Math.max(0, Math.min(9, v)); return '<span class="model-analyzer-bar" aria-hidden="true"><i style="width:' + Math.round(n / 9 * 100) + '%"></i></span>'; }

  /* Scores du catalogue quand ils existent (profil_scores, sinon scores pondérés par profiles.js). */
  function catalogueScores(c) {
    var out = {}, weights = (window.GuideProfiles && window.GuideProfiles.weights) || {};
    Object.keys(PROFILS).forEach(function (key) {
      if (c.profil_scores && c.profil_scores[key] != null) { out[key] = { score: Number(c.profil_scores[key]) }; return; }
      var w = weights[key], s = c.scores || {};
      if (!w) return;
      var sum = 0, tot = 0;
      Object.keys(w).forEach(function (k) { if (s[k] != null) { sum += w[k] * s[k]; tot += w[k]; } });
      if (tot > 0) out[key] = { score: Math.min(9, Math.round(sum / tot)) };
    });
    return out;
  }

  /* Analyse finale, toujours avec un score quand au moins un critère est documenté.
     c = fiche du catalogue (ou null), page = résultat du serveur (ou null). */
  function showAnalysis(c, page) {
    var cat = c || {};
    var pageSpecs = (page && page.specs) || {};
    var merged = {};
    [pageSpecs, cat.caracteristiques || {}].forEach(function (src) { Object.keys(src).forEach(function (k) { if (usable(src[k])) merged[k] = src[k]; }); });
    var pagePrice = page && page.product && /^(EUR|€)?$/i.test(page.product.currency || "") && page.product.price ? page.product.price : null;
    var price = cat.prix_indicatif || pagePrice;

    var scores = catalogueScores(cat), estimated = false, documented = [], chemistry = null;
    if (!Object.keys(scores).length) {
      var est = window.PhoneAnalyzerSpecScore.estimate({ specs: merged, price: price }, (window.GuideProfiles && window.GuideProfiles.weights) || {});
      scores = est.profiles; documented = est.documented; chemistry = est.chemistry; estimated = true;
    }
    var mine = myProfile();
    var profs = Object.keys(PROFILS).filter(function (k) { return scores[k]; }).map(function (k) {
      var s = scores[k];
      return '<li' + (k === mine ? ' class="is-mine"' : "") + "><span>" + esc(PROFILS[k]) + "</span>" + scoreBar(s.score) + "<strong>" + s.score + "/9" + (s.provisional ? " *" : "") + "</strong></li>";
    }).join("");
    var rows = Object.keys(SPEC_LABELS).filter(function (k) { return merged[k]; }).map(function (k) { return "<div><dt>" + esc(SPEC_LABELS[k]) + "</dt><dd>" + esc(merged[k]) + "</dd></div>"; }).join("");
    var list = function (arr) { return arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join(""); };
    var title = c ? displayName(c, state.year) : (pageName() || "Modèle lu sur la page");

    var notes = "";
    if (!c) notes += "<p>Ce modèle n’est pas encore présent dans notre catalogue ; l’analyse utilise uniquement les informations lisibles sur la page.</p>";
    else if (estimated) notes += "<p>Certaines données du catalogue sont incomplètes ; le résultat repose uniquement sur les informations disponibles.</p>";
    var scoreNote = !profs ? "<p><strong>Score indisponible pour le moment :</strong> aucune caractéristique fiable n’est disponible pour ce modèle. Une information absente n’est pas considérée comme un défaut.</p>"
      : (estimated ? (chemistry && chemistry.status !== "documente" ? '<p class="model-analyzer-note">Technologie de batterie détectée : ' + esc(chemistry.label) + ". Son effet sur le score sera pris en compte quand des sources fiables auront été documentées.</p>" : "") + '<p class="model-analyzer-note">Score estimé à partir de : ' + esc(documented.map(function (k) { return CRIT_LABELS[k] || k; }).join(", ")) + ". Une donnée non documentée n’est pas comptée comme un point négatif. * = provisoire (moins de la moitié des critères du profil documentés), plafonné à 6/9.</p>"
        : '<p class="model-analyzer-note">Ces scores indiquent une compatibilité avec un profil d’usage ; ils ne constituent pas une note de qualité générale.</p>');

    show('<div class="model-analyzer-card"><span class="eyebrow">ANALYSE</span><h3>' + esc(title) + "</h3>" + notes +
      (price ? "<p><strong>" + (cat.prix_indicatif ? "Prix indicatif" : "Prix trouvé sur la page") + " :</strong> " + esc(price) + " €</p>" : "") +
      (rows ? '<dl class="model-analyzer-specs">' + rows + "</dl>" : "") +
      (profs ? '<h4>Compatibilité par profil</h4><ul class="model-analyzer-profiles">' + profs + "</ul>" : "") + scoreNote +
      ((cat.points_forts && cat.points_forts.length) ? "<h4>Points forts</h4><ul>" + list(cat.points_forts) + "</ul>" : "") +
      ((cat.points_faibles && cat.points_faibles.length) ? "<h4>Points de vigilance</h4><ul>" + list(cat.points_faibles) + "</ul>" : "") +
      retryButton("Analyser un autre modèle") + "</div>");
  }

  /* --- logique --- */
  function nextCandidate() {
    var c = state.queue.shift();
    if (c) return viewConfirm(displayName(c, state.year), function () { showAnalysis(c, state.page); }, nextCandidate);
    var name = pageName();
    if (name && !state.pageOffered) {
      state.pageOffered = true;
      return viewConfirm(name, function () { showAnalysis(null, state.page); }, nextCandidate);
    }
    // Un modèle lisible sur la page mais absent du catalogue reste analysable.
    // Ne jamais transformer « absent du catalogue » en « modèle introuvable ».
    if (name && state.page) return showAnalysis(null, state.page);
    viewManual("Le modèle n’a pas pu être identifié à partir du lien.", state.needsCapture);
  }
  function externalPageFromManual(text) {
    return {
      ok: true,
      kind: "product",
      strategy: "manual",
      product: { name: text, brand: null, sku: null, mpn: null, gtin: null, price: null, currency: null, availability: null, source: "manual", evidence: "saisie utilisateur" },
      clues: { name: text, title: text, urlHint: text },
      specs: {},
      evidence: ["saisie utilisateur"],
      warning: "Modèle fourni manuellement : aucune donnée technique n’a encore été vérifiée sur une page produit."
    };
  }

  function searchAndContinue(clues, manual) {
    loading(manual ? "Recherche de la référence…" : "Recherche du modèle…");
    loadCatalogue().then(function (catalogue) {
      var res = window.PhoneAnalyzerCrosscheck.search(catalogue, clues);
      if (res.status === "identified" && !manual) return showAnalysis(res.best, state.page);
      state.queue = res.status === "unknown" ? [] : res.ranked.map(function (r) { return r.candidate; });
      if (manual) {
        state.pageOffered = true; // la saisie manuelle remplace toute proposition précédente
        // Une saisie manuelle n’est jamais bloquée par l’absence du modèle dans le catalogue.
        // Si le catalogue ne connaît pas la référence, on passe en mode « modèle externe ».
        if (!state.queue.length) {
          state.page = externalPageFromManual(clues.hints && clues.hints[0] ? clues.hints[0] : "Modèle saisi");
          return showAnalysis(null, state.page);
        }
      }
      nextCandidate();
    });
  }
  function localFallback(raw) {
    var local = window.PhoneAnalyzerIdentify.identifyFromUrl(raw);
    var cls = window.PhoneAnalyzerIdentify.classifyUrl(raw);
    return { ok: false, kind: cls.kind, pageLabel: cls.label, clues: { urlHint: local.titleHint, asin: local.asin, ean: local.ean } };
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var raw = input.value.trim();
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    try { new URL(raw); } catch (_) { return viewManual("Ce lien n’est pas valide."); }
    state.page = null; state.queue = []; state.pageOffered = false; state.needsCapture = false;
    loading("Analyse du lien en cours…");
    window.PhoneAnalyzerFetcher.resolveProduct(raw).catch(function () { return localFallback(raw); }).then(function (data) {
      if (data.kind === "page") return viewNotAModel(data.pageLabel);
      var k = data.clues || {};
      state.year = k.year || null;
      state.needsCapture = !!data.needsCapture;
      if (data.ok && data.kind === "product") state.page = data;
      searchAndContinue({ hints: [k.name, k.title, k.urlHint].concat(k.searchTitles || []), ean: k.ean, asin: k.asin }, false);
    });
  });
  /* Arrivée depuis le signet de capture : #capture=… */
  var captured = window.PhoneAnalyzerCapture && window.PhoneAnalyzerCapture.fromHash(location.hash, window.PhoneAnalyzerIdentify);
  if (captured) {
    try { history.replaceState(null, "", location.pathname + location.search + "#analyse-modele"); } catch (_) {}
    state.page = captured; state.year = captured.clues.year || null; state.queue = []; state.pageOffered = false; state.needsCapture = false;
    var ck = captured.clues;
    searchAndContinue({ hints: [ck.name, ck.title, ck.urlHint], ean: ck.ean, asin: ck.asin }, false);
    if (card.scrollIntoView) card.scrollIntoView({ block: "start" });
  }
  stage.addEventListener("click", function (event) {
    var t = event.target.closest && event.target.closest('[data-act="reset"]');
    if (t) reset();
  });
})();
