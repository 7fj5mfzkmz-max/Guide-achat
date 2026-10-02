# Guide-achat — note de passation (Claude → ChatGPT)

Date : 29 septembre 2026 · Version du code : v33 (base : v27 fournie par Damir)
Objet : permettre de comparer ce qui a été demandé, ce qui a été fait, et ce qui a été mal compris.

## 1. Ce que Damir a demandé (parcours A, page smartphones)

Sur la page smartphones, l'utilisateur choisit entre deux options :
- **B** « Vous ne savez pas encore quoi choisir » ;
- **A** « Vous avez déjà un modèle en tête ».

Pour **A** :
1. La carte A contient elle-même un espace pour coller une URL (les deux sont attachés, pas séparés).
2. Le système détermine si l'URL est une **page générale** (accueil, catégorie, plusieurs produits) ou la **page d'un modèle précis**.
3. Page générale → afficher : « Ceci n'est pas un modèle mais une page (…) ».
4. Page de modèle précis → récupérer les informations du modèle.
5. Modèle introuvable même avec un bon lien → recherche à partir des indices pertinents, puis demander « Est-ce qu'il s'agit de (marque, modèle, année) ? ». Si oui → analyse.
6. Aucun lien externe, aucun pop-up.
7. L'utilisateur ne voit qu'un seul processus à la fois (chargement ou autre) et ne doit pas être dérangé.
8. Demande ultérieure : conserver la section « Sources utiles » en bas de page.
9. Demande ultérieure : **après validation du modèle, on attribue toujours un score** (y compris pour un modèle absent du catalogue ou à fiche incomplète). Exception acceptée par Damir : « Score impossible pour le moment » si aucune donnée n'existe.
10. Les barèmes de score doivent reposer sur des **données prouvées**, notamment la technologie de batterie (ex. silicium-carbone vs Li-ion / Li-po à mAh égal). Damir fournira des sites et vidéos fiables au fur et à mesure.
11. Lecture de page : isoler **uniquement le modèle recherché** (sans confondre avec les produits recommandés). Damir ne sait pas encore comment fiabiliser cela.
12. **Refonte de l'accueil** : animations jugées insuffisantes ; s'inspirer de https://www.firsty.app/fr (mise en page et animations).

## 2. Ce qui a été mal compris (chronologie)

| Étape | Ce qui s'est passé | Écart |
|---|---|---|
| v27 (reçue) | Carte A = simple bouton qui fait défiler vers une section séparée contenant le champ URL. Serveur : extrait JSON-LD/méta, ne distingue pas page générale / modèle. | Champ hors de la carte ; pas de message « ceci n'est pas un modèle » ; pas de confirmation. |
| v28 (Claude, à tort) | Claude n'avait pas le cahier des charges dans la conversation. Il a corrigé la sécurité du serveur et ajouté un croisement catalogue affiché comme une ligne d'information. | Hors sujet par rapport à la demande : rien de visible pour l'utilisateur ne répondait aux points 1 à 7. Le résumé était technique. |
| Recadrage | Damir a rappelé la demande. | v28 abandonnée comme base fonctionnelle. |
| v29 → v30 (Claude) | Réimplémentation du parcours (voir §3). | Voir §5 pour ce qui reste non vérifié. |
| v33 (Claude) | Animations et proportions de l'accueil reprises ; correction de 3 liens du lexique (`#performance`, `#photo-video`, `#connexion` ne correspondaient à aucune section). | Voir §10. |
| v32 (Claude) | Refonte de l'accueil (règle 12) ; détection de la technologie de batterie sans effet chiffré tant qu'aucune source n'est documentée (règle 10). | Voir §5 et §9. |
| v31 (Claude) | Ajout de la règle 9 : score toujours attribué. Un modèle hors catalogue est d'abord confirmé (« Est-ce qu'il s'agit de … ? ») puis scoré à partir de la page. | Découverte : 27 fiches du catalogue sur 43 sont vides (voir §5). |

