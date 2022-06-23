# 8. format-donnees-flux

Date: 2022-06-13

## Status

Accepted

## Context

Je trouve le format que j'ai choisi pour les stocks un peu difficile de conceptualiser. Surtout, c'est pas pratique parce que je trouve que je refaire l'API entre le 'back' et 'front' selon comment le front veut montrer les infos (e.g. il y a un format pour le tableur, un autre pour chaque graphic).

Je veux alors essayer un autre format pour les flux.

## Decision

Je veux definir un format pour un 'source de flux', et après envoyer au front chaque flux dans un array.

```
{
  from: l'occupation du sol initiale - un des stocksId dans le structure GroundTypes
  to: l'occupation du sol finale - un des stocksId dans le structure GroundTypes
  area: taux moyen de changement de surface entre from et to utilisé pour les calculs (ha/an)
  originalArea: taux moyen de changement de surface entre from et to selon les données de l'applis (ha/an)
  areaModified: boolean qui indique si l'area a été modifiée par l'utilisatrice ou non
  reservoir: 'sol', 'litière', 'biomasse', 'sol et litière'
  gas: 'C' ou 'N2O'
  flux: flux unitaire (par ex tC/ha.an)
  fluxEquivalent: flux unitaire en CO2e (tCO2e/ha.an)
  value: séquestration (ou émission si le valeur est < 0) selon le gaz de ce flux (tC/an ou tN2O/an)
  co2e: le valeur converti en CO2 equivilant (tCO2e/an) - utilisé pour le plupart des aggregations
}
```

Les produits bois suivent un autre format

```
{
  to: 'produits bois'
  category: 'bo' ou 'bi'
  franceSequestration: séquestration nationale selon category (tCO2/an)
  localPortion: valeur utilisé pour calculer quelle partie de franceSequestration à utiliser selon la localisation (calculé avec les clés selon le woodCalulation choisi)
  gas: 'CO2'
  value: séquestration (tCO2/an)
  co2e: === value
  // clés pour woodCalculation === "récolte"
  franceHarvest: valeur selon category (m3/an)
  localHarvest: valeur selon category et localisation (m3/an)
  // clés pour woodCalculation === "consommation"
  francePopulation: valeur (personnes)
  localPopulation: valeur selon localisation (personnes)
}
```

## Consequences

Ce n'est pas idéal d'avoir deux formats de données differents dans le même projet. Si il devient un problème, il faudra choisir un format selon lequel est mieux et refactoriser le code.

En plus, je voudrais éviter des calculs sur le front au plus, alors j'imagine j'aurai besoin quand même de quelques aggregations selon l'affichage de données.

Il y a des flux sans un `from` pour quelques données où `to` === `forêt`.

C'est moins efficace de faire des `find` qu'un hash lookup, mais je ne pense pas qu'il y ait assez de données pour rencontrer ce problème. En plus les filtres/recherches sont souvents un peu differents alors je sais pas si on gagnerait beaucoup avec des shortcuts.
