(function () {
  "use strict";

  function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function normalize(text) {
    return cleanText(String(text || ""))
      .toLocaleLowerCase("fr-FR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’'`]/g, " ")
      .replace(/[^a-z0-9€+.%-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(text) {
    return normalize(text).split(/\s+/).filter(Boolean);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    if (Math.abs(a.length - b.length) > 2) return 99;
    var prev = [], curr = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      var swap = prev; prev = curr; curr = swap;
    }
    return prev[b.length];
  }

  var SEARCH_SYNONYMS = {
    autonomie: ["batterie", "endurance", "mAh", "charge"],
    batterie: ["autonomie", "mAh", "charge"],
    photo: ["camera", "appareil photo", "capteur", "objectif", "video"],
    camera: ["photo", "appareil photo", "capteur", "objectif"],
    appareil: ["photo", "camera"],
    ecran: ["display", "dalle", "amoled", "oled", "120hz", "luminosite"],
    display: ["ecran", "dalle", "amoled", "oled"],
    performance: ["processeur", "cpu", "puce", "ram", "puissance"],
    processeur: ["performance", "cpu", "puce", "gaming", "jeux"],
    cpu: ["processeur", "performance", "puce"],
    ram: ["memoire vive", "multitache", "performance"],
    stockage: ["memoire", "128go", "256go", "512go", "ufs"],
    memoire: ["stockage", "ram"],
    gaming: ["jeux", "jeu", "performance", "processeur", "gpu"],
    jeux: ["gaming", "jeu", "performance"],
    compact: ["taille", "petit", "format"],
    taille: ["compact", "grand ecran", "format"],
    prix: ["budget", "tarif", "cout", "euros"],
    budget: ["prix", "euros", "tarif"],
    eau: ["etancheite", "ip67", "ip68", "resistance"],
    etancheite: ["eau", "ip67", "ip68", "protection"],
    recharge: ["charge", "chargeur", "sans fil", "watt"],
    charge: ["recharge", "chargeur", "autonomie", "batterie"],
    rapide: ["charge", "recharge", "watt"],
    iphone: ["apple", "ios"],
    apple: ["iphone", "ios"],
    samsung: ["galaxy", "android"],
    android: ["samsung", "pixel", "xiaomi", "oneplus", "rog"],
    ios: ["iphone", "apple"],
    "5g": ["connexion", "reseau", "mobile"],
    esim: ["sim", "double sim", "voyage"],
    nfc: ["sans contact", "paiement"],
    ip68: ["etancheite", "eau", "poussiere"],
    ip67: ["etancheite", "eau", "poussiere"],
    hz: ["rafraichissement", "fluidite", "120hz", "60hz"],
    "5g": ["reseau", "bandes", "mobile"],
    "4k": ["video", "uhd", "resolution"],
    "8k": ["video", "resolution"],
    "2k": ["resolution", "ecran"],
    ois: ["stabilisation", "photo", "camera"],
    mp: ["megapixels", "photo", "capteur"],
    mah: ["batterie", "autonomie", "capacite"],
    usb: ["charge", "usb c", "recharge"],
    "usb-c": ["charge", "usb", "recharge"]
  };

  function expandTerms(query) {
    var base = tokens(query);
    var expanded = base.slice();
    base.forEach(function (term) {
      (SEARCH_SYNONYMS[term] || []).forEach(function (synonym) {
        tokens(synonym).forEach(function (part) {
          if (expanded.indexOf(part) === -1) expanded.push(part);
        });
      });
    });
    return { base: base, expanded: expanded };
  }

  function initGuideTools() {
    var root = document.documentElement;
    var header = document.querySelector(".site-header");
    var themeButton = document.getElementById("theme-toggle");
    var searchButton = document.getElementById("search-toggle");
    var searchPanel = document.getElementById("search-panel");
    var searchClose = document.getElementById("search-close");
    var searchBackdrop = searchPanel && searchPanel.querySelector(".search-panel-backdrop");
    var searchInput = document.getElementById("site-search-input");
    var searchResults = document.getElementById("site-search-results");

    function applyTheme(theme) {
      var dark = theme === "dark";
      root.classList.toggle("dark-theme", dark);
      if (!themeButton) return;
      themeButton.setAttribute("aria-pressed", dark ? "true" : "false");
      themeButton.setAttribute("aria-label", dark ? "Activer le thème clair" : "Activer le thème sombre");
      var icon = themeButton.querySelector(".theme-icon");
      if (icon) icon.textContent = dark ? "☀" : "☾";
    }

    var savedTheme = null;
    try { savedTheme = localStorage.getItem("guide-achat-theme"); } catch (e) {}
    applyTheme(savedTheme === "dark" ? "dark" : "light");

    if (themeButton) {
      themeButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var next = root.classList.contains("dark-theme") ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem("guide-achat-theme", next); } catch (e) {}
      }, false);
    }

    function setSearch(open) {
      if (!searchPanel) return;
      searchPanel.hidden = !open;
      searchPanel.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("search-open", open);
      if (searchButton) searchButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && searchInput) {
        setTimeout(function () { searchInput.focus(); }, 60);
      }
    }

    if (searchButton) searchButton.addEventListener("click", function (event) {
      event.preventDefault(); event.stopPropagation(); setSearch(true);
    }, false);
    if (searchClose) searchClose.addEventListener("click", function () { setSearch(false); }, false);
    if (searchBackdrop) searchBackdrop.addEventListener("click", function () { setSearch(false); }, false);

    function updateHeader() {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
    }
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setSearch(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setSearch(true);
      }
    });

    (function markCurrentNav() {
      var current = location.pathname.split("/").pop() || "index.html";
      document.querySelectorAll(".site-nav a").forEach(function (link) {
        var href = (link.getAttribute("href") || "").split("#")[0];
        if (href === current) link.setAttribute("aria-current", "page");
      });
    })();

    var index = [];
    var pages = [
      { url: "index.html", label: "Accueil" },
      { url: "smartphones.html", label: "Smartphones" },
      { url: "lexique.html", label: "Lexique" },
      { url: "comparateur.html", label: "Comparateur" },
      { url: "smartphones-approfondir.html", label: "Smartphones · détails techniques" }
    ];

    function addRecord(record) {
      if (!record || !record.title) return;
      record.title = cleanText(record.title);
      record.text = cleanText(record.text || record.title);
      record.normalizedTitle = normalize(record.title);
      record.normalizedText = normalize(record.text);
      record.titleTokens = tokens(record.title);
      record.textTokens = tokens(record.text);
      index.push(record);
    }

    function addPageToIndex(doc, page) {
      var seen = {};
      doc.querySelectorAll("h1, h2, h3, h4, .faq-item summary, .eyebrow").forEach(function (heading) {
        var title = cleanText(heading.textContent);
        if (!title || seen[title]) return;
        seen[title] = true;
        var section = heading.closest("section");
        var container = section || heading.closest("article") || heading.closest(".cat-card") || heading.parentElement;
        var text = cleanText(container ? container.textContent : heading.textContent);
        var id = section && section.id ? section.id : (heading.closest("[id]") ? heading.closest("[id]").id : "");
        addRecord({ title:title, text:text.slice(0,1200), page:page.label, url:page.url+(id ? "#"+id : ""), type:"content" });
      });
      // Add dense technical blocks that have no heading of their own. This makes
      // short queries such as 5G, IP68, OIS, 4K and Hz discoverable.
      doc.querySelectorAll("[id], .check-item, .signal-row, .detail-content, .deep-block").forEach(function (node) {
        var text = cleanText(node.textContent);
        if (!text || text.length < 18) return;
        var titleNode = node.querySelector("strong, h3, span") || node;
        var title = cleanText(titleNode.textContent);
        if (!title || title.length > 120) title = text.slice(0,80);
        var idNode = node.closest("[id]");
        var id = idNode ? idNode.id : "";
        var key = title + "|" + id;
        if (seen[key]) return;
        seen[key] = true;
        addRecord({ title:title, text:text.slice(0,700), page:page.label, url:page.url+(id ? "#"+id : ""), type:"detail" });
      });
    }

    function addProductsToIndex(data) {
      (data.produits || []).forEach(function (p) {
        var specs = Object.keys(p.caracteristiques || {}).map(function (key) {
          return key + " " + p.caracteristiques[key];
        }).join(" ");
        var text = [
          p.marque, p.nom, p.critere_principal, p.pour_qui,
          (p.profil_adapte || []).join(" "),
          (p.points_forts || []).join(" "),
          (p.points_faibles || []).join(" "),
          specs,
          typeof p.prix_indicatif === "number" ? p.prix_indicatif + " euros" : ""
        ].join(" ");
        addRecord({
          title: p.nom,
          text: text,
          page: "Smartphones · catalogue",
          url: "smartphones.html#catalogue-" + p.id,
          type: "product",
          brand: p.marque || ""
        });
      });
    }

    function loadIndex() {
      var jobs = pages.map(function (page) {
        var current = location.pathname.split("/").pop() || "index.html";
        if (current === page.url) {
          addPageToIndex(document, page);
          return Promise.resolve();
        }
        return fetch(page.url).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
          if (!html) return;
          addPageToIndex(new DOMParser().parseFromString(html, "text/html"), page);
        }).catch(function () {});
      });
      jobs.push(fetch("smartphones.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
        if (data) addProductsToIndex(data);
      }).catch(function () {}));
      return Promise.all(jobs);
    }

    // Mots trop courts ou trop fréquents pour porter un sens de recherche à eux seuls.
    var STOPWORDS = ["le","la","les","un","une","des","de","du","et","ou","est","son","sa","ses",
      "pour","dans","avec","sur","au","aux","en","que","qui","ne","pas","plus","tout","tous",
      "ce","cet","cette","vous","votre","vos","il","elle","ils","elles","se","sont","peut","peuvent"];

    function isStopword(token) {
      return token.length < 2 || STOPWORDS.indexOf(token) !== -1;
    }

    function tokenMatches(queryToken, candidateTokens, candidateText) {
      if (isStopword(queryToken)) return 0;
      // Correspondance exacte d'un mot entier dans le texte (bornée par des séparateurs).
      var exactWord = new RegExp("(^| )" + queryToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)");
      if (exactWord.test(candidateText)) return 1;
      var best = 0;
      candidateTokens.forEach(function (candidate) {
        if (candidate.length < 4) return;
        // Préfixe partagé significatif seulement (au moins 4 caractères communs), pas un simple "e" ou "de".
        if (queryToken.length >= 2 && candidate.length >= 2) {
          if (candidate.indexOf(queryToken) === 0 || queryToken.indexOf(candidate) === 0) best = Math.max(best, queryToken.length === 2 ? .55 : .7);
        }
        if (queryToken.length >= 6 && candidate.length >= 6) {
          var d = levenshtein(queryToken, candidate);
          if (d <= 1) best = Math.max(best, .5);
        }
      });
      return best;
    }

    function scoreRecord(record, query) {
      var expanded = expandTerms(query);
      var base = expanded.base.filter(function (t) { return !isStopword(t); });
      if (!base.length) return 0;
      var score = 0;
      var title = record.normalizedTitle;
      var text = record.normalizedText;
      var allTokens = record.titleTokens.concat(record.textTokens);
      var phrase = normalize(query);
      var matchedTerms = 0;
      if (phrase.length >= 2 && title === phrase) score += 100;
      if (phrase.length >= 2 && title.indexOf(phrase) !== -1) score += 55;
      if (phrase.length >= 2 && text.indexOf(phrase) !== -1) score += 22;
      base.forEach(function (term) {
        var titleMatch = tokenMatches(term, record.titleTokens, title);
        var textMatch = tokenMatches(term, allTokens, text);
        if (titleMatch > 0 || textMatch > 0) matchedTerms += 1;
        score += titleMatch * 30;
        score += textMatch * 6;
        var synonyms = SEARCH_SYNONYMS[term] || [];
        synonyms.forEach(function (syn) {
          var synTokens = tokens(syn).filter(function (t) { return !isStopword(t); });
          if (synTokens.some(function (st) {
            var re = new RegExp("(^| )" + st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)");
            return re.test(text);
          })) score += 4;
        });
      });
      // Exige qu'une part significative des termes saisis trouve un écho réel,
      // sinon une requête à plusieurs mots ne doit pas remonter sur un seul mot vague.
      var coverage = matchedTerms / base.length;
      if (base.length >= 2 && coverage < 0.5) score *= 0.25;
      if (record.type === "product") score += 3;
      if (record.brand && base.some(function (t) { return t.length >= 3 && normalize(record.brand).indexOf(t) !== -1; })) score += 26;
      return score;
    }

    function renderResults(query) {
      if (!searchResults) return;
      searchResults.innerHTML = "";
      var q = cleanText(query);
      if (!q) {
        searchResults.innerHTML = '<p class="search-empty">Recherchez un modèle, une marque, une caractéristique ou un usage.</p>';
        return;
      }
      var ranked = index.map(function (item) {
        return { item: item, score: scoreRecord(item, q) };
      }).filter(function (entry) { return entry.score >= 12; })
        .sort(function (a, b) { return b.score - a.score; });

      var unique = [];
      var seen = {};
      ranked.forEach(function (entry) {
        var key = entry.item.url + "|" + entry.item.title;
        if (!seen[key] && unique.length < 12) { seen[key] = true; unique.push(entry.item); }
      });

      if (!unique.length) {
        var terms = expandTerms(q).base;
        var suggestions = [];
        terms.forEach(function (term) {
          (SEARCH_SYNONYMS[term] || []).forEach(function (s) {
            if (suggestions.indexOf(s) === -1 && suggestions.length < 5) suggestions.push(s);
          });
        });
        var message = document.createElement("p");
        message.className = "search-empty";
        message.textContent = suggestions.length
          ? "Aucun résultat exact. Essayez : " + suggestions.join(", ") + "."
          : "Aucun résultat. Essayez un terme plus général ou une autre formulation.";
        searchResults.appendChild(message);
        return;
      }

      unique.forEach(function (item) {
        var link = document.createElement("a");
        link.className = "search-result";
        link.href = item.url;
        var page = document.createElement("span");
        page.className = "search-result-page";
        page.textContent = item.page;
        var title = document.createElement("strong");
        title.textContent = item.title;
        var excerpt = document.createElement("p");
        excerpt.textContent = item.text.slice(0, 260) + (item.text.length > 260 ? "…" : "");
        link.appendChild(page); link.appendChild(title); link.appendChild(excerpt);
        link.addEventListener("click", function () { setSearch(false); });
        searchResults.appendChild(link);
      });
    }

    var searchDebounce = null;
    if (searchInput) searchInput.addEventListener("input", function () {
      var value = searchInput.value;
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(function () { renderResults(value); }, 90);
    });
    loadIndex();

    function initEditorialMotion() {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!window.gsap) return;
      var reveal = document.querySelectorAll(".site-redesign .section, .site-redesign .cat-card, .site-redesign .lex-entry, .site-redesign .article-hero-stage");
      reveal.forEach(function (el, i) {
        window.gsap.fromTo(el, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: .65, ease: "power2.out", delay: Math.min(i * .025, .18) });
      });
    }
    (function bindPurchaseAudit(){
      var board=document.getElementById("purchase-audit");
      if(!board) return;
      var configs={
        screen:{
          intro:"Commencez par l’usage : un bon écran est celui dont les caractéristiques répondent à votre contexte.",
          groups:[
            {key:"profile",label:"Profil",type:"choice",options:[
              ["student","Étudiant","Priorité à la lisibilité, au confort et à l’autonomie."],["pro","Professionnel","Priorité à la lisibilité, à la fiabilité et à l’usage prolongé."],["gamer","Gamer","Priorité à la fluidité, au temps de réponse et à la stabilité."],["mixed","Polyvalent","Cherchez un équilibre plutôt qu’un maximum partout."]]},
            {key:"tech",label:"Technologie",type:"choice",options:[
              ["oled","OLED","Chaque pixel peut s’éteindre : contraste très élevé et noirs profonds."],["amoled","AMOLED","Une famille d’OLED à matrice active ; le terme seul ne garantit pas la qualité."],["lcd","LCD","Rétroéclairage commun : technologie mature, souvent économique et lisible selon la dalle."],["ltpo","LTPO","Dalle permettant une fréquence variable plus fine, utile pour combiner fluidité et économie d’énergie."]]},
            {key:"refresh",label:"Fréquence",type:"choice",options:[
              ["60","60 Hz","Animation sobre ; suffisante pour les usages classiques."],["90","90 Hz","Défilement plus fluide avec un coût énergétique modéré."],["120","120 Hz","Très fluide ; particulièrement intéressant pour le défilement et les jeux compatibles."],["144","144 Hz","Marge supplémentaire surtout pertinente pour le jeu ; à mettre en relation avec la puissance du téléphone."]]},
            {key:"brightness",label:"Luminosité",type:"brightness",options:[["600","600 nits"],["1000","1 000 nits"],["1600","1 600 nits"],["2500","2 500+ nits"]]}
          ]
        },
        battery:{
          intro:"La capacité indique le réservoir. L’autonomie dépend aussi de la consommation et de la chimie.",
          groups:[
            {key:"capacity",label:"Capacité",type:"capacity",options:[["3000","3 000 mAh"],["4000","4 000 mAh"],["5000","5 000 mAh"],["6000","6 000+ mAh"]]},
            {key:"chemistry",label:"Technologie / chimie",type:"choice",options:[["liion","Li-ion","Technologie courante et éprouvée."],["lipoly","Li-polymère","Architecture de cellule flexible, très répandue dans les appareils fins."],["silicon","Silicium-carbone","Permet de viser une densité énergétique plus élevée dans un volume donné."]]},
            {key:"charge",label:"Recharge",type:"charge",options:[["25","25 W"],["45","45 W"],["67","67 W"],["100","100 W+" ]]}
          ]
        },
        performance:{
          intro:"Le chiffre d’une puce ne suffit pas : cherchez l’usage visé et la tenue dans le temps.",
          groups:[
            {key:"usage",label:"Usage",type:"choice",options:[["basic","Basique","Web, messages, vidéo et applications courantes."],["pro","Productivité","Multitâche, photo, vidéo et applications lourdes."],["game","Jeu","GPU, refroidissement et stabilité des performances deviennent prioritaires."]]},
            {key:"tier",label:"Niveau de puce",type:"choice",options:[["entry","Entrée de gamme","Pour les tâches courantes avec des compromis sur les jeux lourds."],["mid","Milieu de gamme","Bon compromis pour la majorité des usages."],["high","Haut de gamme","Marge importante pour les tâches lourdes et la longévité des performances."]]},
            {key:"thermal",label:"Performance soutenue",type:"choice",options:[["short","Test court","Une pointe de performance : utile mais incomplète."],["sustained","Test 20–30 min","Montre mieux la stabilité après montée en température."],["cooling","Refroidissement travaillé","Intéressant pour le jeu et les charges prolongées."]]}
          ]
        },
        photo:{
          intro:"Pour la photo, vérifiez le système complet plutôt qu’un seul nombre de mégapixels.",
          groups:[
            {key:"sensor",label:"Capteur principal",type:"choice",options:[["small","Petit","Le traitement logiciel prend davantage d’importance lorsque la lumière manque."],["large","Grand","Plus de marge pour capter de la lumière et préserver les détails."],["highres","Haute définition","Utile pour le recadrage si l’optique et le traitement suivent."]]},
            {key:"stabilization",label:"Stabilisation",type:"choice",options:[["none","Numérique","Correction logicielle, utile mais limitée dans certaines scènes."],["ois","OIS","Stabilisation optique : particulièrement utile à main levée et en basse lumière."],["ois-eis","OIS + EIS","Combinaison fréquente pour photo et vidéo, selon le mode utilisé."]]},
            {key:"scene",label:"Scène à vérifier",type:"choice",options:[["night","Nuit","Regardez bruit, détails et couleurs dans une scène sombre."],["motion","Mouvement","Vérifiez les visages et sujets qui bougent."],["zoom","Zoom","Vérifiez le vrai téléobjectif plutôt qu’un simple recadrage numérique."]]},
            {key:"resolution",label:"Résolution",type:"choice",options:[["12","12 Mpx","Souvent suffisant pour partager et imprimer à taille courante."],["50","50 Mpx","Bon niveau de détail avec davantage de marge de recadrage."],["108","108 Mpx","Potentiel élevé, à juger avec le capteur et l’optique."],["200","200 Mpx","Très haute définition : utile dans certaines conditions, mais pas un verdict sur la qualité."]]}
          ]
        },
        longevity:{
          intro:"Un bon achat doit rester utilisable : vérifiez ce qui est garanti au-delà du jour d’achat.",
          groups:[
            {key:"updates",label:"Mises à jour",type:"choice",options:[["3","3 ans ou moins","Durée à considérer si vous changez régulièrement."],["5","Environ 5 ans","Meilleure marge pour garder le téléphone plus longtemps."],["7","7 ans ou plus","Politique de suivi particulièrement importante pour un achat long terme."]]},
            {key:"repair",label:"Réparation",type:"choice",options:[["low","Pièces limitées","Risque de coût ou d’attente plus élevé."],["standard","Pièces disponibles","Situation plus simple pour les réparations courantes."],["good","Réparable + pièces accessibles","Meilleure visibilité sur la durée de possession."]]},
            {key:"protection",label:"Protection",type:"choice",options:[["basic","Protection basique","Coque et verre restent importants."],["ip67","IP67","Protection définie contre poussière et immersion dans des conditions précises."],["ip68","IP68","Niveau de protection supérieur dans les conditions prévues par le fabricant."]]}
          ]
        }
      };
      var totalGroups=Object.keys(configs).reduce(function(n,k){return n+configs[k].groups.length;},0);
      var state={};
      function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
      function renderGroup(group, selected){
        if(group.type==='brightness'){
          var opts=group.options.map(function(o){return '<button type="button" class="audit-option" data-value="'+o[0]+'" aria-pressed="'+(selected===o[0])+'"><span>'+esc(o[1])+'</span></button>';}).join('');
          var val=selected||group.options[0][0];
          return '<div class="audit-control" data-group="'+group.key+'"><div class="audit-control-head"><strong>'+esc(group.label)+'</strong><span class="audit-control-value" data-value-label>'+esc(selected?group.options.find(function(x){return x[0]===selected;})[1]:'Choisir')+'</span></div><div class="brightness-stage" data-brightness="'+val+'"><div class="brightness-glow"></div><div class="brightness-surface"></div></div><div class="audit-options">'+opts+'</div></div>';
        }
        if(group.type==='capacity'){
          var opts=group.options.map(function(o){return '<button type="button" class="audit-option" data-value="'+o[0]+'" aria-pressed="'+(selected===o[0])+'"><span>'+esc(o[1])+'</span></button>';}).join('');
          var pct=Math.min(100,Math.max(0,((Number(selected||group.options[0][0])-2500)/4000)*100));
          return '<div class="audit-control" data-group="'+group.key+'"><div class="audit-control-head"><strong>'+esc(group.label)+'</strong><span class="audit-control-value" data-value-label>'+esc(selected?group.options.find(function(x){return x[0]===selected;})[1]:'Choisir')+'</span></div><div class="capacity-meter"><i style="width:'+pct+'%"></i></div><div class="audit-options">'+opts+'</div></div>';
        }
        if(group.type==='charge'){
          var opts=group.options.map(function(o){return '<button type="button" class="audit-option" data-value="'+o[0]+'" aria-pressed="'+(selected===o[0])+'"><span>'+esc(o[1])+'</span></button>';}).join('');
          return '<div class="audit-control" data-group="'+group.key+'"><div class="audit-control-head"><strong>'+esc(group.label)+'</strong><span class="audit-control-value" data-value-label>'+esc(selected?group.options.find(function(x){return x[0]===selected;})[1]:'Choisir')+'</span></div><div class="charge-animation" data-charge="'+(selected||25)+'"><div class="charge-battery"><i></i><b>↯</b></div><span>Temps relatif : <strong data-charge-time>—</strong></span></div><div class="audit-options">'+opts+'</div></div>';
        }
        return '<div class="audit-control" data-group="'+group.key+'"><div class="audit-control-head"><strong>'+esc(group.label)+'</strong><span class="audit-control-value" data-value-label>'+esc(selected?group.options.find(function(x){return x[0]===selected;})[1]:'Choisir')+'</span></div><div class="audit-options">'+group.options.map(function(o){return '<button type="button" class="audit-option" data-value="'+o[0]+'" aria-pressed="'+(selected===o[0])+'"><strong>'+esc(o[1])+'</strong><small>'+esc(o[2])+'</small></button>';}).join('')+'</div></div>';
      }
      function renderCard(card,key){
        var cfg=configs[key]; state[key]=state[key]||{};
        var panel=card.querySelector('.audit-panel');
        panel.innerHTML='<p class="audit-panel-intro">'+esc(cfg.intro)+'</p>'+cfg.groups.map(function(g){return renderGroup(g,state[key][g.key]);}).join('')+'<div class="audit-score" data-score>Choisissez les options pour construire votre profil.</div>';
        panel.hidden=false;
        requestAnimationFrame(function(){panel.classList.add('is-open');});
      }
      function updateCard(card,key){
        var cfg=configs[key], done=cfg.groups.filter(function(g){return state[key]&&state[key][g.key];}).length;
        card.querySelector('.audit-status').textContent=done+'/'+cfg.groups.length;
        card.classList.toggle('is-complete',done===cfg.groups.length);
        var score=card.querySelector('[data-score]');
        if(score){
          if(key==='battery'){
            var cap=Number(state[key].capacity||0), ch=Number(state[key].charge||25), auto=cap>=5500?5:cap>=5000?4:cap>=4000?3:2;
            if(ch>=67) auto=Math.min(5,auto+1);
            score.innerHTML='<strong>Score autonomie indicatif : '+auto+'/5</strong><span>Capacité + technologie de cellule + recharge. Ce score ne remplace pas un test d’autonomie.</span>';
          } else if(done) score.innerHTML='<strong>'+done+' choix documentés</strong><span>Le but est de relier la fiche technique à votre usage, pas de collectionner les chiffres.</span>';
        }
        updateTotal();
      }
      function updateTotal(){
        var done=Object.keys(configs).reduce(function(n,k){return n+(configs[k].groups.filter(function(g){return state[k]&&state[k][g.key];}).length);},0);
        var count=document.getElementById('audit-count'),msg=document.getElementById('audit-message');
        if(count) count.textContent=done+' / '+totalGroups+' vérifiés';
        if(msg) msg.textContent=done===totalGroups?'Audit complet : vous avez maintenant une grille de comparaison exploitable.':done>=6?'Vous avez assez d’éléments pour comparer deux modèles sans vous laisser guider par un seul chiffre.':'Ouvrez une carte et choisissez les options qui correspondent au modèle que vous regardez.';
      }
      board.querySelectorAll('.audit-card').forEach(function(card){
        var key=card.getAttribute('data-audit-card');
        var trigger=card.querySelector('.audit-card-trigger');
        trigger.addEventListener('click',function(){
          var open=trigger.getAttribute('aria-expanded')==='true';
          board.querySelectorAll('.audit-card').forEach(function(other){if(other!==card){other.querySelector('.audit-card-trigger').setAttribute('aria-expanded','false');other.querySelector('.audit-panel').hidden=true;other.querySelector('.audit-panel').classList.remove('is-open');}});
          trigger.setAttribute('aria-expanded',String(!open));
          if(!open) renderCard(card,key); else {card.querySelector('.audit-panel').classList.remove('is-open');setTimeout(function(){card.querySelector('.audit-panel').hidden=true;},220);}
        });
        card.addEventListener('click',function(e){
          var opt=e.target.closest('.audit-option');
          if(!opt) return;
          var group=opt.closest('.audit-control').getAttribute('data-group');
          state[key]=state[key]||{}; state[key][group]=opt.getAttribute('data-value');
          var cfg=configs[key], panel=card.querySelector('.audit-panel');
          panel.innerHTML='<p class="audit-panel-intro">'+esc(cfg.intro)+'</p>'+cfg.groups.map(function(g){return renderGroup(g,state[key][g.key]);}).join('')+'<div class="audit-score" data-score></div>';
          updateCard(card,key);
          var active=panel.querySelector('.audit-control[data-group="'+group+'"] .audit-option[data-value="'+CSS.escape(state[key][group])+'"]');
          if(active){active.animate([{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});}
        });
      });
      updateTotal();
    })();

    initEditorialMotion();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGuideTools, { once: true });
  else initGuideTools();
})();