Leçon : partir de la description du parcours utilisateur, pas du code existant.

## 3. État actuel du code

Fichiers clés :
- `smartphones.html` : carte A contient le formulaire (`#phone-analyzer-form`) et la zone de résultat (`#phone-analyzer-result`). L'ancienne section séparée est supprimée.
- `phone-analyzer/ui.js` : machine à états à écran unique (chargement → page générale | confirmation | saisie manuelle | analyse). Le formulaire est masqué dès qu'une étape s'affiche.
- `phone-analyzer/identify.js` : `identifyFromUrl` (ASIN, EAN, indice de titre) et `classifyUrl` (accueil / recherche / catégorie / produit / inconnu, avec un drapeau `strong`).
- `phone-analyzer/spec-score.js` : estime un score par profil à partir des seules caractéristiques disponibles (batterie, RAM, fréquence d'écran, prix). Un critère non documenté est ignoré. Score plafonné à 9 ; **provisoire et plafonné à 6 si moins de la moitié des critères du profil sont documentés**.
- `home.css`, `home.js`, `index.html` : nouvel accueil (préfixe `hx-`). `home-motion.js` et GSAP ne sont plus chargés sur l'accueil ; `home-motion.js` reste dans l'archive, non référencé.
- `phone-analyzer/crosscheck.js` : `search()` classe les candidats du catalogue à partir d'indices, en comparant des mots entiers. Statuts : `identified` (analyse directe), `to_confirm` (question à l'utilisateur), `unknown` (saisie manuelle).
- `server/resolve.js` : classe le contenu de la page (`classifyContent`), renvoie `kind` (`product` | `page` | `unknown`), `pageLabel` et `clues`. Il ne télécharge pas les pages générales évidentes. Il refuse les adresses internes (protection SSRF).
- `phone-analyzer/fetcher.js` : accepte une réponse d'erreur du serveur si elle contient des indices ; expiration à 25 s.
- `sources/catalogue.js` : lit `smartphones.json` (43 modèles).

Comportement par cas :
- **Page générale** → « Ceci n'est pas un modèle mais une page de résultats de recherche. » (ou d'accueil, de catégorie…).
- **Fiche de modèle reconnue sans ambiguïté** → analyse directe.
- **Modèle incertain** → « Est-ce qu'il s'agit de … ? » Oui / Non. Non → candidat suivant → saisie manuelle du modèle.
- **Modèle absent du catalogue mais lu sur la page** → question « Est-ce qu'il s'agit de (nom lu sur la page) ? » ; après « Oui », score estimé par `spec-score.js`.
- **Fiche du catalogue vide ou incomplète** → score estimé à partir de la page et du prix indicatif s'ils existent.
- **Aucune donnée exploitable nulle part** → message « Score impossible pour le moment » (seule exception à la règle 9, voir §5).
- **Serveur injoignable ou page bloquée** → repli sur l'analyse de l'URL seule.

## 4. Comparaison exigence / implémentation

| Exigence | Statut |
|---|---|
| Champ URL dans la carte A | Fait |
| Distinguer page générale / modèle précis | Fait (URL + contenu), heuristiques à valider sur de vrais liens |
| Message « ceci n'est pas un modèle mais une page (…) » | Fait |
| Récupérer les infos d'un modèle précis | Fait côté serveur (JSON-LD/méta), non testé sur de vraies pages |
| Recherche par indices + confirmation « marque modèle année ? » | Fait ; l'année n'apparaît que si elle est connue |
| Analyse après validation | Fait (catalogue : caractéristiques, scores par profil sur 9, points forts/faibles) |
| Score toujours attribué après validation | Fait tant qu'au moins un critère est documenté ; exception : aucune donnée du tout |
| Aucun lien externe / pop-up dans le parcours | Fait ; « Sources utiles » en bas de page conservée avec ses liens |
| Un seul écran visible | Fait |

## 5. Limites et points non vérifiés

