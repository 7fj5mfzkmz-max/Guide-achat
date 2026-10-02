# Résolveur produit — Guide d'achat

GitHub Pages ne peut pas exécuter `server/index.js`. Le parcours A appelle donc `/api/resolve` sur un serveur Node séparé ou sur une plateforme serverless.

## Exécution locale

```bash
npm install
npm start
```

Le endpoint est `POST http://localhost:8787/api/resolve` avec :

```json
{"url":"https://..."}
```

## Fonctionnement

1. Le serveur valide l'URL.
2. Il récupère la page avec une requête HTTP normale.
3. Il cherche en priorité un objet `Product` JSON-LD et les métadonnées publiques.
4. Il extrait seulement des caractéristiques détectables dans le contenu reçu.
5. Il retourne la source et l'évidence utilisée.
6. Une réponse HTTP 403/anti-bot est remontée comme blocage : aucune caractéristique n'est inventée.

Le serveur ne contient volontairement aucune logique de contournement de WAF, de proxy résidentiel ou d'API privée du marchand.

Pour une page rendue exclusivement en JavaScript, il faut ajouter une couche navigateur autorisée côté serveur. Cette couche ne doit pas être confondue avec l'identification et le scoring du produit.

## Déploiement

`api/resolve.js` est compatible avec une fonction serverless de type Vercel. Le front statique peut rester sur GitHub Pages et appeler un endpoint externe en configurant `window.GUIDE_API_BASE` avant `phone-analyzer/fetcher.js`.
