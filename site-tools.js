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
          intro:"Lisez les valeurs du modèle et comparez-les à votre usage. Les pilules donnent immédiatement le sens du chiffre.",
          groups:[
            {key:"profile",label:"Profil",type:"choice",options:[
              ["student","Étudiant","Confort de lecture, autonomie et usage quotidien."],["pro","Professionnel","Lisibilité, fiabilité et usage prolongé."],["gamer","Gamer","Fluidité, réactivité et stabilité."],["mixed","Polyvalent","Équilibre entre confort, autonomie et fluidité."]]},
            {key:"tech",label:"Technologie",type:"pill",options:[
              ["oled","OLED","Pixels autoémissifs : un pixel peut s’éteindre pour obtenir un noir profond."],["amoled","AMOLED","OLED à matrice active : c’est une famille d’OLED, pas une garantie de qualité."],["lcd","LCD","Une source de rétroéclairage éclaire la dalle : les noirs sont moins indépendants."],["ltpo","LTPO","Permet de faire varier finement la fréquence pour économiser de l’énergie hors interaction."]]},
            {key:"refresh",label:"Fréquence",type:"pill",options:[
              ["60","60 Hz","60 images/s : suffisant pour la plupart des usages classiques."],["90","90 Hz","Défilement sensiblement plus fluide sans viser le maximum."],["120","120 Hz","Très fluide : intéressant pour navigation, animations et jeux compatibles."],["144","144 Hz","Gain surtout pertinent pour le jeu ; il faut que la puce et les jeux suivent."]]},
            {key:"brightness",label:"Luminosité",type:"brightness",options:[
              ["600","600 nits","Correct en intérieur et par temps modéré."],["1000","1 000 nits","Bonne marge pour l’extérieur."],["1600","1 600 nits","Très bonne lisibilité dans une forte lumière."],["2500","2 500+ nits","Très forte luminosité, à vérifier selon le mode de mesure utilisé."]]}
          ]
        },
        battery:{
          intro:"Ne regardez pas uniquement les mAh : capacité, chimie et puissance de recharge répondent à trois questions différentes.",
          groups:[
            {key:"capacity",label:"Capacité",type:"pill-meter",options:[["3000","3 000 mAh","Petit réservoir."],["4000","4 000 mAh","Capacité courante."],["5000","5 000 mAh","Base confortable pour beaucoup de téléphones."],["6000","6 000+ mAh","Réserve importante, mais le poids et la consommation comptent."]]},
            {key:"chemistry",label:"Technologie / chimie",type:"pill",options:[["liion","Li-ion","Technologie courante et éprouvée."],["lipoly","Li-polymère","Architecture très répandue dans les appareils fins."],["silicon","Silicium-carbone","Densité énergétique potentiellement supérieure à volume comparable."]]},
            {key:"charge",label:"Recharge",type:"pill-charge",options:[["25","25 W","Recharge relativement lente."],["45","45 W","Compromis courant entre vitesse et chauffe."],["67","67 W","Recharge rapide pour réduire fortement l’attente."],["100","100 W+","Très rapide sur les appareils compatibles ; la gestion thermique compte."]]}
          ]
        },
        performance:{
          intro:"Remplaçons « entrée / milieu / haut de gamme » par des références que vous pouvez reconnaître sur une fiche.",
          groups:[
            {key:"reference",label:"Référence de puce",type:"choice",options:[
              ["basic","Ex. Snapdragon 4 / Dimensity 600","Adapté aux usages courants ; marge plus limitée pour les jeux lourds."],["mid","Ex. Snapdragon 7 / Dimensity 8000","Zone de compromis : applications lourdes et jeux généralement plus confortables."],["high","Ex. Snapdragon 8 / Dimensity 9000+","Marge importante pour jeux, vidéo et traitement intensif."],["apple","Ex. Apple A-series récente","Très bonnes performances générales ; comparez aussi l’efficacité et la chauffe."]]},
            {key:"gaming",label:"Indice de performance",type:"choice",options:[
              ["daily","★★★☆☆ Quotidien","Web, réseaux, vidéo et applications courantes."],["heavy","★★★★☆ Lourd","Montage, multitâche et jeux exigeants avec une marge correcte."],["pro","★★★★★ Très lourd","Jeux poussés et calcul intensif : cherchez aussi les tests prolongés."]]},
            {key:"thermal",label:"Tenue dans le temps",type:"choice",options:[
              ["short","Test court","Une pointe de performance ne dit pas ce qui arrive après chauffe."],["sustained","Test 20–30 min","Plus révélateur de la stabilité réelle."],["cooling","Refroidissement travaillé","Point important pour maintenir les performances sur une longue session."]]}
          ]
        },
        photo:{
          intro:"Remplaçons le jargon par des références visibles sur une fiche ou dans un test photo.",
          groups:[
            {key:"sensor",label:"Capteur principal",type:"choice",options:[
              ["small","Ex. 1/2,76\"","Capteur plutôt petit : la lumière et le traitement deviennent plus critiques."],["medium","Ex. 1/1,56\"","Capteur plus grand : davantage de marge en basse lumière."],["large","Ex. 1\"","Très grand capteur pour smartphone : avantage potentiel en lumière et profondeur, selon l’optique."]]},
            {key:"stabilization",label:"Stabilisation",type:"choice",options:[
              ["none","EIS / numérique","Correction logicielle : utile, mais moins directe qu’une stabilisation optique."],["ois","OIS / optique","Le bloc optique compense les petits mouvements, notamment en basse lumière."],["both","OIS + EIS","Combinaison fréquente pour photo et vidéo."]]},
            {key:"zoom",label:"Zoom",type:"choice",options:[
              ["digital","Recadrage numérique","On agrandit l’image existante : la définition utile diminue avec le zoom."],["2x","Téléobjectif ~2×","Vrai module dédié : utile pour portraits et cadrages serrés."],["5x","Téléobjectif ~5×","Intérêt net à longue distance ; vérifiez la qualité entre les focales."]]},
            {key:"resolution",label:"Résolution",type:"choice",options:[
              ["12","12 Mpx","Déjà suffisant pour beaucoup d’usages ; la qualité dépend surtout du système complet."],["50","50 Mpx","Très courant : bonne marge de détail lorsque capteur, optique et traitement suivent."],["108","108 Mpx","Beaucoup de pixels : intéressant pour le recadrage dans de bonnes conditions."],["200","200 Mpx","Très haute définition : ne garantit ni plus de lumière ni de meilleures photos."]]}
          ]
        },
        longevity:{
          intro:"La cinquième vérification porte sur ce qui restera vrai après plusieurs années d’utilisation.",
          groups:[
            {key:"updates",label:"Mises à jour",type:"choice",options:[["3","3 ans ou moins","À considérer si vous changez régulièrement."],["5","Environ 5 ans","Marge correcte pour garder l’appareil plus longtemps."],["7","7 ans ou plus","À privilégier si la durée de possession est un critère majeur."]]},
            {key:"repair",label:"Réparation",type:"choice",options:[["low","Pièces limitées","Réparation potentiellement plus coûteuse ou lente."],["standard","Pièces disponibles","Meilleure visibilité pour les réparations courantes."],["good","Réparable + pièces accessibles","Plus simple à maintenir dans le temps."]]},
            {key:"protection",label:"Protection",type:"choice",options:[["basic","Protection basique","Coque et protection d’écran restent importantes."],["ip67","IP67","Résistance à la poussière et à l’eau selon les conditions prévues."],["ip68","IP68","Protection supérieure selon les conditions définies par le fabricant."]]}
          ]
        }
      };
      var totalGroups=Object.keys(configs).length;
      var state={};
      function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
      function renderGroup(group, selected){
        var opts=group.options.map(function(o){
          var active=selected===o[0];
          var cls='audit-pill audit-pill--'+esc(group.key)+' audit-pill--'+esc(o[0])+(active?' is-selected':'');
          var visual='<span class="pill-visual" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></span>';
          return '<button type="button" class="'+cls+'" data-value="'+esc(o[0])+'" aria-pressed="'+active+'">'+visual+'<span class="pill-copy"><strong>'+esc(o[1])+'</strong><small>'+esc(o[2])+'</small></span></button>';
        }).join('');
        if(group.type==='brightness'){
          opts=group.options.map(function(o){var active=selected===o[0];return '<button type="button" class="audit-pill audit-pill--brightness audit-pill--'+o[0]+(active?' is-selected':'')+'" data-value="'+o[0]+'" aria-pressed="'+active+'"><span class="pill-visual" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></span><span class="pill-copy"><strong>'+esc(o[1])+'</strong><small>'+esc(o[2])+'</small></span></button>';}).join('');
        }
        return '<div class="audit-control" data-group="'+group.key+'"><div class="audit-control-head"><strong>'+esc(group.label)+'</strong><span class="audit-control-value">'+(selected?esc((group.options.find(function(x){return x[0]===selected;})||['','Choisir'])[1]):'Choisir')+'</span></div><div class="audit-pills">'+opts+'</div></div>';
      }
      function renderCard(card,key){
        var cfg=configs[key]; state[key]=state[key]||{};
        var panel=card.querySelector('.audit-panel');
        panel.innerHTML='<p class="audit-panel-intro">'+esc(cfg.intro)+'</p>'+cfg.groups.map(function(g){return renderGroup(g,state[key][g.key]);}).join('');
        panel.hidden=false;
        requestAnimationFrame(function(){panel.classList.add('is-open');});
      }
      function updateCard(card,key){
        var cfg=configs[key], complete=cfg.groups.every(function(g){return state[key]&&state[key][g.key];});
        card.querySelector('.audit-status').textContent=complete?'Vérifié':'À vérifier';
        card.classList.toggle('is-complete',complete);
        updateTotal();
      }
      function updateTotal(){
        var done=Object.keys(configs).reduce(function(n,k){return n+(configs[k].groups.every(function(g){return state[k]&&state[k][g.key];})?1:0);},0);
        var count=document.getElementById('audit-count'),msg=document.getElementById('audit-message');
        if(count) count.textContent=done+' / 5 vérifiés';
        if(msg) msg.textContent=done===5?'Audit complet : vous avez maintenant une grille de comparaison exploitable.':done?'Chaque catégorie entièrement vérifiée compte pour 1/5.':'Ouvrez une catégorie et vérifiez les critères importants pour ce modèle.';
      }
      board.querySelectorAll('.audit-card').forEach(function(card){
        var key=card.getAttribute('data-audit-card');
        var trigger=card.querySelector('.audit-card-trigger');
        trigger.addEventListener('click',function(){
          var open=trigger.getAttribute('aria-expanded')==='true';
          board.querySelectorAll('.audit-card').forEach(function(other){
            if(other!==card){other.querySelector('.audit-card-trigger').setAttribute('aria-expanded','false');var p=other.querySelector('.audit-panel');p.classList.remove('is-open');setTimeout(function(){p.hidden=true;},180);}
          });
          trigger.setAttribute('aria-expanded',String(!open));
          if(!open) renderCard(card,key); else {card.querySelector('.audit-panel').classList.remove('is-open');setTimeout(function(){card.querySelector('.audit-panel').hidden=true;},180);}
        });
        card.addEventListener('click',function(e){
          var opt=e.target.closest('.audit-pill');
          if(!opt) return;
          var group=opt.closest('.audit-control').getAttribute('data-group');
          state[key]=state[key]||{}; state[key][group]=opt.getAttribute('data-value');
          var panel=card.querySelector('.audit-panel');
          panel.innerHTML='<p class="audit-panel-intro">'+esc(configs[key].intro)+'</p>'+configs[key].groups.map(function(g){return renderGroup(g,state[key][g.key]);}).join('');
          updateCard(card,key);
          var active=panel.querySelector('.audit-control[data-group="'+group+'"]').querySelector('.audit-pill[data-value="'+CSS.escape(state[key][group])+'"]');
          if(active) active.animate([{transform:'translateY(3px) scale(.97)'},{transform:'translateY(0) scale(1)'}],{duration:300,easing:'cubic-bezier(.2,.8,.2,1)'});
        });
      });
      updateTotal();
    })();

    initEditorialMotion();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGuideTools, { once: true });
  else initGuideTools();
})();
