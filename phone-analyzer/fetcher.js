(function (root) {
  "use strict";
  function resolveProduct(url, options) {
    options = options || {};
    var endpoint = options.endpoint || ((typeof window !== "undefined" && window.GUIDE_API_BASE) ? window.GUIDE_API_BASE.replace(/\/$/, "") + "/api/resolve" : "/api/resolve");
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutMs = typeof options.timeout === "number" ? options.timeout : 12000;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;
    return fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url }), signal: controller ? controller.signal : undefined })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok && !(data && data.clues)) throw new Error(data.error || ("HTTP " + response.status));
          return data;
        });
      }).then(function (data) {
        if (timer) clearTimeout(timer);
        return data;
      }, function (err) {
        if (timer) clearTimeout(timer);
        if (err && err.name === "AbortError") {
          throw new Error("Le serveur n’a pas répondu dans les 12 secondes.");
        }
        throw err;
      });
  }
  var api = { resolveProduct: resolveProduct };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerFetcher = api;
})(typeof window !== "undefined" ? window : globalThis);
