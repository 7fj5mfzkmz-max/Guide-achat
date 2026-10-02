/**
 * QUIZ INTERACTIF - « Quel est vraiment votre usage ? »
 * Remplace l'analyse de profil statique par un quiz dynamique
 * Résultat : profil calculé + top 3 recommandations
 */
(function () {
  "use strict";

  var quizData = {
    questions: [
      {
        id: 'activite',
        titre: 'Que faites-vous majoritairement avec votre téléphone ?',
        type: 'single',
        reponses: [
          { label: 'Étudier, prendre des notes, lire (cours, articles)', score: { etudiant: 1.0 } },
          { label: 'Travailler (emails, visio, productivité)', score: { professionnel: 1.0 } },
          { label: 'Jouer à des jeux, streaming vidéo', score: { gamer: 1.0 } },
          { label: 'Prendre des photos/vidéos régulièrement', score: { photographe: 1.0 } },
          { label: 'Usage basique (appels, web, réseaux sociaux)', score: { casual: 1.0 } }
        ]
      },
      {
        id: 'budget',
        titre: 'Quel est votre budget maximum ?',
        type: 'single',
        reponses: [
          { label: 'Moins de 400 €', score: { etudiant: 0.8, casual: 0.8 } },
          { label: '400 – 600 €', score: { etudiant: 1.0 } },
          { label: '600 – 900 €', score: { professionnel: 0.8, gamer: 0.6 } },
          { label: '900 € – 1200 €', score: { professionnel: 1.0, gamer: 0.9, photographe: 0.8 } },
          { label: 'Plus de 1200 €', score: { gamer: 1.0, photographe: 1.0 } }
        ]
      },
      {
        id: 'duree',
        titre: 'Combien de temps voulez-vous garder ce téléphone ?',
        type: 'single',
        reponses: [
          { label: '2–3 ans (suivi technologique)', score: { gamer: 0.7, casual: 0.6 } },
          { label: '4–5 ans (amortissement bon marché)', score: { etudiant: 1.0 } },
          { label: '5+ ans (investissement long terme)', score: { professionnel: 1.0, photographe: 0.9 } },
          { label: 'Peu importe (remplacement régulier)', score: { casual: 0.8 } }
        ]
      },
      {
        id: 'performance',
        titre: 'Que vous frustre le plus dans un téléphone ?',
        type: 'single',
        reponses: [
          { label: 'Batterie qui ne tient pas la journée', score: { etudiant: 1.0, casual: 0.9 } },
          { label: 'Ralentissements et saccades', score: { gamer: 1.0, professionnel: 0.8 } },
          { label: 'Photos décevantes ou bruyantes', score: { photographe: 1.0 } },
          { label: 'Perte de connexion réseau', score: { professionnel: 1.0 } },
          { label: 'Rien spécifiquement', score: { casual: 1.0 } }
        ]
      },
      {
        id: 'environnement',
        titre: 'Dans quel environnement l\'utilisez-vous le plus ?',
        type: 'single',
        reponses: [
          { label: 'En déplacement (transports, extérieur)', score: { etudiant: 1.0, casual: 0.7 } },
          { label: 'Bureau/travail (fiabilité critère)', score: { professionnel: 1.0 } },
          { label: 'À domicile pour jouer/créer', score: { gamer: 0.8, photographe: 0.8 } },
          { label: 'Partout en même temps', score: { professionnel: 0.9, gamer: 0.7 } }
        ]
      }
    ],

    /**
     * Calcule le profil basé sur les réponses du quiz
     */
    calculerProfil: function (responses) {
      var scores = { etudiant: 0, professionnel: 0, gamer: 0, photographe: 0, casual: 0 };
      var count = 0;

      responses.forEach(function (resp) {
        if (resp.score) {
          Object.keys(resp.score).forEach(function (profil) {
            scores[profil] += resp.score[profil];
          });
        }
        count++;
      });

      // Normaliser
      Object.keys(scores).forEach(function (p) {
        scores[p] = Math.round((scores[p] / count) * 100) / 100;
      });

      // Trouver le profil dominant
      var profils_sorted = Object.entries(scores).sort(function (a, b) { return b[1] - a[1]; });
      var profil_dominant = profils_sorted[0][0];

      return { profil_dominant, scores };
    }
  };

  window.QuizUsage = quizData;
})();
