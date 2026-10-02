/* Source constructeur : prévue pour un backend autorisé. */
(function (root) {
  "use strict";
  function disabled() { return Promise.reject(new Error("Source constructeur non configurée.")); }
  var api = { resolve: disabled, enabled: false };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GuideManufacturerSource = api;
})(typeof window !== "undefined" ? window : globalThis);
