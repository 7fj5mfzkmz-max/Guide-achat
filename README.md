# Guide d'Achat — Smartphones

Outil de recherche, d'identification et d'analyse comparative de smartphones.

## Structure

- **Front statique** : `index.html`, `smartphones.html`, `comparateur.html`, `lexique.html`
- **Analyseur de produit** : `phone-analyzer/` (identification, scoring, croisement)
- **Serveur Node** : `server/resolve.js` (extraction multi-marchands)
- **Déploiement Vercel** : `api/resolve.js` (fonction serverless)
- **Données** : `smartphones.json`, `categories.js`, `profiles.js`
- **Tests** : `tests/*.test.js`

## Installation locale

```bash
npm install
npm start
```

Le serveur Node écoute sur `http://localhost:8787`.

Pour tester l'API :
```bash
curl -X POST http://localhost:8787/api/resolve \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.amazon.fr/Apple-iPhone-15/dp/B0CHX1W1XY"}'
```

## Déploiement Vercel

Lié automatiquement. Chaque `git push` déclenche un déploiement.

L'endpoint `/api/resolve` sert les requêtes `POST` du front.

## Tests

```bash
npm test
```

27 tests passent (multi-marchands, blocage, JavaScript-only).

## Architecture résolveur

1. **Validation** : URL + host public
2. **Récupération** : fetch HTTP avec timeout, suivi des redirections
3. **Détection de blocage** : titres « Robot Check », marqueurs anti-bot
4. **Extraction** : JSON-LD Product (avec @graph), meta tags og:/twitter:, fallback sur <title>
5. **Classification** : produit unique ou page catalogue/recherche
6. **Identification** : croisement titre/EAN/ASIN avec le catalogue
7. **Réponse honnête** : jamais d'invention, source documentée

## Marchands supportés

Amazon, Cdiscount, Fnac, Darty, Rakuten, sites constructeurs.

Tous utilisent le même moteur. Les pages bloquées remontent l'erreur sans tentative de contournement.

## Limites intentionnelles

- Pas de rendu navigateur par défaut (surcoût de latence)
- Pas de contournement WAF/CAPTCHA
- Pas d'API privée marchand
- Une page JavaScript-only sans rendu = indice d'URL seul

Si une page est inaccessible, l'utilisateur saisit manuellement le nom du modèle.
