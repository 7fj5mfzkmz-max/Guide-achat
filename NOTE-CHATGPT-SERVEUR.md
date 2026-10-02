# Guide-achat — note pour ChatGPT : configurer le serveur du résolveur

Date : 29 septembre 2026 · Code : v33 · Rédigé par Claude pour Damir.
Lire aussi `NOTE-HANDOFF.md` (historique complet, exigences de Damir, incompréhensions passées).

## 0. Avancées en bref (ce qui est fait côté site)

- **Parcours A (page Smartphones)** : le champ pour coller un lien est dans la carte « Vous avez déjà un modèle en tête ». Un seul écran visible à la fois (chargement, message, question de confirmation ou analyse). Aucun lien externe ni pop-up dans ce parcours.
- **Identification** : le serveur classe le lien (page générale ou modèle précis). Page générale → « Ceci n'est pas un modèle mais une page … ». Modèle incertain → « Est-ce qu'il s'agit de … ? » (Oui / Non, puis saisie manuelle).
- **Score** : toujours attribué après validation, estimé à partir des données disponibles ; « Score impossible pour le moment » seulement si aucune donnée n'existe (accepté par Damir). Les barèmes sont des hypothèses ; la technologie de batterie est détectée mais sans effet chiffré tant que Damir n'a pas fourni de sources fiables.
- **Catalogue** : 27 fiches sur 43 sont vides (à documenter). Elles reçoivent un score provisoire ou aucun.
- **Accueil** : refonte en cours (animations et proportions des illustrations). Statique : aucun lien avec le serveur.
- **Jamais testé sur un vrai site marchand** : l'environnement de Claude n'a pas d'accès réseau. C'est la première chose à faire après le déploiement.

## 1. Pourquoi un serveur

Le site est statique (GitHub Pages). Sur la page Smartphones, le parcours A demande à l'utilisateur de coller l'URL d'une fiche produit. Le navigateur ne peut pas lire une page marchande (blocage CORS) : un petit serveur doit la télécharger, dire si c'est **un modèle précis** ou **une page générale**, et renvoyer des indices d'identification. Sans serveur, le site se replie sur l'analyse de l'URL seule (ASIN, EAN, mots du lien) : ça marche pour reconnaître une page générale ou un modèle visible dans le lien, mais pas pour lire le contenu.

## 2. Ce qui existe déjà (ne pas réécrire)

| Fichier | Rôle |
|---|---|
| `server/resolve.js` | Cœur : validation d'URL, protection SSRF, téléchargement (15 s, 2 Mo max, 5 redirections max), classement page/modèle, extraction JSON-LD et métadonnées. |
| `api/resolve.js` | Fonction serverless (format Vercel). |
| `server/index.js` | Serveur Node autonome : `POST /api/resolve`, `GET /api/health`, port `PORT` (8787 par défaut). |
| `vercel.json` | `maxDuration` 30 s pour la fonction. |
| `phone-analyzer/fetcher.js` | Appel côté navigateur. Lit `window.GUIDE_API_BASE`. |
| `tests/phone-analyzer.test.js` | 18 tests (`npm test`). |

Node ≥ 20 requis (`fetch` natif). Aucune dépendance npm.

## 3. Contrat d'API (à ne pas casser sans prévenir Damir)

Requête : `POST /api/resolve` avec `{"url":"https://..."}`.

