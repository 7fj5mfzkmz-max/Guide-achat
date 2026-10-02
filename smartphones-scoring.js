(function () {
  "use strict";

  var root = document.getElementById("criteria-recommendations");
  var board = document.getElementById("purchase-audit");
  if (!root || !board) return;

  var dataUrl = "smartphones.json";
  var products = [];
  var currentProfile = localStorage.getItem("guide-profile") || "etudiant";

  var CRITERIA = [
    { key: "ecran", groups: ["tech", "refresh", "brightness"] },
    { key: "batterie", groups: ["capacity", "chemistry", "charge"] },
    { key: "performance", groups: ["reference", "gaming"] },
    { key: "photo", groups: ["sensor", "stabilization", "zoom", "resolution"] },
    { key: "durete", groups: ["updates", "repair", "protection"] }
  ];

  var SCORE_CAP = 9;

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
    });
  }

  function screenTechRank(t) {
    if (t === "ltpo") return 3;
    if (t === "amoled" || t === "oled") return 2;
    if (t === "lcd") return 1;
    return null;
  }

  function scoreEcran(p, s) {
    var c = p.compatibilite && p.compatibilite.ecran;
    if (!c) return [];
    var out = [];
    if (s.tech) {
      var want = screenTechRank(s.tech), have = screenTechRank(c.technologie);
      if (want != null && have != null) out.push(have >= want ? 1 : Math.max(0, 1 - (want - have) * 0.4));
    }
    if (s.refresh) {
      var w = Number(s.refresh), h = Number(c.frequence_max_hz);
      if (Number.isFinite(h)) out.push(h >= w ? 1 : Math.max(0, h / w));
    }
    if (s.brightness) {
      var wb = Number(s.brightness), hb = Number(c.luminosite_nits);
      if (Number.isFinite(hb)) out.push(hb >= wb ? 1 : Math.max(0, hb / wb));
    }
    return out;
  }

  function scoreBatterie(p, s) {
    var c = p.compatibilite && p.compatibilite.batterie;
    if (!c) return [];
    var out = [];
    if (s.capacity) {
      var w = Number(s.capacity), h = Number(c.capacite_mah);
      if (Number.isFinite(h)) out.push(h >= w ? 1 : Math.max(0, h / w));
    }
    if (s.charge) {
      var wc = Number(s.charge), hc = Number(c.recharge_watts);
      if (Number.isFinite(hc)) out.push(hc >= wc ? 1 : Math.max(0, hc / wc));
    }
    if (s.chemistry && c.chimie) out.push(c.chimie === s.chemistry ? 1 : 0.5);
    return out;
  }

  function scorePerformance(p, s) {
    var c = p.compatibilite && p.compatibilite.performance;
    if (!c) return [];
    var out = [];
    var usageMap = { basic: 3, mid: 4, high: 6, apple: 6 };
    if (s.reference && c.niveau != null) {
      var w = usageMap[s.reference] || 4;
      out.push(c.niveau >= w ? 1 : Math.max(0, c.niveau / w));
    }
    if (s.gaming && c.niveau != null) {
      var gamingMap = { daily: 3, heavy: 5, pro: 6 };
      var wg = gamingMap[s.gaming] || 4;
      out.push(c.niveau >= wg ? 1 : Math.max(0, c.niveau / wg));
    }
    return out;
  }

  function scorePhoto(p, s) {
    var c = p.compatibilite && p.compatibilite.photo;
    if (!c) return [];
    var out = [];
    if (s.resolution) {
      var w = Number(s.resolution), h = Number(c.mp_principal);
      if (Number.isFinite(h)) out.push(h >= w ? 1 : Math.max(0, h / w));
    }
    return out;
  }

  function protectionRank(ip) {
    var order = ["IP54", "IP64", "IP67", "IP68", "IP69"];
    var i = order.indexOf(ip);
    return i < 0 ? null : i;
  }

  function scoreDurete(p, s) {
    var c = p.compatibilite && p.compatibilite.durete;
    if (!c) return [];
    var out = [];
    if (s.protection) {
      var w = protectionRank(s.protection), h = protectionRank(c.protection_ip);
      if (w != null && h != null) out.push(h >= w ? 1 : Math.max(0, 1 - (w - h) * 0.3));
    }
    return out;
  }

  function auditToSelection(state) {
    var s = {};
    var screen = state.screen || {};
    var battery = state.battery || {};
    var performance = state.performance || {};
    var photo = state.photo || {};
    var longevity = state.longevity || {};
    if (screen.tech) s["ecran.tech"] = screen.tech === "ltpo" ? "LTPO" : screen.tech === "lcd" ? "LCD" : "AMOLED";
    if (screen.refresh) s["ecran.refresh"] = screen.refresh;
    if (screen.brightness) s["ecran.brightness"] = screen.brightness;
    if (battery.capacity) s["batterie.capacity"] = battery.capacity;
    if (battery.charge) s["batterie.charge"] = battery.charge;
    if (battery.chemistry) s["batterie.chemistry"] = battery.chemistry === "liion" ? "Lithium" : battery.chemistry === "lipoly" ? "Li-ion polymère" : "Titan / lithium";
    if (performance.reference) s["performance.reference"] = performance.reference;
    if (performance.gaming) s["performance.gaming"] = performance.gaming;
    if (photo.resolution) s["photo.resolution"] = photo.resolution;
    if (photo.sensor) s["photo.sensor"] = photo.sensor;
    if (photo.stabilization) s["photo.stabilization"] = photo.stabilization;
    if (photo.zoom) s["photo.zoom"] = photo.zoom;
    if (longevity.protection) s["durete.protection"] = longevity.protection.toUpperCase();
    if (longevity.updates) s["durete.updates"] = longevity.updates;
    if (longevity.repair) s["durete.repair"] = longevity.repair;
    return s;
  }

  function allCriteriaComplete(state) {
    return CRITERIA.every(function (criterion) {
      var part = state[criterion.key === "ecran" ? "screen" : criterion.key === "durete" ? "longevity" : criterion.key] || {};
      return criterion.groups.every(function (group) { return !!part[group]; });
    });
  }

  function computeCriteriaScore(p, state) {
    var s = auditToSelection(state);
    var by = [];
    var functions = {
      ecran: scoreEcran,
      batterie: scoreBatterie,
      performance: scorePerformance,
      photo: scorePhoto,
      durete: scoreDurete
    };
    var map = {
      ecran: { tech: "tech", refresh: "refresh", brightness: "brightness" },
      batterie: { capacity: "capacity", charge: "charge", chemistry: "chemistry" },
      performance: { reference: "reference", gaming: "gaming" },
      photo: { sensor: "sensor", stabilization: "stabilization", zoom: "zoom", resolution: "resolution" },
      durete: { protection: "protection", updates: "updates", repair: "repair" }
    };
    var all = [];
    Object.keys(functions).forEach(function (key) {
      var part = {};
      Object.keys(map[key]).forEach(function (target) {
        var source = map[key][target];
        var value = s[key + "." + source];
        if (value) part[target] = value;
      });
      var values = functions[key](p, part);
      all = all.concat(values);
      by.push({ key: key, note: values.length ? Math.round((values.reduce(function (a, b) { return a + b; }, 0) / values.length) * SCORE_CAP * 10) / 10 : null });
    });
    if (!all.length) return null;
    return Math.round((all.reduce(function (a, b) { return a + b; }, 0) / all.length) * SCORE_CAP * 10) / 10;
  }

  function profileScore(p, profile) {
    if (p.profil_scores && p.profil_scores[profile] != null) return Number(p.profil_scores[profile]);
    var s = p.scores || {};
    var weights = (window.GuideProfiles && window.GuideProfiles.weights && window.GuideProfiles.weights[profile]) || {};
    var total = 0, weight = 0;
    Object.keys(weights).forEach(function (key) {
      if (s[key] != null) { total += Number(s[key]) * weights[key]; weight += weights[key]; }
    });
    return weight ? Math.round((total / weight) * 10) / 10 : null;
  }

  function renderResults(state) {
    var container = document.getElementById("scoring-results");
    var status = document.getElementById("scoring-status");
    if (!container) return;
    container.innerHTML = "";

    if (!allCriteriaComplete(state)) {
      root.hidden = true;
      if (status) status.textContent = "Complétez les cinq critères pour obtenir jusqu’à trois recommandations.";
      return;
    }

    var scored = products.map(function (p) {
      var criteria = computeCriteriaScore(p, state);
      var profile = profileScore(p, currentProfile);
      return { p: p, criteria: criteria, profile: profile };
    }).filter(function (x) { return x.criteria != null && x.profile != null; })
      .sort(function (a, b) {
        return ((b.criteria * .7 + b.profile * .3) - (a.criteria * .7 + a.profile * .3));
      }).slice(0, 3);

    root.hidden = false;
    if (!scored.length) {
      if (status) status.textContent = "Aucun modèle suffisamment documenté ne correspond à ces critères pour le moment.";
      return;
    }
    if (status) status.textContent = "Trois modèles maximum sont affichés. La note correspond à votre profil « " + profileLabel(currentProfile) + " ».";

    scored.forEach(function (x, i) {
      var article = document.createElement("article");
      article.className = "criteria-recommendation-card";
      article.style.animationDelay = (i * .06) + "s";
      article.innerHTML =
        '<div class="criteria-recommendation-top"><span class="criteria-recommendation-brand">' + esc(x.p.marque || "") + '</span><span class="criteria-recommendation-score">' + x.profile.toFixed(1) + ' / 10</span></div>' +
        '<h4>' + esc(x.p.nom || "Modèle") + '</h4>' +
        '<p class="criteria-recommendation-meta">Sortie ' + (x.p.annee_sortie ? esc(x.p.annee_sortie) : "année à vérifier") + '</p>' +
        '<a class="criteria-recommendation-link" href="' + esc(x.p.idealo_url || "https://www.idealo.fr/cat/19116/smartphones.html") + '" target="_blank" rel="noopener">Prix sur Idealo →</a>';
      container.appendChild(article);
    });
  }

  function profileLabel(profile) {
    return { etudiant: "étudiant", professionnel: "professionnel", gamer: "gamer", photographe: "photographe" }[profile] || "votre profil";
  }

  function readProfileFromUI() {
    var active = document.querySelector('.profile-picker-tab.is-current');
    if (active && active.getAttribute("data-profile")) currentProfile = active.getAttribute("data-profile");
  }

  document.querySelectorAll(".profile-picker-tab").forEach(function (tab) {
    if (tab.getAttribute("data-profile") === currentProfile) tab.classList.add("is-current");
    tab.addEventListener("click", function () {
      currentProfile = tab.getAttribute("data-profile") || "etudiant";
      localStorage.setItem("guide-profile", currentProfile);
      document.querySelectorAll(".profile-picker-tab").forEach(function (item) { item.classList.toggle("is-current", item === tab); });
      renderResults(window.GuideAuditState || {});
    });
  });

  readProfileFromUI();

  window.addEventListener("guide:audit-change", function (event) {
    renderResults((event.detail && event.detail.state) || window.GuideAuditState || {});
  });

  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("Réponse HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      products = (data.produits || []).filter(function (p) { return p.ready_for_recommendation && p.compatibilite; });
      renderResults(window.GuideAuditState || {});
    })
    .catch(function () {
      var status = document.getElementById("scoring-status");
      if (status) status.textContent = "Les recommandations ne peuvent pas être chargées pour le moment.";
    });
})();
