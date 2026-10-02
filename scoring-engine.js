/**
 * MOTEUR D'ÉVALUATION SMARTPHONE - Implémentation JavaScript
 * Système universel de notation et de compatibilité contextuelle
 */
class MoteurEvaluationSmartphone {
  constructor() {
    this.matriceProfils = {
      'Etudiant': {
        reseau_sim: 3, puissance_ia_calcul: 3, refroidissement: 1,
        multitache: 4, stockage: 3, duree_vie: 5, photo: 2, ecran: 3
      },
      'Professionnel': {
        reseau_sim: 5, puissance_ia_calcul: 3, refroidissement: 4,
        multitache: 5, stockage: 4, duree_vie: 5, photo: 2, ecran: 3
      },
      'Gamer': {
        reseau_sim: 5, puissance_ia_calcul: 5, refroidissement: 5,
        multitache: 4, stockage: 4, duree_vie: 4, photo: 1, ecran: 5
      },
      'Photographe / Créateur': {
        reseau_sim: 3, puissance_ia_calcul: 5, refroidissement: 4,
        multitache: 5, stockage: 5, duree_vie: 4, photo: 5, ecran: 4
      },
      'Casual': {
        reseau_sim: 4, puissance_ia_calcul: 1, refroidissement: 1,
        multitache: 2, stockage: 2, duree_vie: 5, photo: 3, ecran: 3
      }
    };
  }

  /**
   * Calcule le score photo sur 100 points
   * @param {number} mp - Mégapixels
   * @param {number} d_diag - Dénominateur de la diagonale du capteur
   * @param {number} ouverture - Ouverture f/n
   * @param {boolean} has_hdr - Présence de HDR multi-exposition
   */
  calculerScorePhoto(mp, d_diag, ouverture, has_hdr) {
    const score_mp = mp > 0.1 
      ? Math.min(25.0, 5.0 + (5.0 * Math.log2(mp))) 
      : 1.0;
    
    const score_capteur = Math.max(0.0, Math.min(30.0, 30.0 - (5.0 * (d_diag - 1.0))));
    
    const score_optique = Math.max(0.0, Math.min(25.0, 25.0 * ((1.4 / ouverture) ** 2)));
    
    const score_ia = has_hdr ? 20.0 : 0.0;
    
    return Math.round((score_mp + score_capteur + score_optique + score_ia) * 10) / 10;
  }

  /**
   * Calcule le score écran sur 100 points
   * @param {number} ppp - Pixels par pouce
   * @param {number} nits - Luminance maximale
   * @param {string} type_techno - 'OLED' | 'LCD_IPS' | 'LCD_TFT'
   * @param {string} antireflet - 'Traité_AntiReflet' | 'Standard' | 'Brut'
   */
  calculerScoreEcran(ppp, nits, type_techno, antireflet) {
    const score_densite = Math.min(35.0, (ppp / 450.0) * 35.0);
    
    const score_luminosite = nits > 0 
      ? Math.min(35.0, 7.77 * Math.log(nits)) 
      : 0.0;
    
    const dict_techno = { 'OLED': 20.0, 'LCD_IPS': 12.0, 'LCD_TFT': 2.0 };
    const score_contraste = dict_techno[type_techno] || 2.0;
    
    const dict_ref = { 'Traité_AntiReflet': 10.0, 'Standard': 5.0, 'Brut': 0.0 };
    const score_optique = dict_ref[antireflet] || 0.0;
    
    const total = score_densite + score_luminosite + score_contraste + score_optique;
    return Math.round(Math.max(0.0, Math.min(100.0, total)) * 10) / 10;
  }

  /**
   * Évalue la compatibilité universelle entre un téléphone et un profil
   * @param {Object} notesSmartphone - Critères notés sur 10
   * @param {number} prixTelephone - Prix en euros
   * @param {string} ecosysteme - 'iOS' | 'Android_Standard' | 'HarmonyOS_NEXT'
   * @param {Object} client - {profil, budget_max, exige_google}
   * @param {boolean} optionEtoile - Option d'amortissement durable
   */
  evaluerCompatibiliteUniverselle(notesSmartphone, prixTelephone, ecosysteme, client, optionEtoile = false) {
    const nomProfil = client.profil;
    const budgetMax = client.budget_max;
    const exigeGoogle = client.exige_google || false;

    if (!(nomProfil in this.matriceProfils)) {
      throw new Error(`Profil client '${nomProfil}' inconnu.`);
    }

    const coeffs = this.matriceProfils[nomProfil];

    // 1. SCORE MATÉRIEL PONDÉRÉ
    let sommeNotes = 0.0;
    let sommeCoeffs = 0.0;
    for (const [critere, coeff] of Object.entries(coeffs)) {
      const note = notesSmartphone[critere] || 5.0;
      sommeNotes += note * coeff;
      sommeCoeffs += coeff;
    }

    const scoreMatériel = (sommeNotes / sommeCoeffs) * 10.0;

    // 2. MODULATEUR LOGICIEL
    let modulateurLogiciel = 1.0;
    if (exigeGoogle && ecosysteme === 'HarmonyOS_NEXT') {
      modulateurLogiciel = ['Professionnel', 'Gamer'].includes(nomProfil) ? 0.4 : 0.6;
    }

    // 3. MODULATEUR BUDGÉTAIRE
    let modulateurBudget = 1.0;
    const noteDurabilite = notesSmartphone.duree_vie || 5.0;

    if (prixTelephone > budgetMax) {
      if (['Etudiant', 'Casual'].includes(nomProfil)) {
        if (optionEtoile && noteDurabilite >= 8.0) {
          const ratioBase = budgetMax / prixTelephone;
          const bonusLongevite = 1.0 + ((noteDurabilite - 8.0) / 10.0);
          modulateurBudget = ratioBase * bonusLongevite;
        } else {
          modulateurBudget = 0.0; // Élimination stricte
        }
      } else {
        const depassement = (prixTelephone - budgetMax) / budgetMax;
        modulateurBudget = Math.max(0.1, 1.0 - depassement);
      }
    }

    // 4. CALCUL DU SCORE FINAL
    const scoreFinal = scoreMatériel * modulateurLogiciel * modulateurBudget;
    return Math.round(Math.max(0.0, Math.min(100.0, scoreFinal)) * 10) / 10;
  }

  /**
   * Calcule l'énergie brute en Wh
   */
  calculerEnergieWh(capaciteMah, tensionNominaleV) {
    return Math.round((capaciteMah / 1000) * tensionNominaleV * 100) / 100;
  }

  /**
   * Évalue la dégradation temporelle
   */
  calculerPenaliteAge(ageAnnees, ecosysteme, memorieType) {
    let taux = 4.0; // Android moderne par défaut
    if (ecosysteme === 'iOS') taux = 3.0;
    if (memorieType === 'eMMC') taux = 7.0;
    return ageAnnees * taux;
  }
}

// Export pour utilisation dans d'autres scripts
window.MoteurEvaluationSmartphone = MoteurEvaluationSmartphone;
