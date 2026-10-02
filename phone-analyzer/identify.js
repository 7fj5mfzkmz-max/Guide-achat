(function (root) {
  "use strict";

  function decode(value) {
    try { return decodeURIComponent(value.replace(/\+/g, " ")); } catch (_) { return value; }
  }

  function hostname(url) {
    try { return new URL(url).hostname.toLowerCase(); } catch (_) { return ""; }
  }

  function merchantFromHost(host) {
    if (/amazon\./.test(host)) return "amazon";
    if (/cdiscount\./.test(host)) return "cdiscount";
    if (/fnac\./.test(host)) return "fnac";
    if (/darty\./.test(host)) return "darty";
    if (/rakuten\./.test(host)) return "rakuten";
    if (/idealo\./.test(host)) return "idealo";
    return /samsung|apple|xiaomi|google|oneplus|asus|motorola|sony|honor|oppo|realme|nothing|huawei/.test(host) ? "manufacturer" : "other";
  }

  function params(url) {
    var result = {};
    try {
      new URL(url).searchParams.forEach(function (v, k) { result[k.toLowerCase()] = decode(v); });
    } catch (_) {}
    return result;
  }

  function identifyFromUrl(rawUrl) {
    var url = new URL(rawUrl);
    var host = url.hostname.toLowerCase();
    var path = decode(url.pathname + " " + url.search).trim();
    var merchant = merchantFromHost(host);
    var p = params(rawUrl);
    var asin = (path.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?\s]|$)/i) || [])[1];
    var ean = (path.match(/(?:ean|gtin)[=/:-]?(\d{8,14})/i) || [])[1] || p.ean || p.gtin;
    var titleHint = p.q || p.search || p.title || p.name || "";
    if (!titleHint && merchant === "amazon") titleHint = (path.match(/\/([^/]+?)(?:\/dp|\/gp\/)/i) || [])[1] || "";
    if (!titleHint) titleHint = path.split("/").filter(Boolean).slice(-1)[0] || "";

    return {
      url: rawUrl,
      merchant: merchant,
      host: host,
      asin: asin ? asin.toUpperCase() : null,
      ean: ean ? String(ean).replace(/\D/g, "") : null,
      titleHint: titleHint.replace(/[-_]+/g, " ").trim()
    };
  }


  var SEARCH_KEYS = ["q", "k", "query", "search", "searchtext", "keyword", "keywords", "st", "searchterm", "ntt", "text"];

  /* Classement par l'URL seule. strong = certitude suffisante pour ne pas télécharger la page.
     Les motifs par marchand sont des heuristiques : le contenu de la page tranche ensuite. */
  function classifyUrl(rawUrl) {
    var u;
    try { u = new URL(rawUrl); } catch (_) { return { kind: "unknown", label: null, strong: false }; }
    var host = u.hostname.toLowerCase();
    var merchant = merchantFromHost(host);
    var path = decode(u.pathname).replace(/\/+$/, "") || "/";
    function page(label, strong) { return { kind: "page", label: label, strong: !!strong }; }
    if (path === "/") return page("une page d’accueil", true);
    var isProductPath = /\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}/i.test(path) || /\/a\d{5,}(?:\/|$)/.test(path) || /\/f-\d+-[^/]+\.html$/i.test(path) || /\/mfp\//i.test(path);
    if (isProductPath) return { kind: "product", label: null, strong: false };
    var hasSearch = false;
    u.searchParams.forEach(function (v, k) { if (SEARCH_KEYS.indexOf(k.toLowerCase()) >= 0 && v) hasSearch = true; });
    if (hasSearch || /\/(?:search|recherche|searchresult|resultats?)(?:\/|\.|$)/i.test(path)) return page("une page de résultats de recherche", true);
    if (merchant === "amazon" && /^\/(?:b|s|stores|gp\/(?:bestsellers|browse|new-releases|movers-and-shakers)|hz)(?:\/|$)/i.test(path)) return page("une page de catégorie ou de sélection de produits", true);
    if (/\/l-\d+(?:\.html)?$/i.test(path) || /(?:^|\/)(?:categorie|categories|category|collection|collections|rayon|rayons|catalogue|marques?|brands?)(?:\/|$)/i.test(path)) return page("une page de catégorie ou de liste de produits", false);
    if (/(?:^|\/)(?:guide|guides|blog|actualites?|magazine|comparateur|comparatif)(?:\/|$)/i.test(path)) return page("une page d’information ou de comparaison", false);
    return { kind: "unknown", label: null, strong: false };
  }

  var api = { identifyFromUrl: identifyFromUrl, merchantFromHost: merchantFromHost, classifyUrl: classifyUrl };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerIdentify = api;
})(typeof window !== "undefined" ? window : globalThis);
