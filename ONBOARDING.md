# Lancer l'application en local

On utilise Node.js 24 (cf. `.nvmrc`) avec npm. Le code est en TypeScript, exécuté
directement par Node (pas d'étape de build).

Créer le fichier `.env` avec :

```
HOSTNAME=127.0.0.1:8080
PROTOCOL=HTTP
SIB_API_KEY=votre clé (facultatif)
SIB_CONTACT_TEMPLATE=votre template (facultatif)
ALDO_EMAIL=votre mail (facultatif)
```

`npm install`

`npm run csvtojson` (génère les JSON à partir des CSV de `data/`)

`npm run dev`

Vérifications : `npm test` (vitest), `npm run typecheck` (tsc), `npm run lint` (oxlint).
