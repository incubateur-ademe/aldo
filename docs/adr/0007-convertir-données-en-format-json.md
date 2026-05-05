# 7. convertir données en format JSON

Date: 2022-03-25

## Status

Accepted

## Context

Pour plusieurs fichiers CSVs assez grands, le téléchargement de pages a été trop long, >2s. Le test d'integration (4 tests en total, 3 appels vers `getStocks) a pris 7.9 s. On doit améliorer ça.

## Decision

Au lieu de relire le CSV à nouveau chaque fois, je veux utiliser JSON car c'est plus rapide. Ça nécéssite une conversion de format. Je veux la faire une fois, avant que le serveur démarre car il n'y a pas une raison de la faire plusieurs fois. Je veux que, en locale, c'est possible d'éviter cet étape quand les fichiers existe déjà pour ne pas perdre du temps de dévéloppment. Par contre, en prod je veux que la conversion est faite chaque fois pour m'assurer qu'on utilise les données les plus récentes pour chaque instance.

## Consequences

Si on utilise un BDD ou des appels vers des APIs à l'avenir, on devrait gérér les appels asynchros à nouveau.
