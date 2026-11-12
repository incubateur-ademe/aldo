# Lancer l'application en local

On utilise Node.js 24 (cf. `.nvmrc`) avec npm. Le code est en TypeScript, exécuté
directement par Node (pas d'étape de build).

Créer le fichier `.env` avec :

```
SIB_API_KEY=votre clé (facultatif)
SIB_CONTACT_TEMPLATE=votre template (facultatif)
ALDO_EMAIL=votre mail (facultatif)
```

En production, définir `BASE_URL` (ex. `https://aldo-carbone.ademe.fr`) : c'est la base
des liens absolus du sitemap et du tableur. Sans elle, ils sont déduits de la requête.

`npm install`

`npm run csvtojson` (génère les JSON à partir des CSV de `data/`)

`npm run dev`

Vérifications : `npm test` (vitest), `npm run typecheck` (tsc), `npm run lint` (oxlint).
