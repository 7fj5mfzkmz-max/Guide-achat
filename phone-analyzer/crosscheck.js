(function (root) {
  "use strict";

  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

  function scoreCandidate(candidate, clues) {
    var score = 0;
    var c = norm(candidate.nom || candidate.model);
    var brand = norm(candidate.marque || candidate.brand);
    var hint = norm(clues.titleHint);
    if (brand && hint.indexOf(brand) >= 0) score += 3;
    if (c && hint.indexOf(c) >= 0) score += 8;
    if (c && norm(c) === norm(clues.titleHint)) score += 8;
    if (c && hint && c.indexOf(hint) >= 0) score += 8;
    if (clues.ean && String(candidate.ean || candidate.gtin || "") === clues.ean) score += 20;
    if (clues.asin && String(candidate.asin || "").toUpperCase() === clues.asin) score += 20;
    return score;
  }

  function resolve(candidates, clues) {
    var ranked = (candidates || []).map(function (candidate) {
      return { candidate: candidate, score: scoreCandidate(candidate, clues) };
    }).sort(function (a, b) { return b.score - a.score; });
    if (!ranked.length) return { status: "unknown", candidates: [] };
    var top = ranked[0], second = ranked[1];
    if (top.score < 3) return { status: "unknown", candidates: ranked.slice(0, 5) };
    if (second && top.score === second.score) return { status: "ambiguous", candidates: ranked.slice(0, 5) };
    return { status: "identified", candidate: top.candidate, candidates: ranked.slice(0, 5) };
  }


  function tokens(s) { return norm(s).split(" ").filter(Boolean); }
  function pad(s) { return " " + norm(s) + " "; }

  /* Recherche dans le catalogue à partir d'indices (titre, nom, URL, EAN, ASIN, texte saisi).
     Les correspondances se font sur des mots entiers : « pixel 10 » ne valide pas « pixel 100 ». */
  function scoreHints(candidate, hints, clues) {
    var name = norm(candidate.nom || candidate.model);
    var brand = norm(candidate.marque || candidate.brand);
    var nameTokens = tokens(name);
    var full = norm(brand && name.indexOf(brand) < 0 ? brand + " " + name : name);
    var best = 0;
    var explicitBrandSeen = false;
    var brandAliases = {
      apple: ["apple", "iphone"], samsung: ["samsung", "galaxy"], google: ["google", "pixel"],
      oneplus: ["oneplus", "one plus"], xiaomi: ["xiaomi", "redmi", "poco"],
      oppo: ["oppo"], realme: ["realme"], motorola: ["motorola", "moto"],
      asus: ["asus", "rog", "zenfone"], sony: ["sony", "xperia"], honor: ["honor"],
      huawei: ["huawei"], nothing: ["nothing"], nokia: ["nokia"], fairphone: ["fairphone"]
    };
    function aliasesFor(b) { return brandAliases[b] || [b]; }
    var brandNames = aliasesFor(brand);
    hints.forEach(function (raw) {
      var hint = norm(raw); if (!hint) return;
      var padded = pad(hint), hintTokens = tokens(hint), score = 0;
      var aliasMatch = brand && brandNames.some(function (a) { return padded.indexOf(pad(norm(a))) >= 0; });
      if (aliasMatch) explicitBrandSeen = true;
      // Une marque explicitement différente est une exclusion, pas seulement une pénalité.
      var otherBrand = (hintTokens.indexOf('apple') >= 0 || hintTokens.indexOf('iphone') >= 0) && brand !== 'apple' ||
        hintTokens.indexOf('oneplus') >= 0 && brand !== 'oneplus' ||
        hintTokens.indexOf('samsung') >= 0 && brand !== 'samsung' ||
        hintTokens.indexOf('google') >= 0 && brand !== 'google' ||
        hintTokens.indexOf('pixel') >= 0 && brand !== 'google' ||
        hintTokens.indexOf('xiaomi') >= 0 && brand !== 'xiaomi' && brand !== 'poco' ||
        hintTokens.indexOf('nokia') >= 0 && brand !== 'nokia';
      if (otherBrand) return;
      if (name && padded.indexOf(pad(name)) >= 0) score += 8 + nameTokens.length;
      else if (nameTokens.length) {
        var bare = tokens(name.replace(brand, "")).filter(Boolean);
        var meaningfulBare = bare.filter(function (t) { return !/^\d+$/.test(t); });
        // Un numéro seul (15, 16, 10...) ne suffit jamais à identifier une marque différente.
        if (!meaningfulBare.length && bare.length && brand && !aliasMatch) return;
        if (bare.length && bare.every(function (t) { return hintTokens.indexOf(t) >= 0; })) score += 6 + 2 * bare.length;
        else if (hint && name.indexOf(hint) >= 0 && hintTokens.length >= 2) score += 6;
        else if (brand && padded.indexOf(pad(brand)) >= 0 && bare.length >= 2 &&
          bare.filter(function (t) { return hintTokens.indexOf(t) >= 0; }).length / bare.length >= 0.6) score += 6;
      }
      if (score && (hint === name || hint === full)) score += 8;
      if (score && brand && (padded.indexOf(pad(brand)) >= 0 || aliasMatch)) score += 3;
      if (score > best) best = score;
    });
    if (clues && clues.brand && brand && norm(clues.brand) !== brand) return 0;
    if (clues.ean && String(candidate.ean || candidate.gtin || "") === String(clues.ean)) best += 20;
    if (clues.asin && String(candidate.asin || "").toUpperCase() === String(clues.asin).toUpperCase()) best += 20;
    return best;
  }

  function search(candidates, clues) {
    clues = clues || {};
    var hints = (clues.hints || []).filter(Boolean);
    var ranked = (candidates || []).map(function (c) { return { candidate: c, score: scoreHints(c, hints, clues) }; })
      .filter(function (r) { return r.score >= 6; })
      .sort(function (a, b) { return b.score - a.score; });
    if (!ranked.length) return { status: "unknown", ranked: [] };
    var top = ranked[0], second = ranked[1];
    var strong = top.score >= 14 && (!second || top.score - second.score >= 5);
    return { status: strong ? "identified" : "to_confirm", ranked: ranked.slice(0, 3), best: top.candidate };
  }

  var api = { resolve: resolve, search: search };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerCrosscheck = api;
})(typeof window !== "undefined" ? window : globalThis);
