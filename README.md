# Guide d'achat — Smartphones

Front statique + une fonction serveur (`/api/resolve`) qui lit un lien produit et en tire le modèle.

## Méthodes de lecture (dans l'ordre, chacune tracée dans `trace`)

1. **URL** : ASIN, EAN, nom dans le chemin (Amazon, Fnac, Darty, Cdiscount, Rakuten…). Sans réseau.
2. **Lecture directe** : en-têtes de navigateur ordinaires, redirections et cookies de session suivis, URL canonique Amazon (`/dp/ASIN`) essayée d'abord.
3. **Analyse du code** : JSON-LD Product (y compris `@graph`), `#productTitle`, microdonnées, état embarqué (`__NEXT_DATA__`), `og:title`, `twitter:title`, `h1`, `<title>`. Les titres génériques (« Amazon.fr », « Robot Check »…) sont rejetés.
3b. **Pivot par identifiant** (nouveau, `server/icecat.js`) : si l'URL ou la page contient un code-barres (GTIN/EAN, validé par sa clé de contrôle) ou une marque + référence constructeur, la fiche du **référentiel produit Icecat** est demandée (en parallèle de la lecture directe quand le code est dans l'URL). Elle confirme le modèle et fournit des caractéristiques sans dépendre de la page du marchand. Une valeur n'est reprise que si elle porte son unité ; si la fiche désigne un autre modèle que la page, elle est écartée (`conflit`).
4. **Rendu navigateur** (facultatif, `RENDER_ENDPOINT`) : uniquement pour les pages vides sans JavaScript.
5. **Recherche web** (facultatif, `BRAVE_API_KEY` ou `SERPER_API_KEY`) : l'ASIN, l'EAN ou le nom de l'URL sont cherchés ; les titres des résultats servent d'indices.
6. **Capture dans votre navigateur** (`capture.html`) : un signet lit la page ouverte dans Safari, telle que vous la voyez, et ouvre le guide avec le résultat. Fonctionne même quand un site bloque les robots.
7. **Saisie manuelle** du modèle.

Une page de vérification anti-robot (CAPTCHA, Cloudflare, DataDome…) **arrête la cascade** : le serveur ne tente aucun contournement (pas de résolution de CAPTCHA, de proxy tournant ni de falsification d'empreinte). L'utilisateur est orienté vers la capture navigateur.

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Rôle |
|---|---|
| `RENDER_ENDPOINT`, `RENDER_TOKEN`, `RENDER_TIMEOUT` | Service de rendu que vous exploitez : `POST {url}` → `{html}` |
| `BRAVE_API_KEY` ou `SERPER_API_KEY` | Recherche web (étape 5) |
| `ICECAT_USERNAME` (+ `ICECAT_API_TOKEN`, `ICECAT_CONTENT_TOKEN`, `ICECAT_LANG`) | Référentiel produit Icecat (compte Open Icecat gratuit) : active le pivot par identifiant |
| `ALLOWED_ORIGIN` | Origine CORS autorisée (défaut `*`) |

Aucune n'est obligatoire : sans elles, les étapes 1 à 3, 6 et 7 fonctionnent.

## Réponse de `/api/resolve`

`ok`, `kind` (`product` / `page`), `strategy` (`fetch` / `render` / `reader` / `icecat` / `search`), `identity` (`status` : `identified` / `partial` / `unknown`, indépendant du catalogue), `specs` + `specSources` (`page` / `icecat`) + `specsUnknown` (caractéristiques non trouvées : « inconnues », jamais « mauvaises »), `clues` (nom, marque, EAN, ASIN, indices), `trace` (étapes tentées), et en cas d'échec `blocked` / `jsOnly` / `reason` / `needsCapture`.

## Diagnostic

`diagnostic.html` : collez jusqu'à 20 liens ; chaque ligne indique lu / non lu, la méthode utilisée, le modèle identifié et le détail des étapes.

## Structure

- `phone-analyzer/` : identification, `identity.js` (comparaison stricte de modèles, GTIN), croisement catalogue, scoring, interface, capture
- `server/` : `resolve.js` (cascade), `extract.js` (extraction + détection de blocage), `net.js` (réseau sécurisé), `icecat.js` (référentiel produit), `search.js`, `render.js`
- `api/resolve.js` : point d'entrée Vercel · `server/index.js` : serveur local (`npm start`)
- `tests/` : `npm test` (50 tests, pages et référentiel simulés ; la forme exacte des réponses Icecat reste à valider par un premier appel réel)
