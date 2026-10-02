(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = window.GuideCategories;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }
  try {
    /* 1. Titre : chaque mot monte depuis un masque. */
    var title = document.querySelector(".hx-title");
    if (title && !reduced) {
      var text = title.textContent.trim();
      title.setAttribute("aria-label", text);
      title.innerHTML = text.split(/\s+/).map(function (w, i) {
        return '<span class="hx-word" aria-hidden="true"><span style="--i:' + i + '">' + w + "</span></span>";
      }).join(" ");
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("hx-ready"); }); });

    /* 2. Pages intérieures : les cartes entrent comme sur l'accueil (hors contenus repliés). */
    document.querySelectorAll(".hx-page .section-heading, .hx-page .journey-step, .hx-page .profile-card, .hx-page .fiche-example-card, .hx-page .fiche-reading-card, .hx-page .audit-card, .hx-page .pitfall-card, .hx-page .lex-entry, .hx-page .callout, .hx-page .tool-box, .hx-page .hx-points li").forEach(function (el) {
      if (!el.closest("details:not([open])") && !el.closest(".hx-hero")) el.classList.add("hx-reveal");
    });

    /* 3. Catégorie active : hero, exemples et ronde (automatique dès que plusieurs catégories sont ouvertes). */
    var live = C ? C.live() : [];
    var pageCat = document.querySelector(".hx-page[data-cat]");
    var active = (pageCat && C.get(pageCat.getAttribute("data-cat"))) || live[0];
    var LABELS = { autonomie: "Autonomie", prix: "Prix", performance: "Performance", taille: "Taille", photo: "Photo", gaming: "Jeu" };
    var weights = window.GuideProfiles && window.GuideProfiles.weights;
    var bars = document.getElementById("hx-bars");

    function glyph(k) {
      var n = { hz: 3, battery: 1, drop: 1, pixels: 4 }[k];
      return n ? '<i class="hx-g hx-g-' + k + '" aria-hidden="true">' + new Array(n + 1).join("<b></b>") + "</i>" : "";
    }
    function renderStage(c, swap) {
      var box = document.getElementById("hx-stage");
      if (!box || !c) return;
      var st = c.stage || { title: c.label, bars: [82, 70, 58], score: 8 };
      var chips = (c.chips || c.terms.slice(0, 4).map(function (t) { return [t, ""]; }));
      box.innerHTML = '<div class="hx-phone"><span class="hx-phone-notch"></span><span class="hx-phone-title">' + esc(st.title) + "</span>" +
        st.bars.map(function (w) { return '<span class="hx-phone-bar"><i style="--w:' + w + '"></i></span>'; }).join("") +
        '<span class="hx-phone-score"><b data-count="' + st.score + '">' + st.score + "</b><small>/9</small></span></div>" +
        chips.slice(0, 4).map(function (t, i) { return '<span class="hx-chip hx-chip-' + "abcd".charAt(i) + '">' + glyph(t[1]) + esc(t[0]) + "</span>"; }).join("");
      if (swap && !reduced) { box.classList.remove("hx-stage-swap"); void box.offsetWidth; box.classList.add("hx-stage-swap"); }
      var score = box.querySelector(".hx-phone-score b");
      if (score && !reduced) { score.textContent = "0"; setTimeout(function () { countUp(score, Number(score.dataset.count), 1200); }, swap ? 500 : 1100); }
    }
    function renderPairs(c) {
      var box = document.getElementById("hx-pairs");
      if (!box || !c || !c.pairs) return;
      box.innerHTML = c.pairs.map(function (p) { return '<div class="hx-pair"><b>' + esc(p[0]) + "</b><span>" + esc(p[1]) + "</span></div>"; }).join("");
    }
    function renderExample(c) {
      var box = document.getElementById("hx-example");
      if (!box || !c || !c.example) return;
      var ex = c.example;
      box.innerHTML = '<p class="hx-example">' + esc(ex.name) + " <small>· " + esc(ex.note) + '</small></p><div class="hx-bars hx-example-bars">' +
        ex.scores.map(function (s) { return '<div class="hx-bar"><span>' + esc(s[0]) + '</span><span class="hx-bar-track"><span class="hx-bar-fill" style="--w:0" data-w="' + Math.round(s[1] / 9 * 100) + '"></span></span><strong>' + s[1] + "/9</strong></div>"; }).join("") + "</div>";
      var fills = box.querySelectorAll(".hx-bar-fill");
      var go = function () { fills.forEach(function (f) { f.style.setProperty("--w", f.dataset.w); }); };
      if (reduced || !("IntersectionObserver" in window)) go();
      else { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { go(); o.disconnect(); } }, { threshold: 0.4 }); o.observe(box); }
    }
    function setActive(c, swap) {
      if (!c) return;
      active = c;
      var hero = document.querySelector(".hx-hero");
      if (hero && !pageCat) hero.setAttribute("data-tone", c.tone);
      var und = document.getElementById("hx-understand");
      if (und) und.setAttribute("data-tone", c.tone);
      document.querySelectorAll(".hx-cat-name").forEach(function (n) { n.textContent = c.label; });
      document.querySelectorAll(".hx-cat-tab").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.cat === c.id)); });
      renderStage(c, swap); renderPairs(c); renderExample(c);
    }
    function renderCatTabs() {
      var box = document.getElementById("hx-cat-tabs");
      if (!box) return;
      box.hidden = live.length < 2;
      box.innerHTML = live.length < 2 ? "" : live.map(function (c) { return '<button class="hx-cat-tab" type="button" data-cat="' + c.id + '" data-tone="' + c.tone + '" aria-pressed="false">' + esc(c.label) + "</button>"; }).join("");
      box.addEventListener("click", function (e) { var b = e.target.closest(".hx-cat-tab"); if (b) { stopRound(); setActive(C.get(b.dataset.cat), true); renderProfile(tabs.length ? currentProfile : "etudiant", true); } });
    }
    var roundTimer = null;
    function stopRound() { clearInterval(roundTimer); roundTimer = null; }
    if (C && live.length > 1 && !pageCat && !reduced) {
      var all = live.slice();
      roundTimer = setInterval(function () {
        if (document.hidden) return;
        setActive(all[(all.indexOf(active) + 1) % all.length], true);
      }, 7000);
    }

    /* 4. Apparition au défilement, décalée entre éléments voisins. */
    function initReveal() {
      var items = [].slice.call(document.querySelectorAll(".hx-reveal"));
      items.forEach(function (el) {
        var sibs = [].slice.call(el.parentNode.children).filter(function (n) { return n.classList.contains("hx-reveal"); });
        el.style.setProperty("--d", Math.min(sibs.indexOf(el) * 0.08, 0.4) + "s");
      });
      if (reduced || !("IntersectionObserver" in window)) { items.forEach(function (el) { el.classList.add("is-in"); }); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      items.forEach(function (el) { io.observe(el); });
    }
    initReveal();

    /* 5. Lueur qui suit le pointeur sur les cartes (cartes créées après coup incluses). */
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".hx-card");
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });

    /* 6. Sélecteur de profil (accueil) : poids issus de profiles.js, comme le score. */
    var tabs = [].slice.call(document.querySelectorAll(".hx-tab"));
    var currentProfile = "etudiant";
    function renderProfile(key, animate) {
      var w = weights && weights[key];
      if (!w || !bars) return;
      currentProfile = key;
      var rows = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; });
      bars.innerHTML = rows.map(function (k) {
        return '<div class="hx-bar"><span>' + LABELS[k] + '</span><span class="hx-bar-track"><span class="hx-bar-fill" style="--w:' + (animate ? 0 : Math.round(w[k] * 100)) + '" data-w="' + Math.round(w[k] * 100) + '"></span></span><strong>' + Math.round(w[k] * 100) + " %</strong></div>";
      }).join("");
      if (animate) requestAnimationFrame(function () { requestAnimationFrame(function () {
        bars.querySelectorAll(".hx-bar").forEach(function (row) {
          var f = row.querySelector(".hx-bar-fill"), n = row.querySelector("strong");
          f.style.setProperty("--w", f.dataset.w);
          countUp(n, Number(f.dataset.w), 700, " %");
        });
      }); });
    }
    function selectTab(tab, focus) {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
      renderProfile(tab.dataset.profile, !reduced);
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectTab(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (n) { e.preventDefault(); selectTab(tabs[(i + n + tabs.length) % tabs.length], true); }
      });
    });

    function countUp(el, to, ms, suffix) {
      if (reduced) { el.textContent = to + (suffix || ""); return; }
      var t0 = null;
      function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e) + (suffix || "");
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    renderCatTabs();
    setActive(active, false);
    if (tabs.length && weights) selectTab(tabs[0], false);

    /* 7. Éléments qui s'illuminent à tour de rôle (liste relue à chaque tour : elle peut être régénérée). */
    function cycle(selector, ms) {
      var i = 0, timer = null;
      function list() { return [].slice.call(document.querySelectorAll(selector)); }
      function on() { var l = list(); l.forEach(function (el, k) { el.classList.toggle("is-on", k === i % l.length); }); }
      function start() { if (!timer && !reduced) timer = setInterval(function () { i++; on(); }, ms); }
      function stop() { clearInterval(timer); timer = null; }
      var first = list()[0];
      if (!first) return;
      if (reduced) { list().forEach(function (el) { el.classList.add("is-on"); }); return; }
      on(); start();
      var box = first.parentNode;
      box.addEventListener("pointerenter", stop); box.addEventListener("pointerleave", start);
      box.addEventListener("focusin", stop); box.addEventListener("focusout", start);
      document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    }
    cycle(".hx-pair", 3200);
    cycle(".hx-step", 2600);

    /* 8. Léger décalage au défilement (bureau uniquement). */
    var stage = document.querySelector(".hx-stage");
    if (!reduced && stage && window.matchMedia("(min-width: 981px)").matches) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () {
          var y = Math.min(window.scrollY, 900);
          stage.style.setProperty("--py", (y * -0.08).toFixed(1) + "px");
          root.style.setProperty("--by", (y * 0.12).toFixed(1) + "px");
          ticking = false;
        });
      }, { passive: true });
    }

    /* 9. FAQ : ouverture animée, accessible au clavier. */
    document.querySelectorAll(".hx-q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        btn.closest(".hx-qa").classList.toggle("is-open", !open);
      });
    });
  } catch (err) {
    /* En cas d'erreur, la page doit rester entièrement lisible. */
    root.classList.remove("hx-js");
    if (window.console) console.error("theme.js", err);
  }
})();
