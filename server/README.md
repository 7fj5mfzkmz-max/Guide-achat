# Résolveur — Serveur Node

Extrait les données produit depuis n'importe quel marchand.

## Environnement

- `PORT` : 8787 (défaut)
- `ALLOWED_ORIGIN` : CORS origin (défaut: * — à restreindre en prod)

## Endpoint

```
POST /api/resolve
Content-Type: application/json

{ "url": "https://..." }
```

Réponse (HTTP 200 ou 502) :

```json
{
  "ok": true,
  "kind": "product",
  "finalUrl": "...",
  "product": { "name": "...", "brand": "...", "price": "...", ... },
  "specs": { "ecran": "...", "batterie": "...", ... },
  "evidence": ["JSON-LD"],
  "clues": { "name": "...", "ean": "...", "asin": "...", ... }
}
```

Si blocage (HTTP 403, CAPTCHA, etc.) :

```json
{
  "ok": false,
  "blocked": true,
  "error": "Le site demande une vérification anti-robot.",
  "clues": { "titleHint": "...", "asin": "...", ... }
}
```

## Logique

Voir `server/resolve.js` pour le pipeline complet. Aucune logique de contournement intentionnelle.

Tests : `npm test`
