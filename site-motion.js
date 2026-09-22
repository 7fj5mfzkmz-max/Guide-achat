(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap) return;
  var gs = window.gsap;
  var reveal = document.querySelectorAll("main h1, main h2, main h3, .section, .cat-card, .method-grid > div, .lex-entry, .tool-box, .article-hero-stage");
  reveal.forEach(function (el, i) {
    gs.fromTo(el, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: .6, ease: "power2.out", delay: Math.min(i * .02, .16) });
  });
})();
