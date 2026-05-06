# 🔧 Configuration manuelle

## **Agrégation de communes**

L'outil ALDO était historiquement disponible à l'échelle de l'EPCI. C'est toujours le cas, mais il est dorénavant possible de constituer des territoires différents d'un EPCI. Par exemple pour obtenir des résultats à l'échelle d'un département, d'une région, d'un Parc Naturel Régional (PNR), etc.

Cela permet également de s'affranchir des éventuelles modifications de [#maillage-administratif](../complements/perimetre-et-limites.md#maillage-administratif "mention") pouvant avoir lieu depuis les dernières versions des bases de données utilisées. Par exemple, suite à l'ajout d'une commune au sein d'un EPCI depuis fin décembre 2018 ; ou suite à la création d'une commune nouvelle.

:new: Depuis la version CHANTERELLE de juin 2023, vous pouvez sélectionner et composer votre territoire à partir de l'agrégation de communes et ou EPCI référencés. Attention un message d'alerte s'affiche en cas de sélection non pertinente : sélection d'une quantité inférieure à une dizaine de communes, sélection de territoires trop éloignés géographiquement (par exemple des EPCI ou communes n'appartenant pas au même département ou à la même région).

## **Hypothèses de répartition des surfaces des sols artificialisés**

* les données d’occupation des sols statiques sur l'année de référence 2023),
* les données de changement d’occupation des sols sur la période 2013 - 2023.

La nomenclature de niveau 2 définie plusieurs typologies d'[occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol) pour les sols artificialisés :

* Sols artificialisés imperméabilisés
* Sols artificialisés enherbés et arbustifs
* Sols artificialisés arborés

Pour les **sols artificialisés** il est possible de définir un taux minimum de végétalisation. Par défaut, il est considéré que 80% des sols artificiels sont imperméabilisés et qu'à minima 20 % sont enherbés, arbustifs ou arborés. C'est à dire qu'avec cette hypothèse :

* Si Corine Land Cover détecte **plus** de 20% de sols artificiels enherbés, arbustifs ou arborés, ALDO retiendra les surfaces Corine Land Cover.
* Si Corine Land Cover détecte **moins** de 20% de sols artificiels enherbés, arbustifs ou arborés, ALDO recalculera ces surfaces pour qu'elles soient arbitrairement égales au taux de 20%.

Ce seuil minimum est envisagé pour palier à la résolution de Corine Land Cover (25ha) qui peut ne pas être suffisamment précise pour détecter les petits parcs et jardins présents dans les zones artificialisées.

En outre, chaque territoire pourra modifier ces proportions selon ses caractéristiques et sa connaissance du taux de végétalisation.

## Hypothèse de calcul des produits bois

[Définition](../introduction/definitions.md#produits-bois) des produits bois. Pour le calcul des stocks et flux de carbone des produits bois, deux approches différentes sont au choix :

* L'approche **Production** visant à estimer la part de bois produits et récoltés sur le territoire
* L'approche **Consommation** visant à estimer la part de produits bois consommés sur le territoire

Pour comprendre ces deux approches, consultez la rubrique dédiée aux stocks [specificites-produits-bois.md](../stocks/specificites-produits-bois.md "mention") ou aux flux [specificites-produits-bois.md](../flux/specificites-produits-bois.md "mention")

L’hypothèse "production" (récolte) est privilégiée pour garder le lien avec les forêts du territoire. En effet, les mécanismes de stockage de carbone dans les produits bois sont interconnectés avec les variations de stocks dans les forêts. Ces mécanismes doivent donc être évalués conjointement.

L’utilisateur a néanmoins le choix de passer en mode « consommation » s’il le souhaite mais il faut garder à l’esprit que l’outil ne permet d’évaluer le potentiel de séquestration additionnelle dans les produits bois liée à une augmentation de la consommation du bois dans le territoire. L’augmentation de la consommation de bois dans un territoire peut avoir une influence sur le stockage de carbone dans les forêts d’un autre territoire.

Enfin, les résultats de ces deux approches (production/consommation) ne peuvent pas être additionnés pour éviter des problèmes de double compte.

## Comparaison au Bilan GES (hors secteur UTCATF) du Territoire

Il est possible de renseigner le bilan GES d'émissions anthropiques du territoire, hors secteur UTCATF. Il est conseillé d'indiquer le BEGES de l'année de référence 2018, correspondant aux données de stocks et flux estimés dans ALDO (dernier millésime d'occupation des sols).

Cette valeur peut être comparée à la dynamique actuelle de flux de séquestration ou d'émission des sols et biomasse du territoire. Elle permet d'orienter la stratégie et les objectifs de trajectoire bas carbone pour l'élaboration du PCAET, dans l'objectif de contribution à la neutralité carbone : équilibre entre les émissions anthropiques résiduelles et la séquestration de carbone annuelle, défini dans la Stratégie Nationale Bas Carbone à l'horizon 2050.

## **Mises à jour des surfaces d'occupation du sol**

Si vous disposez de données locales (sur l'occupation du sol ou sur les changements d'occupation du sol) plus précises ou plus récentes, il est recommandé d'affiner le diagnostic. Quelques informations spécifiques et précautions concernant cette option :

* La matrice "Changement d'occupation des sols (ha/an)" se remplit et se lit dans le sens occupation du sol initiale & occupation du sol finale.
* En général, si une autre base de données d'occupation du sol est utilisée, la nomenclature peut différer. Il faut alors réaffecter les typologies selon la nomenclature ALDO. Vous pouvez vous aider du descriptif des typologies d'[occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol). Il n'y a toutefois pas de correspondance exacte.
* Concernant l'année de référence : si vous souhaitez mettre à jour seulement quelques typologies d'occupation du sol, il faut que ce soit cohérent avec les autres surfaces (2023 pour les surfaces d'occupation des sols, une année moyenne entre 2013 et 2023 pour les surfaces de changements d'occupation des sols).
* Concernant l'année de référence : si vous souhaitez mettre à jour toutes les surfaces avec une BDD locale dans son intégralité : vous pouvez choisir l'année que vous voulez si plus récente. Veillez à faire correspondre le périmètre de votre territoire s'il a évolué depuis : [#agregation-de-communes](configuration-manuelle.md#agregation-de-communes "mention")
* Si une seule surface est modifiée, vérifiez la pertinence/cohérence pour que le total des surfaces soit approximativement celui du périmètre étudié.
