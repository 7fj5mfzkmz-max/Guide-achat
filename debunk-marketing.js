/**
 * POINT 8 - DÉBUNKING MARKETING
 * Cartes "ce que ça change vraiment" vs "marketing sans impact"
 */
(function () {
  "use strict";

  var debunks = [
    {
      terme: '120 Hz',
      marketing: 'Écran ultra-fluide, meilleur que 60 Hz',
      realite: 'Fluidité visible SEULEMENT dans les jeux et défilement rapide. Peu d\'impact sur email, messagerie, web statique.',
      impact: 'Consomme ~15% plus d\'énergie. Utile pour gamer/créateur, marginal pour étudiant.',
      animation: '🔄'
    },
    {
      terme: 'RAM 12 Go',
      marketing: '12 Go de RAM = plus puissant, multitâche sans limites',
      realite: 'Au-delà de 8 Go, l\'impact sur la fluidité est imperceptible avec Android moderne. iPhone fonctionne avec 6 Go.',
      impact: 'Le gain réel intervient en cas de 20+ apps ouvertes simultanément (rare). Priorité : qualité du CPU.',
      animation: '↔️'
    },
    {
      terme: '5000 mAh',
      marketing: '5000 mAh = batterie énorme, autonomie garantie',
      realite: '5000 mAh ≠ énergie réelle. 5000 mAh @ 3.8V ≠ 5000 mAh @ 5V. L\'énergie en Wh compte plus.',
      impact: 'Un téléphone à 50W avec 5000 mAh peut tenir 12h; un autre à 25W avec 4000 mAh peut tenir 20h.',
      animation: '🔋'
    },
    {
      terme: 'IP68',
      marketing: 'Résistant à l\'eau en profondeur, aucun risque de mouillage',
      realite: 'IP68 = immersion jusqu\'à 1,5m pendant 30 min en eau douce. Piscine chlorée, eau salée, savon = risques.',
      impact: 'Utile pour pluie et éclaboussures. Ne permet pas de baigner l\'appareil. Pas critique pour usage normal.',
      animation: '💧'
    },
    {
      terme: '200 Mpx',
      marketing: '200 mégapixels = photos magnifiques, zoom infini',
      realite: 'Mégapixels seuls n\'ont pas d\'impact. Un capteur 1" @ 50 Mpx > capteur 1/2" @ 200 Mpx.',
      impact: 'L\'optique, la taille du capteur et l\'IA comptent 10× plus. 50 Mpx avec bon capteur suffit.',
      animation: '📷'
    },
    {
      terme: 'Snapdragon 8 Gen 3',
      marketing: 'Le plus puissant du marché, performances ultimes',
      realite: 'Puissance brute ≠ fluidité réelle. Optimisation système, RAM et refroidissement comptent autant.',
      impact: 'Un Snapdragon Gen 2 avec 12 GB RAM + refroidissement > Gen 3 avec 8 GB RAM + thermals faibles.',
      animation: '⚡'
    }
  ];

  function initDebunkCards() {
    var container = document.querySelector('[data-debunk-container]');
    if (!container) return;

    container.innerHTML = debunks.map(function (d, i) {
      return '<div class="hx-debunk-card" style="--delay:' + (i * 0.1) + 's">' +
        '<div class="hx-debunk-header">' +
        '<span class="hx-debunk-anim">' + d.animation + '</span>' +
        '<strong>' + d.terme + '</strong>' +
        '</div>' +
        '<div class="hx-debunk-section">' +
        '<span class="hx-debunk-label is-marketing">Marketing dit :</span>' +
        '<p>' + d.marketing + '</p>' +
        '</div>' +
        '<div class="hx-debunk-section">' +
        '<span class="hx-debunk-label is-realite">Réalité :</span>' +
        '<p>' + d.realite + '</p>' +
        '</div>' +
        '<div class="hx-debunk-section is-impact">' +
        '<span class="hx-debunk-label">Impact réel :</span>' +
        '<p>' + d.impact + '</p>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebunkCards);
  } else {
    requestAnimationFrame(initDebunkCards);
  }

  window.DebunkMarketing = { debunks };
})();
