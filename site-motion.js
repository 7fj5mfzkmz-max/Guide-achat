(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap) return;
  var gs = window.gsap;
  if (window.ScrollTrigger) gs.registerPlugin(window.ScrollTrigger);

  /* Entrée en scène, groupée par bloc pour un effet en cascade plutôt
     qu'une simple apparition individuelle. */
  var groups = [
    ".stack-card", ".cat-card", ".section", ".lex-entry", ".faq-item",
    ".tool-box", ".interactive-demo", ".callout", ".keypoints", ".repere",
    ".why-card", ".why-copy", ".catalogue-group", ".guide-subsection"
  ];

  groups.forEach(function (selector) {
    var items = document.querySelectorAll(selector);
    if (!items.length) return;
    if (selector === ".stack-card") return; /* déjà géré par position: sticky */
    if (window.ScrollTrigger) {
      items.forEach(function (el, i) {
        gs.fromTo(el, { autoAlpha: 0, y: 26 }, {
          autoAlpha: 1, y: 0, duration: .55, ease: "power2.out",
          delay: Math.min((i % 6) * .05, .25),
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        });
      });
    } else {
      items.forEach(function (el, i) {
        gs.fromTo(el, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .55, ease: "power2.out", delay: Math.min(i * .03, .2) });
      });
    }
  });

  /* Titres : léger effet d'entrée depuis la gauche. */
  var headings = document.querySelectorAll("main h1, .section-intro h2, .why-copy h2");
  headings.forEach(function (el) {
    gs.fromTo(el, { autoAlpha: 0, x: -16 }, {
      autoAlpha: 1, x: 0, duration: .6, ease: "power2.out",
      scrollTrigger: window.ScrollTrigger ? { trigger: el, start: "top 92%", once: true } : undefined
    });
  });

  /* Survol "lift" doux sur les cartes cliquables (en plus du hover CSS). */
  var liftables = document.querySelectorAll(".cat-card, .catalogue-card, .hero-step, .search-result");
  liftables.forEach(function (el) {
    el.addEventListener("mouseenter", function () { gs.to(el, { y: -4, duration: .25, ease: "power2.out" }); });
    el.addEventListener("mouseleave", function () { gs.to(el, { y: 0, duration: .3, ease: "power2.out" }); });
  });

  /* Cartes de catégories : même comportement d'empilement que l'ancien
     bloc "chiffre / usage / décision". */
  var stackCards = document.querySelectorAll(".cat-stack .cat-card");
  if (stackCards.length && window.ScrollTrigger) {
    stackCards.forEach(function (card) {
      window.ScrollTrigger.create({
        trigger: card,
        start: "top 45%",
        end: "bottom 45%",
        toggleClass: { targets: card, className: "is-active" }
      });
    });
  }

  /* Halos du hero : légère dérive continue pour une page qui respire. */
  var orbits = document.querySelectorAll(".hero-orbit");
  if (orbits.length) {
    gs.to(orbits[0], { y: 24, x: -10, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });
    if (orbits[1]) gs.to(orbits[1], { y: -20, x: 12, duration: 8.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }
})();
