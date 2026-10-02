/**
 * CALCUL DU TEMPS DE LECTURE
 * Algorithme : 200 mots/min (standard francophone)
 * Affichage : badge "X min de lecture" sur chaque section
 */
(function () {
  "use strict";
  
  var WORDS_PER_MIN = 200; // Français standard
  
  /**
   * Compte les mots dans un élément texte (ignore script/style)
   */
  function countWords(el) {
    var clone = el.cloneNode(true);
    var scripts = clone.querySelectorAll('script, style, [role="presentation"]');
    scripts.forEach(function (s) { s.remove(); });
    var text = clone.textContent || '';
    var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
    return words.length;
  }

  /**
   * Calcule le temps de lecture pour une section
   */
  function getReadingTime(section) {
    var words = countWords(section);
    var minutes = Math.ceil(words / WORDS_PER_MIN);
    return Math.max(1, minutes); // Min 1 min
  }

  /**
   * Ajoute un badge de temps de lecture sur les sections
   */
  function addReadingTimeBadges() {
    var sections = document.querySelectorAll(
      '.hx-page .section, .hx-page .lexique-section, ' +
      '.hx-page .falc-chapter, .hx-page details.profile-toggle'
    );
    
    sections.forEach(function (sec) {
      if (sec.querySelector('[data-reading-time]')) return; // Déjà fait
      
      var minutes = getReadingTime(sec);
      var badge = document.createElement('span');
      badge.setAttribute('data-reading-time', minutes);
      badge.className = 'hx-reading-time';
      badge.textContent = minutes + ' min';
      badge.setAttribute('aria-label', 'Temps de lecture estimé : ' + minutes + ' minutes');
      
      // Chercher un titre h2/h3 ou section-heading pour y insérer le badge
      var heading = sec.querySelector('h2, h3, .section-heading');
      if (heading) {
        heading.appendChild(badge);
      } else {
        sec.insertBefore(badge, sec.firstChild);
      }
    });
  }

  /**
   * Calcule le temps total de lecture de la page
   */
  function getTotalReadingTime() {
    var main = document.querySelector('main');
    if (!main) return 0;
    return getReadingTime(main);
  }

  /**
   * Ajoute le temps total de lecture dans le hero
   */
  function addPageReadingTime() {
    var hero = document.querySelector('.hx-hero--page .hx-lead');
    if (!hero) return;
    
    var minutes = getTotalReadingTime();
    if (minutes > 0) {
      var badge = document.createElement('div');
      badge.className = 'hx-page-reading-time';
      badge.innerHTML = '<strong>⏱</strong> Lecture : ' + minutes + ' min';
      hero.parentNode.insertBefore(badge, hero.nextSibling);
    }
  }

  // Initialiser au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      requestAnimationFrame(function () {
        if (document.querySelector('.hx-page')) {
          addPageReadingTime();
          addReadingTimeBadges();
        }
      });
    });
  } else {
    requestAnimationFrame(function () {
      if (document.querySelector('.hx-page')) {
        addPageReadingTime();
        addReadingTimeBadges();
      }
    });
  }

  window.ReadingTimeCalculator = { getReadingTime, getTotalReadingTime, countWords };
})();
