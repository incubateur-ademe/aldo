---
description: Stock de carbone du territoire (tC)
---

# 📊 Méthode générale

En préambule, consultez la définition d'un [stock](../introduction/definitions.md#stock-de-carbone) de carbone.

**La rubrique présente ici la méthode générale utilisée dans l'outil ALDO, étape par étape.** Des spécificités sont relatives à certaines typologies dans des rubriques dédiées :&#x20;

* [specificites-haies.md](specificites-haies.md "mention")&#x20;
* [specificites-produits-bois.md](specificites-produits-bois.md "mention")

Il s’agit de réaliser un état des lieux des stocks de carbone dans les sols et la biomasse du territoire. Bien que cet état des stocks ne soit pas demandé dans le texte du décret, il est utile pour se représenter les enjeux relatifs à la préservation des stocks existants, qui peuvent être menacés par des changements d’affectation des sols comme l’imperméabilisation, la déforestation ou le retournement des prairies. Les plans d’actions peuvent aussi intégrer des niveaux de stocks à atteindre.

## :one: Collecte des surfaces - par occupation du sol pour chaque typologie (ha)

Une répartition de la surface du territoire pour chaque occupation du sol est obtenue en hectare. Les surfaces renseignées sont obtenues, à partir de la base de données Corine Land Cover peu précise à cette échelle (résolution de 25 ha) : [Sources.](../introduction/sources.md#surfaces-ha)

{% hint style="info" %}
Cas particulier :

* Les **haies** n'existe pas dans la nomenclature Corine Land Cover. D'autres sources sont donc utilisées pour obtenir ces surfaces complémentaires, que l'on considère implantées _sur_ des surfaces agricoles - plus de détails dans la [méthode spécifique](specificites-haies.md).
* Les **forêts** : les surfaces des forêts sont issues de la BD Forêt® de l'IGN (Institut national de l'information géographique et forestière). Il y a un gain de précision important par rapport aux données surfaciques des forêts de Corine Land Cover. - plus de détails dans les [sources](../introduction/sources.md#donnees-surfaciques-pour-loccupation-du-sol-forets).
* Les **produits bois** ne sont pas quantifiés à partir de surfaces d'occupation du sol - plus de détails dans la [méthode spécifique](specificites-produits-bois.md).
{% endhint %}

Une représentation de l'aménagement du territoire en 2018 est ainsi fournie. Ainsi, les typologies [d'occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol) de niveau 1 et 2 sont renseignées.

