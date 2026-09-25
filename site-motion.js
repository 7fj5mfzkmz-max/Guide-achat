(function () {
  "use strict";
  if (!window.gsap) return;
  var gs = window.gsap;
  var ST = window.ScrollTrigger;
  if (ST) gs.registerPlugin(ST);
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal: still subtle under reduced-motion, but never force elements invisible.
  document.querySelectorAll(".section, .lex-entry, .faq-item, .tool-box, .interactive-demo, .callout, .keypoints, .repere, .why-card, .why-copy, .catalogue-group, .guide-subsection").forEach(function (el, i) {
    if (reduced) { gs.set(el, {autoAlpha: 1, y: 0}); return; }
    if (ST) {
      gs.fromTo(el, {autoAlpha: 0, y: 22}, {autoAlpha: 1, y: 0, duration: .55, ease: "power2.out", delay: Math.min((i % 5) * .04, .18), scrollTrigger: {trigger: el, start: "top 90%", once: true}});
    } else {
      gs.fromTo(el, {autoAlpha: 0, y: 18}, {autoAlpha: 1, y: 0, duration: .5, ease: "power2.out"});
    }
  });

  document.querySelectorAll("main h1, .section-intro h2, .why-copy h2").forEach(function (el) {
    if (reduced) { gs.set(el, {autoAlpha: 1, x: 0}); return; }
    gs.fromTo(el, {autoAlpha: 0, x: -14}, {autoAlpha: 1, x: 0, duration: .6, ease: "power2.out", scrollTrigger: ST ? {trigger: el, start: "top 92%", once: true} : undefined});
  });

  // Home: the six category cards physically stack as the user scrolls.
  var stack = document.querySelectorAll(".cat-stack-interactive .cat-stack-item");
  if (stack.length) {
    stack.forEach(function(card, i) {
      card.style.zIndex = String(i + 1);
      card.style.setProperty("--stack-index", i);
      if (ST) {
        ST.create({
          trigger: card,
          start: "top 34%",
          end: "bottom 34%",
          onEnter: function(){ activate(card); },
          onEnterBack: function(){ activate(card); },
          onLeave: function(){ if (i < stack.length - 1) activate(stack[i+1]); },
          onLeaveBack: function(){ if (i > 0) activate(stack[i-1]); }
        });
      }
    });
    function activate(card) {
      stack.forEach(function(c){ c.classList.toggle("is-active", c === card); });
      if (!reduced) gs.to(card, {scale: 1.012, y: -3, duration: .32, ease: "power2.out", overwrite: true});
      stack.forEach(function(c){ if(c !== card && !reduced) gs.to(c, {scale: 1, y: 0, duration: .28, ease: "power2.out", overwrite: true}); });
    }
    activate(stack[0]);
  }

  // Étape 1.5 : scène en magasin, les indices s'activent au scroll.
  var storeSteps = document.querySelectorAll(".store-scene-step");
  if (storeSteps.length) {
    function activateStoreStep(step) {
      storeSteps.forEach(function (s) { s.classList.toggle("is-active", s === step); });
    }
    if (ST) {
      storeSteps.forEach(function (step, i) {
        ST.create({
          trigger: step,
          start: "top 62%",
          end: "bottom 45%",
          onEnter: function () { activateStoreStep(step); },
          onEnterBack: function () { activateStoreStep(step); }
        });
      });
    } else {
      storeSteps.forEach(function (s) { s.classList.add("is-active"); });
    }
  }

  // Small continuous hero motion.
  var orbits = document.querySelectorAll(".hero-orbit");
  if (!reduced && orbits.length) {
    gs.to(orbits[0], {y: 24, x: -10, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1});
    if (orbits[1]) gs.to(orbits[1], {y: -20, x: 12, duration: 8.5, ease: "sine.inOut", yoyo: true, repeat: -1});
  }

  // FALC deep mode: chapters and notions open/close with a short GSAP transition.
  document.querySelectorAll(".falc-chapter > summary").forEach(function(summary){
    summary.addEventListener("click", function(){
      var details = summary.parentElement;
      if (reduced) return;
      requestAnimationFrame(function(){
        gs.fromTo(details, {opacity: .72, y: 5}, {opacity: 1, y: 0, duration: .25, ease: "power2.out"});
      });
    });
  });

  // Comparateur interactif OLED / LCD / AMOLED.
  var displayCompare = document.getElementById("display-compare");
  if (displayCompare) {
    var tabs = displayCompare.querySelectorAll(".display-compare-tab");
    var panels = displayCompare.querySelectorAll(".display-compare-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.dataset.panel;
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", String(active));
        });
        panels.forEach(function (p) {
          var active = p.dataset.panel === target;
          p.classList.toggle("is-active", active);
          p.hidden = !active;
        });
      });
    });
  }

  // Gentle hover/tap feedback, including touch devices.
  document.querySelectorAll(".cat-card, .catalogue-card, .hero-step, .search-result").forEach(function(el){
    if (reduced) return;
    el.addEventListener("pointerenter", function(){ gs.to(el, {y: -4, duration: .22, ease: "power2.out", overwrite: true}); });
    el.addEventListener("pointerleave", function(){ gs.to(el, {y: 0, duration: .28, ease: "power2.out", overwrite: true}); });
  });
})();
