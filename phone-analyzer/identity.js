(function (root) {
  "use strict";
  /* Identité d'un téléphone = marque + éléments de modèle (+ identifiant GTIN/MPN quand il existe).
     Ce module ne devine rien : il compare, et il répond « inconnu » quand il ne peut pas conclure.
     Règles :
       - un numéro seul (15, 16…) n'identifie jamais un téléphone : la marque doit être connue des deux côtés ;
       - deux modèles de même marque ne sont « identiques » que si tous leurs éléments distinctifs coïncident
         (iPhone 17 Pro ≠ iPhone 17 Pro Max ≠ iPhone 17) ;
       - verdicts : same | compatible | different | unknown. « compatible » = mêmes éléments distinctifs,
         mais le libellé le plus long contient des mots descriptifs non reconnus : à confirmer. */

  var BRANDS = {
    apple: ["apple", "iphone"], samsung: ["samsung", "galaxy"], google: ["google", "pixel"],
    xiaomi: ["xiaomi", "redmi", "poco"], oneplus: ["oneplus"], oppo: ["oppo"], realme: ["realme"],
    motorola: ["motorola", "moto"], nokia: ["nokia"], sony: ["sony", "xperia"], honor: ["honor"],
    huawei: ["huawei"], nothing: ["nothing"], fairphone: ["fairphone"], asus: ["asus", "rog", "zenfone"],
    zte: ["zte"], blackview: ["blackview"]
  };
  var BRAND_ONLY = ["apple", "samsung", "google", "xiaomi", "oneplus", "oppo", "realme", "motorola", "nokia", "sony", "honor", "huawei", "nothing", "fairphone", "asus", "zte", "blackview"];

  var NOISE = ("noir noire blanc blanche bleu bleue vert verte rouge rose gris grise argent or dore violet violette jaune orange titane titanium naturel graphite " +
    "midnight minuit starlight lumiere stellaire creme cream black white blue green red pink gray grey silver gold purple yellow lavande lavender menthe mint corail coral " +
    "obsidian obsidienne porcelaine sable desert cosmique ocean " +
    "smartphone smartphones telephone portable mobile debloque debloquee dual sim nfc android ios neuf reconditionne occasion grade " +
    "de du des le la les un une et avec pour en version francaise garantie ans ram rom edition").split(" ");
  var SOFT = ["cfiveg", "cfourg", "cthreeg"];
  var VARIANTS = ("pro max plus ultra mini fe lite se xl fold flip edge neo gt turbo power play prime note duo air slim ace active classic go").split(" ");

  function strip(s) {
    var t = String(s == null ? "" : s);
    try { t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (_) {}
    return t.toLowerCase();
  }

  function prep(s) {
    return " " + strip(s)
      .replace(/\bone\s+plus\b/g, "oneplus")
      .replace(/\+/g, " plus ")
      .replace(/\d+(?:[.,]\d+)?\s?["″”]/g, " ")
      .replace(/\b\d+(?:[.,]\d+)?\s?(?:go|gb|to|tb|mo|mb|mah|hz|mp|mpx|w|po|pouces?|inch|kg|mm|cm)\b/g, " ")
      .replace(/\b3\s?g\b/g, " cthreeg ").replace(/\b4\s?g\b/g, " cfourg ").replace(/\b5\s?g\b/g, " cfiveg ") + " ";
  }

  function brandOf(text) {
    var p = prep(text).replace(/[^a-z0-9]+/g, " ");
    var found = {};
    Object.keys(BRANDS).forEach(function (brand) {
      BRANDS[brand].forEach(function (alias) { if (p.indexOf(" " + alias + " ") >= 0) found[brand] = true; });
    });
    var keys = Object.keys(found);
    return keys.length === 1 ? keys[0] : null;
  }

  function tokens(text) {
    /* Un nombre isolé de type capacité (128, 256…) sans unité est un stockage, pas un élément de modèle.
       (Les nombres collés à des lettres — « G64 », « A32 » — restent des éléments de modèle.) */
    var p = prep(text).replace(/[^a-z0-9]+/g, " ").split(" ").filter(function (t) { return !/^(?:32|64|128|256|512|1024)$/.test(t); }).join(" ")
      .replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2");
    var hard = {}, soft = {};
    p.split(" ").forEach(function (t) {
      if (!t) return;
      if (SOFT.indexOf(t) >= 0) { soft[t] = true; return; }
      if (NOISE.indexOf(t) >= 0 || BRAND_ONLY.indexOf(t) >= 0) return;
      hard[t] = true;
    });
    return { hard: Object.keys(hard).sort(), soft: Object.keys(soft).sort() };
  }

  function significant(token) { return /^\d+$/.test(token) || token.length <= 2 || VARIANTS.indexOf(token) >= 0; }

  function compare(a, b) {
    var ba = brandOf(a), bb = brandOf(b);
    if (!ba || !bb) return { verdict: "unknown", reason: "marque absente d’un des deux libellés" };
    if (ba !== bb) return { verdict: "different", reason: "marques différentes (" + ba + " / " + bb + ")" };
    var A = tokens(a), B = tokens(b);
    if (!A.hard.length || !B.hard.length) return { verdict: "unknown", reason: "aucun élément de modèle exploitable" };
    if (A.soft.length && B.soft.length && A.soft.join() !== B.soft.join()) return { verdict: "different", reason: "connectivité différente (" + A.soft.join() + " / " + B.soft.join() + ")" };
    var onlyA = A.hard.filter(function (t) { return B.hard.indexOf(t) < 0; });
    var onlyB = B.hard.filter(function (t) { return A.hard.indexOf(t) < 0; });
    if (!onlyA.length && !onlyB.length) return { verdict: "same", reason: "mêmes éléments de modèle", sigA: [], sigB: [] };
    var sigA = onlyA.filter(significant), sigB = onlyB.filter(significant);
    if (sigA.length || sigB.length) return { verdict: "different", reason: "éléments distinctifs différents : " + onlyA.concat(onlyB).join(", "), sigA: sigA, sigB: sigB };
    return { verdict: "compatible", reason: "mots descriptifs différents : " + onlyA.concat(onlyB).join(", "), sigA: [], sigB: [] };
  }

  /* Comparaison d'une fiche (a) avec un indice incomplet (b : lien tronqué, saisie courte).
     Un indice qui ne contredit rien mais qui est moins précis que la fiche reste « compatible » (à confirmer) ;
     un indice qui nomme une variante absente de la fiche reste « different ». */
  function compareHint(a, b) {
    var r = compare(a, b);
    if (r.verdict === "different" && r.sigA && r.sigA.length && r.sigB && !r.sigB.length) {
      return { verdict: "compatible", reason: "indice moins précis que la fiche : " + r.sigA.join(", ") };
    }
    return r;
  }

  /* Vérifie une référence externe (ex. fiche Icecat) contre les noms observés.
       names     = indices solides (JSON-LD, titre de la page lue) : ils peuvent confirmer ET contredire ;
       weakNames = indices fragiles (slug d'URL, souvent collé ou tronqué) : ils peuvent confirmer, ils ne
                   contredisent que s'il n'existe aucun indice solide.
     conflict   = un indice qui fait foi désigne un autre modèle → la référence ne doit pas être utilisée.
     confirmed  = au moins un indice concorde, aucun ne contredit.
     unverified = aucun indice comparable : on ne conclut pas. */
  function verifyReference(label, names, weakNames) {
    var strong = (names || []).filter(Boolean), weak = (weakNames || []).filter(Boolean);
    if (!strong.length) { strong = weak; weak = []; }
    var verdicts = [], conflicts = [];
    strong.forEach(function (n) {
      var r = compare(label, n);
      verdicts.push(r.verdict);
      if (r.verdict === "different") conflicts.push("« " + n + " » : " + r.reason);
    });
    if (conflicts.length) return { verdict: "conflict", detail: conflicts.join(" ; ") };
    weak.forEach(function (n) { verdicts.push(compare(label, n).verdict); });
    if (verdicts.indexOf("same") >= 0 || verdicts.indexOf("compatible") >= 0) return { verdict: "confirmed", detail: null };
    return { verdict: "unverified", detail: null };
  }

  /* --- GTIN / EAN --- */
  function isValidGtin(value) {
    var s = String(value == null ? "" : value).replace(/\D/g, "");
    if ([8, 12, 13, 14].indexOf(s.length) < 0) return false;
    var sum = 0;
    for (var i = 0; i < s.length - 1; i++) {
      var digit = Number(s.charAt(s.length - 2 - i));
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10 === Number(s.charAt(s.length - 1));
  }
  function cleanGtin(value) {
    var s = String(value == null ? "" : value).replace(/\D/g, "");
    return isValidGtin(s) ? s : null;
  }

  /* GTIN trouvés dans du HTML (balisage structuré ou mention « EAN : … »), validés par leur clé de contrôle. */
  function gtinsInHtml(html) {
    var src = String(html || "").slice(0, 400000), out = [];
    var patterns = [
      /["'](?:gtin(?:8|12|13|14)?|ean(?:13)?|barcode)["']\s*:\s*["']?(\d{8,14})["']?/gi,
      /itemprop\s*=\s*["'](?:gtin\d*|ean)["'][^>]*content\s*=\s*["'](\d{8,14})["']/gi,
      /\bEAN(?:-?13)?\s*[:=]?\s*(\d{12,14})\b/gi
    ];
    patterns.forEach(function (re) {
      var m;
      while ((m = re.exec(src)) && out.length < 8) {
        var g = cleanGtin(m[1]);
        if (g && out.indexOf(g) < 0) out.push(g);
      }
    });
    return out.slice(0, 5);
  }

  var api = { brandOf: brandOf, tokens: tokens, compare: compare, compareHint: compareHint, verifyReference: verifyReference, isValidGtin: isValidGtin, cleanGtin: cleanGtin, gtinsInHtml: gtinsInHtml };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerIdentity = api;
})(typeof window !== "undefined" ? window : globalThis);
