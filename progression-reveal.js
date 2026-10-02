/**
 * POINT 7 - CRITÈRES CACHÉS RÉVÉLÉS PROGRESSIVEMENT
 * Au scroll, les critères se déverrouillent avec barre de progression
 */
(function () {
  "use strict";

  var criteriaOrder = [
    { name: 'Écran', icon: '◆', color: '#9c27b0', description: 'Densité, luminance, technologie' },
    { name: 'Batterie', icon: '◆', color: '#009688', description: 'Capacité, durabilité, chimie' },
    { name: 'Performance', icon: '◆', color: '#2196f3', description: 'CPU/GPU/NPU, RAM, refroidissement' },
    { name: 'Photo', icon: '◆', color: '#ff9800', description: 'Optique, capteur, algorithmes' },
    { name: 'Durabilité', icon: '◆', color: '#4caf50', description: 'Mises à jour, réparabilité, réseau' }
  ];

  function initProgressionBar() {
    var main = document.querySelector('main');
    if (!main || !main.classList.contains('hx-page')) return;

    var bar = document.createElement('div');
    bar.className = 'hx-progression-bar-wrapper';
    bar.innerHTML = '<div class="hx-progression-bar"><div class="hx-progression-fill" style="width:0%"></div></div>' +
      '<div class="hx-progression-criteria">' +
      criteriaOrder.map(function (c, i) {
        return '<span class="hx-progression-criterion" data-index="' + i + '" style="--criterion-color:' + c.color + '">' +
          '<b>' + c.icon + '</b><span>' + c.name + '</span></span>';
      }).join('') +
      '</div>';
    main.parentNode.insertBefore(bar, main);

    var unlockedCount = 0;

    function updateProgression() {
      var scrollPercent = Math.min(100, Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      ));

      var newUnlocked = Math.floor((scrollPercent / 100) * criteriaOrder.length);
      if (newUnlocked !== unlockedCount) {
        unlockedCount = newUnlocked;
        document.querySelectorAll('.hx-progression-criterion').forEach(function (el, i) {
          el.classList.toggle('is-unlocked', i < unlockedCount);
        });
      }

      document.querySelector('.hx-progression-fill').style.width = scrollPercent + '%';
    }

    window.addEventListener('scroll', updateProgression, { passive: true });
    updateProgression();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProgressionBar);
  } else {
    requestAnimationFrame(initProgressionBar);
  }
})();
