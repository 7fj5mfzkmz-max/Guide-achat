(function (root) {
  "use strict";

  var requirements = {
    etudiant: ["durabilite", "autonomie", "prix"],
    professionnel: ["ecran", "fiabilite", "autonomie", "photo"],
    gamer: ["performance", "gaming", "refroidissement", "ecran", "recharge"],
    photographe: ["photo", "stabilisation", "zoom", "capteur", "stockage"]
  };

  function fact(value, source, state, evidence) {
    return { value: value == null ? null : value, state: state || (value == null ? "unknown" : "found"), source: source || "reference", evidence: evidence || null };
  }

  function fit(phoneData, profile) {
    var p = phoneData || {};
    var specs = p.specs || {};
    var positives = [], concerns = [], missing = [];
    var required = requirements[profile] || [];

    required.forEach(function (key) {
      var value = specs[key] != null ? specs[key] : (p[key] != null ? p[key] : null);
      if (value == null || value === "") missing.push({ criterion: key, data: fact(null, "reference", "unknown", null) });
    });

    if (specs.refresh || specs.ecran) positives.push({ criterion: "ecran", text: "Écran documenté : " + (specs.refresh || specs.ecran), data: fact(specs.refresh || specs.ecran, "reference", "found", p.evidence || null) });
    if (specs.batterie) positives.push({ criterion: "autonomie", text: "Batterie documentée : " + specs.batterie, data: fact(specs.batterie, "reference", "found", p.evidence || null) });
    if (specs.performance) positives.push({ criterion: "performance", text: "Performances documentées.", data: fact(specs.performance, "reference", "found", p.evidence || null) });

    return {
      profile: profile,
      verdict: concerns.length ? "a_surveille" : (missing.length ? "a_confirmer" : "correspond"),
      positives: positives,
      concerns: concerns,
      missing: missing
    };
  }

  var api = { requirements: requirements, fit: fit };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerProfileFit = api;
})(typeof window !== "undefined" ? window : globalThis);
