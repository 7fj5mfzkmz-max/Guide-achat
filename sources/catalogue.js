(function (root) {
  "use strict";
  function load(url) {
    return fetch(url || "smartphones.json").then(function (r) { if (!r.ok) throw new Error("Catalogue HTTP " + r.status); return r.json(); });
  }
  var api = { load: load };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GuideCatalogueSource = api;
})(typeof window !== "undefined" ? window : globalThis);
