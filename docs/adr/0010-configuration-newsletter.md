# ADR 0010 : Configuration de la newsletter

## Contexte

L'application ALDO propose un encart d'inscription à la newsletter qui permet aux utilisateurs de s'inscrire pour recevoir les actualités. Les emails collectés sont stockés dans un Google Sheet configuré via des variables d'environnement.

## Configuration requise

### Variables d'environnement

Pour activer la fonctionnalité de newsletter, vous devez configurer les variables d'environnement suivantes :

1. **GOOGLE_SHEETS_ID** : L'ID du Google Sheet où seront stockés les emails
   - Format : identifiant unique du Google Sheet (visible dans l'URL du sheet)
   - Exemple : `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

2. **GOOGLE_SHEETS_CREDENTIALS** : Les credentials JSON du compte de service Google
   - Format : chaîne JSON contenant les credentials du compte de service
   - Exemple : `{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}`

3. **SLACK_COMMUNITY_URL** (optionnel) : URL du Slack de la communauté
   - Format : URL complète vers le Slack
   - Exemple : `https://join.slack.com/t/communaute-aldo/...`
   - Par défaut : `#` si non défini

### Configuration Google Sheets

#### 1. Créer un Google Sheet

1. Créer un nouveau Google Sheet
2. Noter l'ID du sheet dans l'URL (entre `/d/` et `/edit`)
3. Créer une première feuille avec les colonnes : `Email` et `Date d'inscription`

#### 2. Créer un compte de service Google

1. Aller dans la [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer l'API Google Sheets pour ce projet
4. Créer un compte de service :
   - Aller dans "IAM & Admin" > "Service Accounts"
   - Cliquer sur "Create Service Account"
   - Remplir les informations et créer
5. Générer une clé JSON :
   - Cliquer sur le compte de service créé
   - Aller dans l'onglet "Keys"
   - Cliquer sur "Add Key" > "Create new key"
   - Sélectionner "JSON" et télécharger

#### 3. Partager le Google Sheet avec le compte de service

1. Ouvrir le Google Sheet
2. Cliquer sur "Partager" (Share)
3. Ajouter l'email du compte de service (trouvé dans le fichier JSON téléchargé, champ `client_email`)
4. Donner les permissions "Éditeur" (Editor)

#### 4. Configurer les variables d'environnement

1. Copier le contenu du fichier JSON téléchargé
2. Le convertir en une seule ligne (sans retours à la ligne) ou utiliser un format JSON valide
3. Définir les variables d'environnement :

```bash
export GOOGLE_SHEETS_ID="votre-id-du-sheet"
export GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
export SLACK_COMMUNITY_URL="https://join.slack.com/t/communaute-aldo/..."
```

Ou dans un fichier `.env` :

```
GOOGLE_SHEETS_ID=votre-id-du-sheet
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
SLACK_COMMUNITY_URL=https://join.slack.com/t/communaute-aldo/...
```

## Fonctionnement

### Affichage de l'encart

L'encart s'affiche automatiquement sur la page des résultats de territoire après une recherche, avec un délai de 500ms pour une meilleure UX.

L'encart ne s'affiche pas si :
- L'utilisateur l'a déjà fermé (stocké dans `localStorage`)
- Les variables d'environnement ne sont pas configurées (l'erreur sera loggée côté serveur)

### Validation de l'email

La validation de l'email se fait :
- Côté client : format `@xx.yy` (regex : `/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/`)
- Côté serveur : même validation avant sauvegarde

### Sauvegarde dans Google Sheets

Lors de la soumission du formulaire :
1. L'email est validé
2. Une requête POST est envoyée à `/api/newsletter`
3. Le serveur ajoute l'email et la date d'inscription dans le Google Sheet
4. Si les en-têtes n'existent pas, ils sont créés automatiquement

### Fermeture de l'encart

L'utilisateur peut fermer l'encart :
- En cliquant sur le bouton "Fermer"
- L'état de fermeture est sauvegardé dans `localStorage` pour ne plus afficher l'encart lors des visites suivantes

## Dépannage

### L'encart ne s'affiche pas

- Vérifier que les variables d'environnement sont bien définies
- Vérifier la console du navigateur pour d'éventuelles erreurs JavaScript
- Vérifier que `localStorage` n'a pas la clé `newsletter-subscribe-closed` définie à `true`

### Erreur lors de la sauvegarde

- Vérifier que le compte de service a bien accès au Google Sheet
- Vérifier que l'API Google Sheets est activée dans le projet Google Cloud
- Vérifier les logs serveur pour plus de détails sur l'erreur
- Vérifier que le format JSON des credentials est valide

### L'email n'apparaît pas dans le Google Sheet

- Vérifier que le compte de service a les permissions "Éditeur" sur le sheet
- Vérifier que l'ID du sheet est correct
- Vérifier les logs serveur pour d'éventuelles erreurs

