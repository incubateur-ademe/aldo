# 9. Pratiques agricoles

Date: 2022-06-23

## Status

Accepted

## Context

Le troisième onglet dans l'outil original c'est pratiques agricoles. Alors on doit décider comment ajouter cette fonctionnalité dans l'outil web.

Les pratiques agricoles impactent les calculs de flux. Avec les parties 'flux de carbone', 'résultats graphiques', et matrice 'changements de surface' il y a déjà beaucoup de choses dans l'onglet flux. [Le system de design déconseille](https://gouvfr.atlassian.net/wiki/spaces/DB/pages/367985267/Onglets+-+Tabs#Usages) trop de contenu dans un onglet.

La colonne Pratiques_agricoles:D1 "Potentiel d'atténuation tout GES (tCO2∙ha-1∙an-1) intégrant le stockage de carbone ainsi que les émissions directes et induites" n'est pas utilisé dans les calculs.

## Decision

J'ajouterai un nouveau onglet pour la modification et l'affichange du détail de caculs relié aux pratiques agricoles.

J'ajouterai des tableurs dans le détail de flux pour les occupations de sol concernées (cultures, prairies, vignes, vergers) pour montrer les flux reliés aux pratiques agricoles.

J'ajouterai des liens vers le nouveau onglet dans l'onglet flux pour inviter les utilisatrices d'explorer cette partie.

Le format d'un flux relié à un pratique agricole va suivre largement le format décrit dans ADR 0008. Mais, on va ajouter `practice` et on n'utilisera pas `from`.

```
{
  to:
  practice:
  area:
  areaModified:
  reservoir:
  gas: 'C'
  flux:
  fluxEquivalent:
  value:
  co2e:
}
```

Jusqu'à maintenant j'ai utilisé les mots français pour `to`, `from`, car c'est pratique avec les données CSV qui ont eu déjà les colonnes nommées en français. Pourtant, c'est pas idéal parce que ça melange le code anglais avec les mots français. Alors pour `practice` je vais definir des `id` pour chaque pratique en anglais, et on pourrait imaginer faire quelque chose similar pour les `id`s des occupations de sol dans l'avenir quand les données traitées sont remplacées (si les APIs n'utilisent pas non plus les mots clés français).

> ... tout ce qui concerne la mécanique du code doit être en Anglais  par souci de cohérence avec la langue de ces langages de programmation.

[source](https://doc.incubateur.net/communaute/gerer-sa-startup-detat-ou-de-territoires-au-quotidien/je-fais-des-choix-technologique/standards-de-qualite-beta.gouv.fr#standards-de-qualite-logicielle)

Je n'ajouterai pas pour l'instant "Pratiques_agricoles:D1", je demanderai clarification de ça.

## Consequences

Le melange français/anglais pour les mots métier pourrait ressembler un peu bizarre pour la prochaine personne qui travail dans ce base de code.
