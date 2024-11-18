# 🪵 Spécificités - Produits bois

[Définition](../introduction/definitions.md#produits-bois) des produits bois.

La rubrique présente ici la méthode utilisée dans l'outil ALDO, étape par étape.&#x20;

## :one: Collecte des stocks de carbone par catégorie de produits bois à l'échelle de la France (tC)

Pour le sciage (BO - bois d'œuvre) et les panneaux et papiers (BI - bois d'industrie), des stocks de carbone à l'échelle de la France sont collectés.

Ces stocks se traduisent par la quantité de carbone stockée (en tC) en France dans les produits bois en (moyenne 2016-2019) selon les estimations du CITEPA.

[Sources](../introduction/sources.md#stocks-de-carbone-francais-dans-les-produits-bois).

## :two: Estimation théorique de la récolte totale et par catégorie (BO/BI), du territoire et de la France

Des estimations théoriques des récoltes totales en bois (BO+BI+BE) et en bois d'œuvre (BO) et bois d'industrie (BI) sont fournies à l'échelle de la France, et du territoire. La récolte théorique est calculée en considérant un niveau de prélèvement (par unité de surface) égale à la région écologique et une répartition entre usage (BO/BI/BE) égales à ceux de la région administrative.

#### Calcul des récoltes théoriques totales :

Calcul des flux de référence des récoltes totales (m3/ha) de bois par composition (feuillus, mixtes, conifères, peupleraies) et par Région Ecologique calculés en soustrayant les pertes d’exploitation aux données de prélèvements moyens fournies par l'IGN par composition (feuillus, mixtes, conifères, peupleraies) et par Région Ecologique. [Sources](../introduction/sources.md#prelevements-de-biomasse-en-forets)[.](../introduction/sources.md#prelevements-et-recolte-de-bois-en-forets)

#### Calcul des pertes d'exploitation :&#x20;

$$
Récolte  totale = 0,9* prélèvementBFT + 0,5 * (prélèvementVAT - prélèvementBFT)
$$

Le coefficient d’expansion aérien utilisé pour passer de volume bois fort tige (BFT) à volume aérien total (VAT) est de :&#x20;

* 1,3 pour les résineux et les peupliers
* 1,44 pour les feuillus
* 1,37 pour mixte.&#x20;

Les pertes d'exploitation considérés correspondent donc à 10% sur le bois fort et à 50% sur le reste de compartiments de l’arbre.&#x20;

#### Calcul des récoltes théoriques par usage :

Répartition des flux de référence des récoltes de bois entre les différents usages du bois (m3 BO/ha ; m3 BI/ha; m3 BE/ha)  : selon les proportions de récolte par catégorie de bois (BO/BI/BE) à l'échelle de la région administrative estimés sur la base de données Agreste (pour la récolte commercialisée) et IGN (pour la récolte BE non commercialisée) \
[Sources.](../introduction/sources.md#distribution-de-la-recolte-commercialisee-de-produits-bois)

#### Calcul des récoltes théoriques par territoire :

Calcul des récoltes théoriques totales et des récoltes bois matériaux BO / BI à l’échelle du territoire : obtenus par le produit des flux de référence des récoltes de bois par avec les surfaces du territoire associées à chaque typologie de forêt

On obtient alors pour chaque territoire une estimation théorique de la récolte totale et de la récolte de BO et de BI.

## :three: Distribution du stock de carbone des produits bois français par territoire (tC)

Il s'agit repartir le stock de carbone des produits bois français par territoire.

Deux approches sont considérées. L'utilisateur doit en choisir une. Laquelle ? Consultez les [explications dédiées](../configuration/configuration-manuelle.md#hypothese-de-calcul-des-produits-bois). Par défaut, l'approche production est privilégiée.

### Approche production (répartition selon récolte) :&#x20;

Selon cette approche, le stock est affecté à un territoire à hauteur de la quantité de produit-bois matériaux (BO/BI) que celui-ci génère/produit.

La part de la récolte de produits bois du territoire au sein de la récolte totale française est calculée comme le ratio (_récolte produits bois territoire_ (:two:) divisée par la _récolte produits bois France_).&#x20;

Le stock de carbone des produits bois du territoire est alors obtenu en multipliant ce ratio par la valeur du stock total de carbone contenu dans les produits bois en France (:one:).

### Approche consommation (répartition selon habitants) :&#x20;

Selon cette approche, le stock est affecté à un territoire à hauteur de la quantité de produit-bois que celui-ci consomme.

Cette consommation réelle n'étant pas connue, elle est estimée au prorata de sa population.

Le stock de carbone des produits bois du territoire est obtenu en multipliant le stock national de produits bois (:one:) par la part de la population du territoire dans la population nationale.



