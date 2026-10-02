/* TODO: Activer uniquement après vérification des conditions d'utilisation de Kimovil.
   Ce module est volontairement désactivé. Il doit fournir la même interface que catalogue.js. */
(function (root) {
  "use strict";
  function disabled() { return Promise.reject(new Error("Source Kimovil désactivée : conditions d'utilisation à vérifier.")); }
  var api = { load: disabled, resolve: disabled, enabled: false };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GuideKimovilSource = api;
})(typeof window !== "undefined" ? window : globalThis);
