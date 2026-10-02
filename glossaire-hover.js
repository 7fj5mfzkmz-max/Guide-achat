/**
 * POINT 4 - GLOSSAIRE ANIMÉ AU HOVER
 * Termes techniques avec popup explicatif et impact sur scoring
 */
(function () {
  "use strict";

  var glossaire = {
    'Hz': {
      def: 'Hertz — fréquence de rafraîchissement de l\'écran par seconde.',
      impact: 'À 60 Hz, l\'écran se redessine 60× par sec. À 120 Hz, mouvements plus fluides.',
      anim: '🔄'
    },
    'OLED': {
      def: 'Organic Light-Emitting Diode — technologie d\'écran où chaque pixel produit sa lumière.',
      impact: 'Noirs profonds, contraste infini, consommation plus variable selon le contenu.',
      anim: '⚫'
    },
    'LCD': {
      def: 'Liquid Crystal Display — écran rétroéclairé, moins cher et plus stable.',
      impact: 'Noirs moins profonds que l\'OLED, mais meilleure durabilité et moins de consommation variable.',
      anim: '◻️'
    },
    'mAh': {
      def: 'Milliampère-heure — unité de capacité électrique (non l\'énergie réelle).',
      impact: '5000 mAh sur une batterie 3.8V ≠ 5000 mAh sur 5V. L\'énergie réelle en Wh compte plus.',
      anim: '🔋'
    },
    'NPU': {
      def: 'Neural Processing Unit — processeur spécialisé pour l\'IA et traitement d\'image.',
      impact: 'Impact majeur pour photo/vidéo en post-traitement temps réel et IA générative locale.',
      anim: '🧠'
    },
    'TOPS': {
      def: 'Trillions Of Operations Per Second — capacité brute du processeur.',
      impact: 'Plus haut = plus rapide, mais ne suffit pas sans refroidissement et architecture optimale.',
      anim: '⚡'
    },
    'IP67': {
      def: 'Indice de Protection — IP6 = anti-poussière; 7 = immersion jusqu\'à 1m, 30 min.',
      impact: 'Utile en usage quotidien (pluie, éclaboussures). Pas critique pour bureau/étude.',
      anim: '💧'
    },
    'RAM': {
      def: 'Random Access Memory — mémoire vive, gère les applications simultanées.',
      impact: 'Au-delà de 8 GB, l\'impact sur fluidité est minimal ; 12 GB utile pour multitâche lourd.',
      anim: '↔️'
    },
    'UFS': {
      def: 'Universal Flash Storage — norme de stockage rapide (vs eMMC lent).',
      impact: 'UFS 4.0 = écritures rapides et latence basse. eMMC = bottleneck visible au quotidien.',
      anim: '⚙️'
    },
    'Nits': {
      def: 'Unité de luminance (intensité lumineuse visible).',
      impact: '300 nits = lisible en intérieur; 800+ = lisible au soleil; 2000+ = confort HDR.',
      anim: '☀️'
    }
  };

  function wrapTerms() {
    var main = document.querySelector('main') || document.body;
    var terms = Object.keys(glossaire);

    // Parcourir le DOM et envelopper les termes trouvés
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var text = node.textContent;
        var regex = new RegExp('\\b(' + terms.join('|') + ')\\b', 'gi');
        if (regex.test(text)) {
          var span = document.createElement('span');
          span.innerHTML = text.replace(regex, function (match) {
            return '<span class="hx-glossaire-term" data-term="' + match + '">' + match + '</span>';
          });
          node.parentNode.replaceChild(span, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE'].includes(node.tagName)) {
        Array.from(node.childNodes).forEach(walk);
      }
    }

    walk(main);
  }

  function initTooltips() {
    var container = document.createElement('div');
    container.className = 'hx-glossaire-tooltip';
    document.body.appendChild(container);

    document.addEventListener('mouseenter', function (e) {
      var term = e.target.closest('.hx-glossaire-term');
      if (!term) return;

      var termKey = term.textContent.toUpperCase();
      var data = glossaire[termKey];
      if (!data) return;

      var rect = term.getBoundingClientRect();
      container.innerHTML = '<b>' + data.anim + ' ' + termKey + '</b><p>' + data.def + '</p>' +
        '<div style="margin-top:.6rem;padding-top:.6rem;border-top:1px solid rgba(255,255,255,.2);font-size:.85rem;color:rgba(255,255,255,.8)">' +
        '<strong>Impact :</strong> ' + data.impact + '</div>';
      
      container.style.display = 'block';
      container.style.left = (rect.left + rect.width / 2) + 'px';
      container.style.top = (rect.top - 10) + 'px';
      container.classList.add('is-visible');
    }, true);

    document.addEventListener('mouseleave', function (e) {
      if (e.target.closest('.hx-glossaire-term')) {
        container.classList.remove('is-visible');
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      requestAnimationFrame(function () { wrapTerms(); initTooltips(); });
    });
  } else {
    requestAnimationFrame(function () { wrapTerms(); initTooltips(); });
  }
})();