Si des informations plus précises sont accessibles (bases de données locales/régionales), elles pourront être introduites par l'utilisateur, dans l'onglet **Configuration** en suivant la [procédure dédiée](../configuration/configuration-manuelle.md#mises-a-jour-des-surfaces-doccupation-du-sol). Les calculs de l'outil seront mis à jour automatiquement avec ces données plus précises.

{% hint style="info" %}
Cas particulier :

* Pour les **sols artificiels,**  dans l'optique où la résolution de Corine Land Cover n'aura pas permis de détecter finement les parcs, jardins ou autres sols enherbés : il est possible de définir un taux minimum de végétalisation. Par défaut, il est considéré que 80% des sols artificiels sont imperméabilisés et qu'a minima 20 % sont enherbés, arbustifs ou arborés. En outre, chaque territoire pourra modifier ces proportions selon ses caractéristiques. Pour cela, suivez la [procédure dédiée](../configuration/configuration-manuelle.md#hypotheses-de-repartition-des-surfaces-des-sols-artificialises) dans l'onglet **Configuration.**
{% endhint %}

## :two: Collecte des stocks de carbone de référence - pour chaque réservoir et pour chaque occupation du sol (tC∙ha-1)

Les quatre [#reservoirs](../introduction/definitions.md#reservoirs "mention") de carbone sont pris en considération : Sol, Litière, Biomasse vivante (aérienne et racinaire) et Biomasse morte.

Pour chacun d'entre eux, des stocks de carbone de référence par occupation de sol ont été attribués.&#x20;

Ces stocks de référence se traduisent par la quantité de carbone stockée en tonnes de carbone (tC) dans un hectare d'une occupation de sol donnée selon la localisation géographique du territoire.

* Pour les sols, les stocks de référence à l'hectare sont calculés par occupation du sol (typologie d'[occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol) de niveau 1) et par grande région pédoclimatique : \
  [Sources.](../introduction/sources.md#stocks-de-carbone-des-sols)
* Pour la litière, les stocks de référence à l'hectare sont une moyenne en France pour l'occupation du sol forêt (typologie d'[occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol) de niveau 1) :\
  [Sources.](../introduction/sources.md#stocks-de-carbone-de-la-litiere)
* Pour la biomasse aérienne et racinaire et la biomasse morte en forêt, les stocks de référence à l'hectare sont calculés pour l'occupation du sol forêt par composition (typologie d'[occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol) de niveau 2) et par région écologique.\
  [Sources.](../introduction/sources.md#stocks-de-carbone-de-la-biomasse-des-forets)
* Pour la biomasse aérienne et racinaire hors forêt, à savoir vignes, vergers, prairies arbustives et arborées, et sols artificiels arbustifs et arborées, les stocks de référence à l'hectare sont calculés par occupation du sol (typologie d'[occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol) de niveau 2) en valeurs moyennes par inter-régions.\
  [Sources.](../introduction/sources.md#stocks-de-carbone-de-la-biomasse-hors-forets-et-haies)

{% hint style="info" %}
Notez que nous identifions la typologie de niveau 1 pour l'attribution des stocks de référence pour les réservoirs sol et litière, la typologie de niveau 2 pour le réservoir biomasse. En effet, pour le réservoir biomasse, les stocks de carbone se différencient par la nature des prairies (arborée, arbustive, herbacée) et par la typologie de forêt (feuillus, mixtes, conifères, peupleraies), ce qui n'est pas le cas pour les réservoirs sol et litière.
{% endhint %}

En cumulant les stocks de référence pour les 4 réservoirs, et en fonction de la localisation du territoire (dans une certaine zone pédoclimatique, et une certaine grande région écologique), on obtient alors des stocks de référence à l'hectare qui peuvent être différents **pour chaque territoire.** L'exemple d'un territoire ci-dessous :

#### Stocks de référence par unité de surface et par occupation du sol, cumulés sur les compartiments sol-litière-biomasse (exemple d'un territoire) :

<figure><img src="../.gitbook/assets/image (8).png" alt=""><figcaption><p>Stocks de référence par unité de surface et par occupation du sol (exemple d'un territoire)</p></figcaption></figure>

## :three: Calcul des stocks totaux de carbone par occupation des sols et par réservoir (tC et %)

Les stocks totaux de carbone par occupation du sol sont obtenus en multipliant :

* les stocks de référence par occupation du sol (tC∙ha-1)
* avec les surfaces associées à chaque occupation du sol correspondante (ha)

**Au global**, il faut y additionner :&#x20;

* Des stocks totaux de carbone par occupation des sols et par réservoir (ci-dessus).
* Des stocks estimés dans les haies : [specificites-haies.md](specificites-haies.md "mention")
* Des stocks estimés dans les produits bois, selon l'approche utilisée :[specificites-produits-bois.md](specificites-produits-bois.md "mention")

Dans le tableau de l'onglet Stocks, une représentation de la répartition des stocks de carbone totaux tous réservoirs confondus dans le territoire et par occupation du sol est donnée par le calcul des proportions (%) des stocks totaux par occupation dans le territoire.

Plusieurs représentations graphiques sont disponibles :&#x20;

* Répartition du stock de carbone par réservoir, toutes occupations du sol confondues
* Répartition du stock de carbone par occupation du sol, tous réservoirs confondus
* Répartition du stock de carbone par occupation du sol dans les réservoirs Sols & Litières
* Répartition du stock de carbone par occupation du sol dans le réservoir Biomasse
* Stocks de référence par unité de surface et par occupation du sol
* Ventilation du stock carbone par occupation du sol (tous réservoirs inclus)
