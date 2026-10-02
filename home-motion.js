(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hero = document.querySelector(".home-hero");
  if (!hero || reduced || !("IntersectionObserver" in window)) return;
  root.classList.add("js-motion");

  /* 1. Titre : chaque mot monte depuis un masque, puis le reste de l'en-tête suit en cascade. */
  var h1 = hero.querySelector("h1");
  if (h1) {
    var text = h1.textContent.trim();
    h1.setAttribute("aria-label", text);
    h1.innerHTML = text.split(/\s+/).map(function (w, i) {
      return '<span class="hm-word" aria-hidden="true"><span class="hm-word-inner" style="--i:' + i + '">' + w + "</span></span>";
    }).join(" ");
  }
  hero.querySelectorAll(".hero-kicker, .hero-lead, .hero-step").forEach(function (el, i) {
    el.classList.add("hm-in"); el.style.setProperty("--d", (0.15 + i * 0.09) + "s");
  });
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("hm-ready"); }); });

  /* 2. Apparition au défilement, avec décalage entre cartes voisines. */
  var targets = document.querySelectorAll(".home-section .section-intro, .cat-card, .home-marquee, .home-section h2");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("hm-visible"); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  targets.forEach(function (el, i) {
    el.classList.add("hm-reveal");
    var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.style.setProperty("--d", Math.min(sib, 5) * 0.08 + "s");
    io.observe(el);
  });

  /* 3. Léger parallaxe des orbites du hero, désactivé hors de la zone visible. */
  var orbits = hero.querySelectorAll(".hero-orbit"), ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = Math.min(window.scrollY, 600);
      orbits.forEach(function (o, i) { o.style.transform = "translate3d(0," + (y * (i ? -0.08 : 0.12)) + "px,0)"; });
      ticking = false;
    });
  }, { passive: true });
})();
