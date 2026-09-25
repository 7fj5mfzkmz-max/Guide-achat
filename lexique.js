(function () {
  'use strict';
  var root = document.documentElement;
  var topButton = document.getElementById('deep-toggle');
  var floatingButton = document.getElementById('lexique-detail-floating-button');
  var buttons = [topButton, floatingButton].filter(Boolean);
  var status = document.getElementById('deep-status');
  if (!buttons.length) return;

  function setMode(deep) {
    root.classList.toggle('lexique-deep', deep);
    document.querySelectorAll('.lex-deep').forEach(function (el) { el.hidden = !deep; });
    document.querySelectorAll('.lex-quick').forEach(function (el) { el.hidden = deep; });
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(deep));
      button.classList.toggle('is-on', deep);
      button.classList.toggle('is-off', !deep);
      var label = button.querySelector('[data-toggle-label]');
      var floatingLabel = button.querySelector('[data-floating-label]');
      if (label) label.textContent = deep ? 'Mode détails activé' : 'Explication approfondie';
      if (floatingLabel) floatingLabel.textContent = deep ? 'Mode détails' : 'Mode simple';
      button.setAttribute('aria-label', deep ? 'Revenir au mode simple' : 'Activer le mode détails');
    });
    if (status) status.textContent = deep
      ? 'Le texte simple est remplacé par les mécanismes, limites et critères techniques.'
      : 'Réponses courtes affichées par défaut.';
    try { localStorage.setItem('guide-achat-lexique-deep', deep ? '1' : '0'); } catch (_) {}
  }

  var saved = false;
  try { saved = localStorage.getItem('guide-achat-lexique-deep') === '1'; } catch (_) {}
  setMode(saved);
  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      setMode(!root.classList.contains('lexique-deep'));
    });
  });
})();
