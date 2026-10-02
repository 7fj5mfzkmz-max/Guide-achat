/**
 * POINT 2 - COMPARATEUR VISUEL CÔTE À CÔTE
 * Sélectionner 2–3 modèles, voir leurs scores par profil en graphiques parallèles
 */
(function () {
  "use strict";

  var comparateur = {
    modeles_selectionnes: [],
    profils_actifs: ['Etudiant', 'Professionnel', 'Gamer', 'Photographe / Créateur', 'Casual'],

    /**
     * Ajoute/retire un modèle de la comparaison
     */
    toggleModele: function (nomModele) {
      var idx = this.modeles_selectionnes.indexOf(nomModele);
      if (idx === -1) {
        if (this.modeles_selectionnes.length < 3) {
          this.modeles_selectionnes.push(nomModele);
        }
      } else {
        this.modeles_selectionnes.splice(idx, 1);
      }
      return this.modeles_selectionnes;
    },

    /**
     * Génère le HTML du comparateur
     */
    renderComparateur: function () {
      if (this.modeles_selectionnes.length < 2) {
        return '<p style="text-align:center;color:var(--ink-soft)">Sélectionnez au moins 2 téléphones pour comparer.</p>';
      }

      var GP = window.GuideProfiles;
      var html = '<div class="hx-comparateur-grid">';

      // En-têtes : modèles
      html += '<div class="hx-comp-header"></div>';
      this.modeles_selectionnes.forEach(function (modele) {
        html += '<div class="hx-comp-header"><strong>' + modele + '</strong></div>';
      });

      // Lignes : profils + leurs scores
      var self = this;
      this.profils_actifs.forEach(function (profil) {
        html += '<div class="hx-comp-row-label"><span>' + profil + '</span></div>';

        self.modeles_selectionnes.forEach(function (modele) {
          var eval_result = GP.evaluerCompatibilite(modele, profil, 999999, false);
          var score = eval_result.score;
          var color = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#e63946';
          var intensity = Math.max(0.3, score / 100);

          html += '<div class="hx-comp-score" style="--score-color:' + color + ';--intensity:' + intensity + '">' +
            '<span class="hx-comp-bar"></span>' +
            '<strong>' + score + '</strong></div>';
        });
      });

      html += '</div>';
      return html;
    },

    /**
     * Points forts / points faibles
     */
    genererAnalyse: function (nomModele) {
      var GP = window.GuideProfiles;
      var notes = GP.getNotesCompletes(nomModele);
      if (!notes) return null;

      var entries = Object.entries(notes);
      entries.sort(function (a, b) { return b[1] - a[1]; });

      var forces = entries.slice(0, 3);
      var faiblesses = entries.slice(-3);

      return {
        forces: forces,
        faiblesses: faiblesses
      };
    }
  };

  window.ComparateurVisuel = comparateur;
})();
