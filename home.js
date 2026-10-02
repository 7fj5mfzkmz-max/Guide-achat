(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    /* 2. Apparition au défilement, décalée entre éléments voisins. */
    var items = [].slice.call(document.querySelectorAll(".hx-reveal"));
    items.forEach(function (el) {
      var sibs = [].slice.call(el.parentNode.children).filter(function (n) { return n.classList.contains("hx-reveal"); });
      el.style.setProperty("--d", Math.min(sibs.indexOf(el) * 0.08, 0.4) + "s");
    });
    function revealAll() { items.forEach(function (el) { el.classList.add("is-in"); }); }
    if (reduced || !("IntersectionObserver" in window)) revealAll();
    else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      items.forEach(function (el) { io.observe(el); });
    }

    /* 3. Lueur qui suit le pointeur sur les cartes. */
    document.querySelectorAll(".hx-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });

    /* 4. Sélecteur de profil : les poids viennent de profiles.js (même source que le score). */
    var LABELS = { autonomie: "Autonomie", prix: "Prix", performance: "Performance", taille: "Taille", photo: "Photo", gaming: "Jeu" };
    var weights = window.GuideProfiles && window.GuideProfiles.weights;
    var tabs = [].slice.call(document.querySelectorAll(".hx-tab"));
    var bars = document.getElementById("hx-bars");
    function renderProfile(key, animate) {
      var w = weights && weights[key];
      if (!w || !bars) return;
      var rows = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; });
      bars.innerHTML = rows.map(function (k) {
        return '<div class="hx-bar"><span>' + LABELS[k] + '</span><span class="hx-bar-track"><span class="hx-bar-fill" style="--w:' + (animate ? 0 : Math.round(w[k] * 100)) + '" data-w="' + Math.round(w[k] * 100) + '"></span></span><strong>' + Math.round(w[k] * 100) + " %</strong></div>";
      }).join("");
      if (animate) requestAnimationFrame(function () { requestAnimationFrame(function () {
        bars.querySelectorAll(".hx-bar").forEach(function (row) {
          var f = row.querySelector(".hx-bar-fill"), n = row.querySelector("strong");
          f.style.setProperty("--w", f.dataset.w);
          if (window.__hxCountUp) window.__hxCountUp(n, Number(f.dataset.w), 700, " %");
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
    if (tabs.length && weights) selectTab(tabs[0], false);

    /* 5. Éléments qui s'illuminent à tour de rôle (les trois lignes restent toujours lisibles). */
    function cycle(selector, ms) {
      var list = [].slice.call(document.querySelectorAll(selector));
      if (list.length < 2) return;
      var i = 0, timer = null, box = list[0].parentNode;
      function on() { list.forEach(function (el, k) { el.classList.toggle("is-on", k === i); }); }
      function start() { if (!timer && !reduced) timer = setInterval(function () { i = (i + 1) % list.length; on(); }, ms); }
      function stop() { clearInterval(timer); timer = null; }
      on();
      if (reduced) { list.forEach(function (el) { el.classList.add("is-on"); }); return; }
      start();
      box.addEventListener("pointerenter", stop); box.addEventListener("pointerleave", start);
      box.addEventListener("focusin", stop); box.addEventListener("focusout", start);
      document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    }
    cycle(".hx-pair", 3200);
    cycle(".hx-step", 2600);

    /* 6. Barres de l'exemple : elles se remplissent quand la carte apparaît. */
    var exBars = document.querySelectorAll(".hx-example-bars .hx-bar-fill");
    if (exBars.length) {
      var fill = function () { exBars.forEach(function (f) { f.style.setProperty("--w", f.dataset.w); }); };
      if (reduced || !("IntersectionObserver" in window)) fill();
      else {
        var io2 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { fill(); io2.disconnect(); } }, { threshold: 0.4 });
        io2.observe(exBars[0].closest(".hx-visual"));
      }
    }

    /* 6b. Chiffres qui montent (score du téléphone, pourcentages du sélecteur). */
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
    var score = document.querySelector(".hx-phone-score b");
    if (score && !reduced) { score.textContent = "0"; setTimeout(function () { countUp(score, Number(score.dataset.count), 1400); }, 1100); }
    window.__hxCountUp = countUp;

    /* 6c. Léger décalage au défilement (bureau uniquement) : lueurs et téléphone bougent moins vite que la page. */
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

    /* 7. FAQ : ouverture animée, accessible au clavier. */
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
    if (window.console) console.error("home.js", err);
  }
})();
