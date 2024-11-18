# 🪵 Spécificités - Produits bois

[Définition](../introduction/definitions.md#produits-bois) des produits bois.

La rubrique présente ici la méthode utilisée dans l'outil ALDO, étape par étape.

La méthode est très similaire à l'estimation des stocks dans les produits bois. La seule différence est la valeur "France" de l'étape :one: qui est ici un flux.

## :one: Collecte des puits de carbone par catégorie de produits bois à l'échelle de la France (tCO2eq∙an-1 )

Pour le sciage (BO - bois d'œuvre) et les panneaux et papiers (BI - bois d'industrie), des valeurs de puits (flux) de carbone à l'échelle de la France sont collectées (CITEPA, moyenne 2016-2019).

[Sources.](../introduction/sources.md#puits-de-carbone-francais-dans-les-produits-bois)

## :two: Estimation théorique des quantités de produits bois récoltées par catégorie (BO/BI), du territoire et de la France

Ce calcul ici est expliqué dans le détail dans l'[onglet stock](../stocks/specificites-produits-bois.md#estimation-theorique-de-la-recolte-totale-et-par-categorie-bo-bi-du-territoire-et-de-la-france). La même valeur est reprise.



## :three: Distribution des puits de carbone des produits bois français par territoire (tCO2eq)

Il s'agit de répartir le flux de carbone des produits bois français :one:, pour chaque territoire.&#x20;

Deux approches sont considérées. L'utilisateur doit en choisir une. Laquelle ? Consultez les [explications dédiées](../configuration/configuration-manuelle.md#hypothese-de-calcul-des-produits-bois). Par défaut, l'approche production est privilégiée.

### Approche production (répartition selon récolte) :&#x20;

Selon cette approche, le flux est affecté au territoire à hauteur de la quantité de produit-bois matériaux (BO/BI) que celui-ci génère/produit.

La part de la récolte de produits bois matériaux du territoire au sein de la récolte totale française est calculée comme le ratio (_récolte produits bois territoire_ (:two:) divisée par la _récolte produits bois France_).&#x20;

Le flux de carbone lié aux produits bois du territoire est alors obtenu en multipliant ce ratio par la valeur du puits total de carbone contenu dans les produits bois en France (:one:).

### Approche consommation (répartition selon habitants) :&#x20;

Selon cette approche, le flux est affecté au territoire à hauteur de la quantité de produit-bois que celui-ci consomme.&#x20;

Cette consommation réelle n'étant pas connue, elle est estimée au prorata de sa population.

Le flux de carbone lié aux produits bois du territoire est obtenu en multipliant la valeur du puits total de carbone contenu dans les produits bois en France (:one:), par la part de la population du territoire dans la population nationale.