- **Aucun test réseau réel.** L'environnement de Claude n'a pas d'accès sortant : le serveur n'a jamais été appelé sur Amazon, Cdiscount, Fnac, etc. Amazon bloque probablement les requêtes serveur simples ; dans ce cas le repli par l'URL seule s'applique.
- **Motifs d'URL par marchand** (Cdiscount `/f-…` et `/l-…`, Fnac `/a…`, Rakuten `/mfp/`) : heuristiques non validées.
- **`window.GUIDE_API_BASE`** n'est défini nulle part : sans serveur déployé, seul le repli par l'URL fonctionne.
- **Catalogue incomplet (important)** : 27 fiches sur 43 sont des coquilles (`ready_for_recommendation: false`, caractéristiques vides ou « À documenter », `scores` vides, souvent sans prix). Seules 15 fiches ont des `scores` et 4 des `profil_scores`. Pour les autres, le score est estimé (voir `spec-score.js`) et reste souvent provisoire. Compléter le catalogue est la vraie solution.
- **Lecture de la page par expressions régulières** : `candidateFromText` cherche « 120 Hz », « 5000 mAh »… dans le texte de toute la page ; sur une page marchande, ces nombres peuvent venir d'un produit recommandé et non du modèle. À fiabiliser (lire d'abord le tableau des caractéristiques ou le JSON-LD).
- **Catalogue** : 12 modèles sur 43 ont `annee_sortie` ; `profil_scores` n'existe que pour certains (sinon le score est calculé à partir de `scores` et des poids de `profiles.js`, plafonné à 9).
- **CORS** : `api/resolve.js` renvoie `*` ; à restreindre en production.
- Kimovil et source constructeur : volontairement désactivés (conditions d'utilisation à vérifier).
- Interface testée uniquement avec un faux DOM (pas de navigateur).

## 6. Cas de test fourni par Damir

Lien : Amazon.fr, `/Apple-iPhone-Pro-256-Bourgogne/dp/B0HJBG9HKM?…` (avec paramètres de suivi).
- Classé comme **modèle** (`/dp/`).
- Un bug a été trouvé et corrigé : l'ASIN n'était pas détecté quand l'URL portait des paramètres (il n'y avait pas eu de test avec paramètres).
- Le titre dans le lien est tronqué (« iPhone Pro », sans numéro de génération). Sans lire la page, le catalogue renvoie deux candidats (Apple iPhone 17 Pro, iPhone 18 Pro) → le site pose la question de confirmation plutôt que de choisir seul.
- Le vrai titre de la page n'a pas pu être lu depuis l'environnement de Claude.

## 7. Décisions prises par hypothèse

- Après « Non » sans autre candidat : proposer la saisie manuelle du modèle. **Validé par Damir.**
- Modèle hors catalogue : confirmation avec le nom lu sur la page, puis score estimé. **Règle « score toujours attribué » validée par Damir** ; les choix ci-dessous sont mes hypothèses :
  - barèmes : autonomie selon les mAh (+1 si charge ≥ 65 W), performance selon la RAM, jeu selon la fréquence d'écran et la RAM, prix ≤ 350 € = 9 puis dégressif ;
  - score provisoire (marqué *) et plafonné à 6/9 si moins de 50 % des critères du profil sont documentés ;
  - « Score impossible » quand rien n'est documenté, plutôt qu'un score inventé.
- Ne jamais inventer une caractéristique ; une donnée absente n'est pas négative ; score de compatibilité plafonné à 9/10.

## 8. Pour ChatGPT

Avant de modifier : relire §1, restituer en une phrase chacun des 7 points, puis signaler tout écart avec le code. Ne pas réintroduire d'ouverture de lien externe ni de section séparée dans le parcours A. Prochaines étapes utiles : déployer l'endpoint, tester avec de vrais liens, valider les motifs d'URL, compléter les années et les scores du catalogue.

## 9. Accueil (v32) et suite sur le score