Réponse (JSON) :
```json
{
  "ok": true,
  "kind": "product | page | unknown",
  "pageLabel": "une page de résultats de recherche | null",
  "finalUrl": "…",
  "merchantHost": "www.amazon.fr",
  "clues": { "title": null, "name": null, "brand": null, "ean": null, "mpn": null, "asin": null, "urlHint": "…", "year": null },
  "product": { "name": "…", "price": "299.00", "currency": "EUR" },
  "specs": { "batterie": "5000 mAh", "ram": "8 Go RAM", "refresh": "120 Hz" },
  "evidence": ["JSON-LD"],
  "warning": null
}
```
- `kind: "page"` : accueil, recherche, catégorie… `product` et `specs` absents ; le front affiche « Ceci n'est pas un modèle mais {pageLabel} ».
- Codes HTTP : 200 (`ok: true`), 502 (`ok: false`, page illisible ou bloquée), 400 (URL manquante), 405, 500.
- **Important** : sur 502, la réponse contient quand même `clues` (tirés de l'URL seule) et `kind`. Le front les utilise pour chercher le modèle dans le catalogue. Ne pas remplacer ces réponses par une erreur sèche.

## 4. Ce qu'il reste à faire (checklist)

1. **Choisir l'hébergeur** (à décider avec Damir). Vercel fonctionne tel quel (runtime Node). Cloudflare Workers ne convient pas sans adaptation : `server/resolve.js` utilise `node:dns` et `node:net`.
2. **Déployer** et noter l'URL de base, par exemple `https://guide-achat-api.vercel.app`.
3. **Créer `config.js`** à la racine du site avec `window.GUIDE_API_BASE = "https://…";` et le charger dans `smartphones.html` **avant** `phone-analyzer/fetcher.js` (ligne 281). Aujourd'hui `GUIDE_API_BASE` n'est défini nulle part.
4. **Restreindre CORS** : `api/resolve.js` et `server/index.js` renvoient `Access-Control-Allow-Origin: *`. Lire une variable d'environnement `ALLOWED_ORIGIN` (le domaine GitHub Pages de Damir).
5. **Limiter le débit** (par IP) pour éviter qu'on utilise le serveur comme proxy ouvert. Exemple : 20 requêtes par minute.
6. **Tester avec de vraies URL** (voir §6).
7. **Journaliser** l'hôte demandé, le code obtenu et la durée, sans stocker l'URL complète (elle peut contenir des identifiants de suivi).

## 5. Limites connues et interdits

- **Amazon** répond souvent 403/503 aux requêtes serveur. C'est attendu : le serveur renvoie alors 502 avec des indices, et le site propose « Est-ce qu'il s'agit de … ? ».
- **Pages rendues en JavaScript** : aucune caractéristique lisible. Une couche navigateur (Playwright) côté serveur serait une amélioration possible, à discuter avec Damir avant de l'ajouter.
- **Ne pas** contourner les protections anti-bot (proxies résidentiels, fausses signatures de navigateur, API privées des marchands). C'est un choix volontaire de la conception (voir `SERVER.md`).
- **Ne pas** retirer ni assouplir la protection SSRF (`isPrivateIp`, `assertPublicHost`, redirections validées une par une). Limite connue : l'adresse est vérifiée puis `fetch` la résout à nouveau ; un renforcement contre le DNS rebinding (résoudre une fois et se connecter à l'IP vérifiée) est souhaitable avant une mise en production ouverte.
- **Lecture des caractéristiques** (`candidateFromText`) : recherche par expressions régulières dans tout le texte de la page ; les valeurs peuvent venir d'un produit recommandé. Ne pas s'y fier seule ; l'utilisateur confirme le modèle. Piste d'amélioration : lire d'abord le tableau des caractéristiques et le JSON-LD du produit, et ignorer les blocs « produits similaires ». Cela demande de vraies pages enregistrées pour les tests.

## 6. Tests après déploiement

```bash
# santé (serveur autonome uniquement)
curl https://VOTRE-API/api/health

# page générale évidente : ne télécharge rien, doit répondre kind=page
curl -s -X POST https://VOTRE-API/api/resolve -H 'content-type: application/json' \
  -d '{"url":"https://www.amazon.fr/s?k=iphone"}'

# adresse interne : doit être refusée (ok:false)
curl -s -X POST https://VOTRE-API/api/resolve -H 'content-type: application/json' \
  -d '{"url":"http://169.254.169.254/latest/meta-data"}'

# fiche fournie par Damir (Amazon) : kind=product ou 502 avec clues.asin = B0HJBG9HKM
curl -s -X POST https://VOTRE-API/api/resolve -H 'content-type: application/json' \
  -d '{"url":"https://www.amazon.fr/Apple-iPhone-Pro-256-Bourgogne/dp/B0HJBG9HKM"}'
```
Puis, dans le navigateur, coller ces liens dans la carte A de `smartphones.html` : un seul écran à la fois doit s'afficher (chargement → message, question de confirmation ou analyse), sans lien externe ni pop-up.

## 7. Questions ouvertes pour Damir

- Quel hébergeur et quel budget ? Quel domaine autorisé pour CORS ?
- Accepte-t-il d'ajouter plus tard une lecture par navigateur côté serveur pour les pages rendues en JavaScript ?
- Peut-il enregistrer 2 à 3 fiches produit HTML complètes par marchand (Amazon, Cdiscount, Fnac, Darty, Rakuten) pour fiabiliser la lecture ?

## 8. Ce que Claude n'a pas pu vérifier

Claude n'a pas d'accès réseau : le serveur n'a **jamais** été appelé sur un vrai site marchand. Tous les tests sont unitaires ou simulés. Les motifs d'URL par marchand (Cdiscount, Fnac, Rakuten) sont des heuristiques non validées.
