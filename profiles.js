/**
 * PROFILS UTILISATEUR ET DONNÉES DE RÉFÉRENCE
 * Intègre les coefficients de pondération et les calculs de compatibilité
 */
window.GuideProfiles = {
    // Matrice de pondération pour chaque profil (sur 5)
    weights: {
      etudiant: {
        autonomie: 0.95,      // Besoin critique d'économies
        prix: 1.00,           // Budget restreint
        performance: 0.65,    // Moins critique
        taille: 0.60,         // Portabilité simple
        photo: 0.50           // Usage basique
      },
      professionnel: {
        autonomie: 0.85,
        prix: 0.60,
        performance: 0.90,    // Besoin de réactivité
        taille: 0.70,
        photo: 0.50
      },
      gamer: {
        autonomie: 0.80,      // Moins critique que les FPS
        prix: 0.55,
        performance: 1.00,    // Critique absolue : GPU, thermals
        taille: 0.75,
        photo: 0.30           // Très faible priorité
      },
      photographe: {
        autonomie: 0.75,
        prix: 0.65,
        performance: 0.90,    // ISP, NPU importants
        taille: 0.65,
        photo: 1.00           // Critique absolue
      },
      casual: {
        autonomie: 0.80,
        prix: 1.00,           // Sensible au prix
        performance: 0.40,    // Basique suffit
        taille: 0.70,
        photo: 0.65           // Photos simples
      }
    },

    // Données techniques de référence (par modèle)
    // Score sur 10 pour chaque critère technique
    catalogue: {
      'Samsung Galaxy A56': {
        reseau_sim: 8.5,
        puissance_ia_calcul: 6.8,
        refroidissement: 5.5,
        multitache: 7.0,
        stockage: 7.5,
        duree_vie: 8.2,
        photo: null,  // Sera calculé via moteur
        ecran: 7.8,
        prix: 300,
        ecosysteme: 'Android_Standard',
        age_ans: 0.2,
        specs: {
          mp: 50,
          d_diag: 1.56,
          ouverture: 1.8,
          has_hdr: true,
          ppp: 405,
          nits: 1500,
          type_techno: 'OLED',
          antireflet: 'Standard'
        }
      },
      'iPhone 16': {
        reseau_sim: 9.5,
        puissance_ia_calcul: 9.8,
        refroidissement: 8.0,
        multitache: 9.0,
        stockage: 9.2,
        duree_vie: 9.5,
        photo: null,
        ecran: 9.2,
        prix: 999,
        ecosysteme: 'iOS',
        age_ans: 0.1,
        specs: {
          mp: 48,
          d_diag: 1.3,
          ouverture: 1.6,
          has_hdr: true,
          ppp: 460,
          nits: 2000,
          type_techno: 'OLED',
          antireflet: 'Traité_AntiReflet'
        }
      },
      'OnePlus 13': {
        reseau_sim: 9.0,
        puissance_ia_calcul: 9.2,
        refroidissement: 8.8,
        multitache: 8.8,
        stockage: 8.9,
        duree_vie: 7.5,
        photo: null,
        ecran: 9.0,
        prix: 699,
        ecosysteme: 'Android_Standard',
        age_ans: 0.15,
        specs: {
          mp: 50,
          d_diag: 1.28,
          ouverture: 1.6,
          has_hdr: true,
          ppp: 490,
          nits: 1800,
          type_techno: 'OLED',
          antireflet: 'Traité_AntiReflet'
        }
      },
      'Google Pixel 9': {
        reseau_sim: 8.8,
        puissance_ia_calcul: 9.5,
        refroidissement: 7.2,
        multitache: 8.5,
        stockage: 8.7,
        duree_vie: 9.0,
        photo: null,
        ecran: 8.9,
        prix: 799,
        ecosysteme: 'Android_Standard',
        age_ans: 0.2,
        specs: {
          mp: 50,
          d_diag: 1.33,
          ouverture: 1.68,
          has_hdr: true,
          ppp: 486,
          nits: 3000,
          type_techno: 'OLED',
          antireflet: 'Traité_AntiReflet'
        }
      },
      'Xiaomi 15': {
        reseau_sim: 8.5,
        puissance_ia_calcul: 9.0,
        refroidissement: 8.2,
        multitache: 8.5,
        stockage: 8.3,
        duree_vie: 7.8,
        photo: null,
        ecran: 8.7,
        prix: 549,
        ecosysteme: 'Android_Standard',
        age_ans: 0.1,
        specs: {
          mp: 50,
          d_diag: 1.4,
          ouverture: 1.63,
          has_hdr: true,
          ppp: 460,
          nits: 1500,
          type_techno: 'OLED',
          antireflet: 'Standard'
        }
      }
    },

    /**
     * Calcule les scores photo et écran via le moteur,
     * puis retourne les notes complètes
     */
    getNotesCompletes: function (nomModele) {
      var moteur = new MoteurEvaluationSmartphone();
      var modele = this.catalogue[nomModele];
      if (!modele) return null;

      var notes = {
        reseau_sim: modele.reseau_sim,
        puissance_ia_calcul: modele.puissance_ia_calcul,
        refroidissement: modele.refroidissement,
        multitache: modele.multitache,
        stockage: modele.stockage,
        duree_vie: modele.duree_vie,
        ecran: modele.ecran,
        photo: null
      };

      // Calcul du score photo
      var s = modele.specs;
      var scorePhotoRaw = moteur.calculerScorePhoto(s.mp, s.d_diag, s.ouverture, s.has_hdr);
      notes.photo = scorePhotoRaw / 10.0; // Ramener sur 10

      // Calcul du score écran
      var scoreEcranRaw = moteur.calculerScoreEcran(s.ppp, s.nits, s.type_techno, s.antireflet);
      notes.ecran = scoreEcranRaw / 10.0; // Ramener sur 10

      return notes;
    },

    /**
     * Calcule la compatibilité d'un téléphone pour un profil donné
     */
    evaluerCompatibilite: function (nomModele, nomProfil, budgetMax, optionEtoile) {
      var moteur = new MoteurEvaluationSmartphone();
      var modele = this.catalogue[nomModele];
      if (!modele) return { score: 0, raison: 'Modèle inconnu' };

      // Récupérer les notes complètes (incluant photo et écran calculés)
      var notes = this.getNotesCompletes(nomModele);

      // Données client
      var client = {
        profil: nomProfil,
        budget_max: budgetMax,
        exige_google: ['Professionnel', 'Gamer'].includes(nomProfil)
      };

      // Évaluation
      try {
        var score = moteur.evaluerCompatibiliteUniverselle(
          notes,
          modele.prix,
          modele.ecosysteme,
          client,
          optionEtoile || false
        );
        return { score: score, raison: 'OK' };
      } catch (err) {
        return { score: 0, raison: err.message };
      }
    },

    /**
     * Recommande les 3 meilleurs modèles pour un profil
     */
    recommander: function (nomProfil, budgetMax, optionEtoile) {
      var results = [];
      var self = this;
      Object.keys(this.catalogue).forEach(function (modele) {
        var eval = self.evaluerCompatibilite(modele, nomProfil, budgetMax, optionEtoile);
        if (eval.score > 0) {
          results.push({ modele: modele, score: eval.score });
        }
      });
      return results.sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
    }
};
