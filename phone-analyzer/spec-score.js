(function (root) {
  "use strict";

  /* Estime une compatibilité par profil à partir des seules caractéristiques réellement disponibles
     (catalogue ou page lue). Un critère non documenté est ignoré, jamais compté comme mauvais.
     Score plafonné à 9/10, comme dans le reste du guide. */

  var MISSING = /^\s*(?:à documenter|a documenter|n\/a|inconnu|-)?\s*$/i;

  function band(v, table) {
    for (var i = 0; i < table.length; i++) if (v <= table[i][0]) return table[i][1];
    return table[table.length - 1][1];
  }
  function first(re, text, lo, hi) {
    var m = String(text == null ? "" : text).match(re);
    if (!m) return null;
    var n = parseInt(String(m[1]).replace(/[\s.,]/g, ""), 10);
    return isFinite(n) && n >= lo && n <= hi ? n : null;
  }
  function usable(v) { return v != null && !MISSING.test(String(v)); }

  /* Effet de la technologie de batterie sur l'autonomie, à capacité (mAh) égale.
     Aucune valeur n'est inventée : autonomieBonus reste à 0 tant que des sources fiables ne sont pas
     documentées (status "a_documenter", sources vide). Pour brancher une règle : renseigner le bonus,
     passer status à "documente" et lister les sources. */
  var RULES = {
    chimie: {
      "silicium-carbone": { label: "silicium-carbone", autonomieBonus: 0, status: "a_documenter", sources: [] },
      "li-po": { label: "Li-Po", autonomieBonus: 0, status: "a_documenter", sources: [] },
      "li-ion": { label: "Li-ion", autonomieBonus: 0, status: "a_documenter", sources: [] }
    }
  };
  function detectChemistry(specs) {
    var text = [specs && specs.chimie_batterie, specs && specs.batterie].filter(usable).join(" ");
    if (/silicium|silicon|\bsi[\/\- ]?c\b/i.test(text)) return "silicium-carbone";
    if (/li[\s-]?po\b|lithium[\s-]?polym/i.test(text)) return "li-po";
    if (/li[\s-]?ion\b|lithium[\s-]?ion/i.test(text)) return "li-ion";
    return null;
  }

  function criteria(specs, price) {
    specs = specs || {};
    var out = {};
    var mah = usable(specs.batterie) ? first(/(\d[\d\s.,]*)\s*mAh/i, specs.batterie, 1000, 20000) : null;
    var watts = first(/(\d{2,3})\s*W\b/i, usable(specs.charge) ? specs.charge : (usable(specs.batterie) ? specs.batterie : ""), 5, 300);
    var ram = usable(specs.ram) ? first(/(\d+)\s*(?:Go|GB)/i, specs.ram, 1, 32) : null;
    var hzSource = [specs.refresh, specs.frequence, specs.ecran].filter(usable).join(" ");
    var hz = first(/(\d{2,3})\s*Hz/i, hzSource, 30, 240);

    if (mah != null) {
      var chem = RULES.chimie[detectChemistry(specs)];
      out.autonomie = Math.min(9, band(mah, [[3499, 3], [4199, 5], [4999, 6], [5499, 7], [Infinity, 8]]) + (watts != null && watts >= 65 ? 1 : 0) + (chem ? chem.autonomieBonus : 0));
    }
    if (ram != null) out.performance = band(ram, [[4, 3], [6, 5], [8, 6], [12, 8], [Infinity, 9]]);
    if (hz != null) {
      var refresh = band(hz, [[60, 3], [90, 5], [120, 7], [Infinity, 8]]);
      out.gaming = out.performance != null ? Math.round((refresh + out.performance) / 2) : refresh;
    }
    var p = typeof price === "string" ? parseFloat(price.replace(",", ".")) : price;
    if (p != null && isFinite(p) && p > 0) out.prix = band(p, [[350, 9], [500, 7], [700, 5], [1000, 3], [Infinity, 2]]);
    return out;
  }

  function estimate(input, weights) {
    input = input || {};
    var crit = criteria(input.specs, input.price);
    var profiles = {};
    Object.keys(weights || {}).forEach(function (key) {
      var w = weights[key], sum = 0, tot = 0, all = 0;
      Object.keys(w).forEach(function (k) { all += w[k]; if (crit[k] != null) { sum += w[k] * crit[k]; tot += w[k]; } });
      if (tot > 0) {
        var coverage = all ? tot / all : 0, raw = Math.min(9, Math.round(sum / tot));
        /* Peu de critères documentés : score provisoire, plafonné à 6 pour ne pas survendre. */
        profiles[key] = { score: coverage < 0.5 ? Math.min(6, raw) : raw, coverage: coverage, provisional: coverage < 0.5 };
      }
    });
    var chemKey = detectChemistry(input.specs), chemRule = chemKey ? RULES.chimie[chemKey] : null;
    return { criteria: crit, documented: Object.keys(crit), profiles: profiles,
      chemistry: chemRule ? { key: chemKey, label: chemRule.label, status: chemRule.status } : null };
  }

  var api = { estimate: estimate, criteria: criteria, rules: RULES, detectChemistry: detectChemistry };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerSpecScore = api;
})(typeof window !== "undefined" ? window : globalThis);
