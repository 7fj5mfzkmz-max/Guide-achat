(function (root) {
  "use strict";
  /* Capture faite dans le navigateur de l'utilisateur (signet) : la page est lue telle que
     l'utilisateur la voit, sans passer par un serveur — fonctionne même quand un site bloque les robots. */
  function str(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
  function yearOf(s) { var m = String(s || "").match(/\b(20(?:1[8-9]|2[0-7]))\b/); return m ? Number(m[1]) : null; }

  function fromHash(hash, identify) {
    var m = /^#?capture=(.+)$/.exec(hash || "");
    if (!m) return null;
    var o;
    try { o = JSON.parse(decodeURIComponent(m[1])); } catch (_) { return null; }
    if (!o || typeof o !== "object") return null;
    var t = str(o.t, 200), u = str(o.u, 500), b = str(o.b, 80), e = str(o.e, 20).replace(/\D/g, ""), s = str(o.s, 60);
    if (!t && !u) return null;
    var local = {};
    try { local = identify.identifyFromUrl(u) || {}; } catch (_) {}
    return {
      ok: true, kind: "product", strategy: "capture",
      product: { name: t, brand: b || null, gtin: e || null, sku: s || null, source: "capture" },
      clues: { title: t, name: t || local.titleHint || null, brand: b || null, ean: e || local.ean || null, mpn: s || null, asin: local.asin || null, urlHint: local.titleHint || null, year: yearOf(t) }
    };
  }

  /* Code du signet : lit JSON-LD Product, #productTitle, og:title, h1 puis ouvre le guide avec le résultat. */
  function bookmarklet(origin) {
    var code = "(function(){try{var d=document,q=function(n){var e=d.querySelector('meta[property=\"'+n+'\"],meta[name=\"'+n+'\"]');return e?e.content:''},ld=[];" +
      "d.querySelectorAll('script[type=\"application/ld+json\"]').forEach(function(s){try{ld.push(JSON.parse(s.textContent))}catch(e){}});var p=null;" +
      "(function w(x){if(!x||p)return;if(Array.isArray(x))return x.forEach(w);if(typeof x==='object'){var t=x['@type'];if(t==='Product'||(Array.isArray(t)&&t.indexOf('Product')>-1)){p=x;return}w(x['@graph'])}})(ld);" +
      "var a=d.getElementById('productTitle'),h=d.querySelector('h1'),b=p&&p.brand?(p.brand.name||p.brand):'';" +
      "var o={u:location.href,t:((p&&p.name)||(a&&a.textContent)||q('og:title')||(h&&h.textContent)||d.title||'').replace(/\\s+/g,' ').trim(),b:b,e:p?(p.gtin13||p.gtin||p.gtin14||''):'',s:p?(p.sku||p.mpn||''):''};" +
      "location.href='" + origin + "/smartphones.html#capture='+encodeURIComponent(JSON.stringify(o))}catch(e){alert('Capture impossible sur cette page')}})();";
    return "javascript:" + code;
  }

  var api = { fromHash: fromHash, bookmarklet: bookmarklet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PhoneAnalyzerCapture = api;
})(typeof window !== "undefined" ? window : globalThis);
