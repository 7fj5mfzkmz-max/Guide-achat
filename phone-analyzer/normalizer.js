(function (root) {
  "use strict";

  function normalizeText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function normalizeSpec(value) {
    var text = normalizeText(value);
    text = text.replace(/(\d)\s*[hH][zZ]\b/g, "$1 Hz");
    text = text.replace(/(\d[\d\s.,]*)\s*(?:Go|GB)\b/gi, function (_, n) { return normalizeText(n) + " Go"; });
    text = text.replace(/(\d[\d\s.,]*)\s*mAh\b/gi, function (_, n) { return normalizeText(n) + " mAh"; });
    text = text.replace(/(\d[\d\s.,]*)\s*[wW]\b/g, function (_, n) { return normalizeText(n) + " W"; });
    text = text.replace(/(\d[\d\s.,]*)\s*nits\b/gi, function (_, n) { return normalizeText(n) + " nits"; });
    text = text.replace(/(\d+(?:[.,]\d+)?)\s*[\"″]/g, "$1\"");
    return text;
  }

  function normalizeProduct(product) {
    var out = Object.assign({}, product || {});
    ["brand", "model", "reference", "ean", "asin", "merchant"].forEach(function (key) {
      if (out[key] != null) out[key] = normalizeText(out[key]);
    });
    if (out.variant) out.variant = Object.assign({}, out.variant);
    if (out.specs) {
      out.specs = Object.keys(out.specs).reduce(function (acc, key) {
        acc[key] = normalizeSpec(out.specs[key]);
        return acc;
      }, {});
    }
    return out;
  }

  var api = { text: normalizeText, spec: normalizeSpec, product: normalizeProduct };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerNormalizer = api;
})(typeof window !== "undefined" ? window : globalThis);
