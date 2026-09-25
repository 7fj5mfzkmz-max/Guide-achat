(function () {
  'use strict';
  const button = document.getElementById('deep-toggle');
  const status = document.getElementById('deep-status');
  const root = document.documentElement;
  if (!button) return;

  function setMode(deep) {
    root.classList.toggle('lexique-deep', deep);
    document.querySelectorAll('.lex-deep').forEach(function (el) { el.hidden = !deep; });
    button.setAttribute('aria-pressed', String(deep));
    button.classList.toggle('is-on', deep);
    button.querySelector('[data-toggle-label]').textContent = deep ? 'Explication approfondie activée' : 'Explication approfondie';
    if (status) status.textContent = deep ? 'Les explications détaillées remplacent les réponses courtes.' : 'Réponses courtes affichées par défaut.';
    try { localStorage.setItem('guide-achat-lexique-deep', deep ? '1' : '0'); } catch (_) {}
  }

  let saved = false;
  try { saved = localStorage.getItem('guide-achat-lexique-deep') === '1'; } catch (_) {}
  setMode(saved);
  button.addEventListener('click', function () {
    setMode(!root.classList.contains('lexique-deep'));
  });
})();
