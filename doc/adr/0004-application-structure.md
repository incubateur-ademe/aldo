# 4. application-structure

Date: 2022-02-14

## Status

Accepted

## Context

Je dois décider comment structurer le code de cette application. J'ai en tête les choses suivantes :

1. Pour laisser le possibilité de (assez) facilement remplacer les aspects front avec un applis React (par exemple), je veut bien isoler le côté front du côté back.
2. Les données dans le tableur ne sont pas les données brutes. Au fur et à mésure on veut remplacer les données traitées pour avoir tous les calcules nécessaires pour Aldo dans cette application. Alors je veut créer une abstraction de cette couche.
3. On prévoit que l'utilisatrice pourra choisir comment grouper les communes pour voir les statistiques (au moins deux communes pour IGN, une commune pour le reste de données), ou choisir un département/une région/un EPCI. Maintenant, les données traitées sont fournies dans des groupements d'EPCI. Je veux écrire un API qui est facilement modifié pour ajouter les autres options de groupement.
4. Dans l'avenir, c'est possible qu'on voudrait donner l'utilisateur l'option de saisir quelques données soi-même (par exemple pour corriger ou raffiner nos données). L'application doit être écrite dans un façon de ne pas empêcher cette fonctionnalité. Les exemples de ça dans le tableur Aldo maintenant sont: a) modification de ha par type de sol, b) l'ajout de stocks en agroforesterie, c) taux moyen de changement (ha/an) par type de sol, d) les changements de pratiques agricoles dans les dernières 20 années.
5. Plus tard, on va ajouter des calcules pour les flux ainsi que les stocks.
6. Les EPCIs changent entre les années, et l'équipe ABC a du modifier les communes exactes pour les EPCIs pour faire quelques calculs. Alors les infos sur les EPCIs pourraient avoir besoin d'un peut de traitement avant être utilisées dans les calculs et affichage des utilisateurs.

Un architecture souvent employé c'est MVC (model-view-controller). Ici la logique est découpé en affichage, préparation pour l'affichage, et la gestion de données. Si j'utilise ça, je pourrais couper le traitement de données brutes et leur groupement dans la couche de modèle; les calcules qui sont faites pour chaque groupement de communes (EPCI au premier), et leur selection (e.g. sommaire ou détail pour un type de sol) dans la couche controller; et les templates et styles dans la couche view.

En revanche :

- Je veux que les calculs de controller décrits au-dessus sont accessible même si le front change, alors les resultats doivent être fournis sans notion de comment ces chiffres vont être utilisés.
- Je me demande où est le meilleur endroit pour la logique de groupement de communes. Il me semble que dans la couche data on veut garder les données assez brutes rendre très claire la distinction entre notre traitement et les sources des autres, alors c'est peut-être pas l'endroit pour les aggregations de données. Par contre, les calculs vont utiliser seulement les données agrégées et pas les données brutes, et il y a déjà beaucoup de logique à gérer pour les calculs qui utilisent des données agrégées. Peut-être une couche entre les deux serait utile.
- Souvent quand on pense de 'controller' on a en tête que le controller vont gérer la requête, et c'est trop dans le détail du front que je voudrais, car ça défini le format du réponse (HTML vs JSON).

## Decision

Je vais commencer avec un structure suivant :

```
Aldo
  index.js
  > front/
    > routes.js
    > templates/
    > static/
  > calculations/
    > stocks/
      > __tests__/
    > epcis/
  > aggregatedData/
    > index.js
    > tmpFiles/
  ... (autres dossiers et fichiers hors de cette décision)
```

Où `index.js` va importer les routes de `front` (qui pourrait être remplacé par un `api` à l'avenir), et `front/routes/` va appeler des fonctions de `calculations/` (à l'avenir, on aura `flux/` ainsi que `stocks/`) pour récevoir les données nécessaires pour chaque page du site. `calculations/` n'a pas une idée de si ces fontions seront utilisées pour un site web, un API, ou quelque chose d'autre.

Quand on a des données brutes, on peut créer un autre dossier à la racine du projet nommé `data/`, et `/aggregatedData` va importer des méthodes de `data/`. On va aussi supprimer `aggregatedData/tmpFiles/` car ce dossier sera utilisé pour sauvegarder les données du tableur déjà traitées.

Dans le structure au-dessus, chaque ligne à la racine du projet est que 'consciente' de la ligne précedente. C'est-a-dire que `index.js` ne peut que référencer `front/` directement, et `front/` ne peut que référencer `calculations/` directement, etc. Dans un dossier, les fichiers peuvent référencer l'un et l'autre avec prudence (par exemple, on espère que `epcis/` n'aura pas besoin d'utiliser `stocks/`, mais c'est possible que `stocks/` aurait besoin de `epcis/`).

## Consequences

C'est possible qu'il y aura trop de logique dans `calculations/` - je dois étre prudente de la direction de dépendances et le structure internel de ce dossier.

Je sais pas si il y aura besoin de référencer directement `data/` sans `aggregatedData/`, si oui ça change les régles de référencement.

J'aime pas trop le nom `calculations/` - il me semble trop spécifique avec l'inclusion de `epcis/`, mais je veux éviter le nom `controllers/` car, comme décrit, les fonctions dedans ne sont pas conscientes de la notion de présentation.