**Accueil.** Structure reprise de firsty.app/fr : hero avec composition à droite, bandeaux défilants, cartes de catégories, sélecteur de profil interactif (poids lus dans `profiles.js`), trois sections alternées, FAQ animée, bandeau final. Animations : titre mot par mot, apparition au défilement avec décalage, lueur qui suit le pointeur sur les cartes, barres qui se remplissent, éléments qui s'illuminent à tour de rôle, accordéon. Tout est désactivé proprement avec `prefers-reduced-motion` et le contenu reste lisible sans JavaScript. Testé avec un navigateur automatisé (bureau et mobile) : aucune erreur, aucun débordement horizontal.
- **Limite importante** : la page Firsty n'a été lue qu'en texte. Ses animations réelles n'ont pas été observées ; les animations ci-dessus sont des motifs courants adaptés à la structure, pas une copie. Damir doit dire lesquelles de Firsty il veut retrouver exactement (vidéo ou description).
- Aucun faux témoignage : la section « avis » de Firsty a été remplacée par des bandeaux de critères et une FAQ factuelle.
- Polices Google non chargeables dans l'environnement de test : rendu vérifié avec la police de repli.

**Technologie de batterie.** `spec-score.js` détecte silicium-carbone / Li-po / Li-ion, mais `autonomieBonus` vaut 0 et `status` = `a_documenter` tant qu'aucune source n'est fournie. L'interface indique la technologie détectée. Pour activer une règle : renseigner le bonus, passer `status` à `documente`, lister les sources dans `RULES.chimie`.

**Isoler uniquement le modèle recherché (piste, non implémentée).** Principe : partir de l'identifiant (ASIN, EAN, référence) puis lire la source structurée du produit (JSON-LD, tableau de caractéristiques de la fiche) au lieu de chercher des nombres dans tout le texte ; ignorer les zones « produits similaires / sponsorisés / avis » ; vérifier qu'une valeur trouvée appartient bien au bloc du produit ; confirmer avec l'utilisateur (déjà en place). Pour construire et tester cela il faut de **vraies pages enregistrées** (2 à 3 fiches par marchand) : l'environnement de Claude n'a pas d'accès réseau.

## 10. Retouche de l'accueil (v33) et composition de la page Smartphones

**Accueil v33.** Carte Smartphones avec illustration, cinq cartes « bientôt » sur une ligne, panneaux d'illustration à hauteur homogène, mise en avant nette de l'élément actif dans les blocs qui s'illuminent à tour de rôle, entrée du hero (téléphone qui se pose, pastilles une à une), chiffres qui montent (score du téléphone, pourcentages du sélecteur), léger décalage au défilement sur bureau. Vérifié dans un navigateur automatisé (bureau, mobile, animations réduites) : aucune erreur, aucun débordement. Exemple Galaxy A56 de l'accueil recoupé avec `smartphones.json` (8, 8, 7, 6).

**Ordre actuel de `smartphones.html`** (constaté, non modifié) : introduction (Android/iOS, budget) → deux chemins (A : coller un lien ; B : usage) → « Le jour de l'achat » (4 étapes) → « Voici la partie que vous chercherez » (contient un texte provisoire annonçant des captures d'écran à venir) → choix du profil → 4 profils → « Vous avez un modèle en tête ? Vérifiez en 45 secondes » → « 200 Mpx, 5 000 mAh, 12 Go » → checklist → sources.
Incohérences relevées : (1) l'analyse (A) arrive avant toute explication ; (2) les définitions des chiffres (« pièges ») arrivent après les profils qui les utilisent ; (3) « modèle en tête » apparaît deux fois, et le bouton du chemin B pointe vers la section « Vous avez un modèle en tête » ; (4) texte provisoire visible ; (5) liens Idealo dans le corps du texte alors que le parcours doit rester sans lien externe.
**Réorganisation proposée, en attente de validation par Damir** : voir la réponse de Claude du 29 septembre 2026.
