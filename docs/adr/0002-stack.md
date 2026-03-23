# 2. Stack

Date: 2022-02-07

## Status

Accepted

## Context

Il y a plusieurs options du stack téchnique, voici un sommaire des options considérées.

Django (avec des pages rendues côté serveur) :

- \+ https://github.com/entrepreneur-interet-general/django-dsfr
- \+ https://github.com/entrepreneur-interet-general/django-francedata/
- \+ Pandas si jamais on a besoin de faire des calculs complexes avec les données
- \+ J'ai (Helen) travaillé déjà avec Django
- \- si on utilise un front séparer, on va avoir un stack composé par des langages differents
- \- l'équipe datagir utilise plutôt JS, pas Python

ExpressJS (avec des pages rendues côté serveur) :

- \+ https://github.com/betagouv/template-design-system-de-l-etat
- \+ Plus facile d'integrer [publicodes](https://github.com/betagouv/publicodes) si jamais besoin
- \+ L'équipe datagir a des connaissances fortes de JS
- \+ https://www.npmjs.com/package/@etalab/decoupage-administratif
- \+ Si on choisit d'avoir un front a l'avenir le stack utilisera un seul langage
- \+ Pas de front = un instance à déployer
- \- Pas de front = le temps de téléchargement après le premier sera un peu plus long
- \- J'ai (Helen) pas d'experience avec ExpressJS (mais j'ai d'éxperience avec les sites JS rendus côté serveur en général)

React seulement :

- \+ L'équipe datagir a des connaissances fortes de React
- \- Je (Helen) trouve qu'il y a beaucoup à apprendre avec React, alors le debut de codage irait moins vite
- \- Si jamais les utilisateurs devraient être capable de saisir des données eux-mêmes, comme possible maintenant dans le tableur excel, on aura besoin d'introduire un côté back
- \- Possiblement ~300ko de données à envoyer en plus du site (5 (sources de données) \* 1500 (nombre estimé d'EPCI) \* 10 (colonnes) \* 4 (octets par chiffre) = 300ko of data) - c'est [pas choquante](https://www.speedcurve.com/blog/web-performance-page-bloat/) mais évitable avec un back, et peut-être on peut réduire ce taille avec de traitement préliminaire de données.
- \- Ce site sera assez simple niveau interaction d'utilisateurs, alors je vois pas le valeur apporté de React

## Decision

On va utiliser ExpressJS.

## Consequences

Pour aider la transition vers un API, si jamais besoin, je vais trouver un structure de codage isoler pour ne pas melanger l'affichage avec la logique.
