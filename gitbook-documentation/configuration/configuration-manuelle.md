# 🔧 Configuration manuelle

## **Agrégation de communes**

L'outil ALDO était historiquement disponible à l'échelle de l'EPCI. C'est toujours le cas, mais il est dorénavant possible de constituer des territoires différents d'un EPCI. Par exemple pour obtenir des résultats à l'échelle d'un département, d'une région, d'un Parc Naturel Régional (PNR), etc.

Cela permet également de s'affranchir des éventuelles modifications de [#maillage-administratif](../complements/perimetre-et-limites.md#maillage-administratif "mention") pouvant avoir lieu depuis les dernières versions des bases de données utilisées. Par exemple, suite à l'ajout d'une commune au sein d'un EPCI depuis fin décembre 2018 ; ou suite à la création d'une commune nouvelle.

:new: Depuis la version CHANTERELLE de juin 2023, vous pouvez sélectionner et composer votre territoire à partir de l'agrégation de communes et ou EPCI référencés. Attention un message d'alerte s'affiche en cas de sélection non pertinente : sélection d'une quantité inférieure à une dizaine de communes, sélection de territoires trop éloignés géographiquement (par exemple des EPCI ou communes n'appartenant pas au même département ou à la même région).

## **Répartition des surfaces des sols artificialisés**

Les données de surface d’occupation et de changement d’occupation des sols issues du modèle du Citepa présentent une incertitude importante à l’échelle communale concernant la distinction des sous-catégories d’usages artificialisés, en particulier entre sols nus et surfaces végétalisées.

Cette incertitude s’explique notamment par la mobilisation, dans le modèle, de plusieurs produits cartographiques hétérogènes pour le suivi de l’artificialisation depuis les années 1990. Par ailleurs, l’application de traitements cartographiques (notamment la création de zones tampons autour des bâtiments) visant à garantir une représentation cohérente et continue des surfaces artificialisées dans le temps conduit à une sous-représentation des surfaces artificialisées végétalisées, au profit des surfaces de sols nus ou bâtis.

Afin de corriger cet artefact dans ALDO, un traitement spécifique a été appliqué aux données de surfaces du Citepa, à la fois pour :

* les données d’occupation des sols statiques (année de référence 2023),
* les données de changement d’occupation des sols sur la période 2013–2023.

Ce traitement repose sur l’estimation, à partir des données d’occupation des sols OCS-GE, de ratios de répartition des surfaces artificialisées par sous-catégorie, calculés à l’échelle communale pour l’ensemble de la France hexagonale. Trois classes de sols artificialisés, conformes à la [nomenclature ALDO](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol), sont distinguées :

* sols artificialisés imperméabilisés,
* sols artificialisés enherbés et arbustifs,
* sols artificialisés arborés.

Dans un premier temps, les surfaces artificialisées issues du modèle Citepa sont agrégées en une seule catégorie, sans distinction relative à la présence de biomasse. Dans un second temps, ces surfaces sont redistribuées entre les trois classes définies ci-dessus en appliquant les ratios communaux estimés à partir des données OCS-GE, qui reflètent l’état récent du territoire (période 2018–2024).

Aucune conversion interne entre sous-catégories de sols artificialisés n’est introduite. En revanche, les ratios de répartition sont appliqués à l’ensemble des flux de changement impliquant des surfaces artificialisées, afin de conserver le profil structurel de chaque commune dans les dynamiques d’usage des sols. Ainsi, pour chaque hectare nouvellement artificialisé, la répartition entre sols imperméabilisés, enherbés/arbustifs et arborés est déterminée à partir des ratios observés à l’échelle communale.

En complément de ce traitement qui repose sur des observations de OCG\_GE correspondant environ à l'année 2021 (année médiane variable selon les départements), chaque territoire pourra modifier les surfaces d'occupation des sols artificiels entre les 3 sous catégories selon les connaissances disponibles sur le taux de végétalisation.

## Hypothèse de calcul des produits bois

[Définition](../introduction/definitions.md#produits-bois) des produits bois. Pour le calcul des stocks et flux de carbone des produits bois, deux approches différentes sont au choix :

* L'approche **Production** visant à estimer la part de bois produits et récoltés sur le territoire
* L'approche **Consommation** visant à estimer la part de produits bois consommés sur le territoire

Pour comprendre ces deux approches, consultez la rubrique dédiée aux stocks [specificites-produits-bois.md](../stocks/specificites-produits-bois.md "mention") ou aux flux [specificites-produits-bois.md](../flux/specificites-produits-bois.md "mention")&#x20;

L’hypothèse "production" (récolte) est privilégiée pour garder le lien avec les forêts du territoire. En effet, les mécanismes de stockage de carbone dans les produits bois sont interconnectés avec les variations de stocks dans les forêts. Ces mécanismes doivent donc être évalués conjointement.&#x20;

L’utilisateur a néanmoins le choix de passer en mode « consommation » s’il le souhaite mais il faut garder à l’esprit que l’outil ne permet d’évaluer le potentiel de séquestration additionnelle dans les produits bois liée à une augmentation de la consommation du bois dans le territoire. L’augmentation de la consommation de bois dans un territoire peut avoir une influence sur le stockage de carbone dans les forêts d’un autre territoire.&#x20;

Enfin, les résultats de ces deux approches (production/consommation) ne peuvent pas être additionnés pour éviter des problèmes de double compte.

## Comparaison au Bilan GES (hors secteur UTCATF) du Territoire

Il est possible de renseigner le bilan GES d'émissions anthropiques du territoire, hors secteur UTCATF. Il est conseillé d'indiquer le BEGES d'une année proche de l'année de référence 2023 utilisée dans ALDO et calculée sur la base des changements d'occupation des sols identifiés sur la période 2013-2023 appliqués au surfaces d'occupation des sols de l'année 2023.

Cette valeur peut être comparée à la dynamique actuelle de flux de séquestration ou d'émission des sols et biomasse du territoire. Elle permet d'orienter la stratégie et les objectifs de trajectoire bas carbone pour l'élaboration du PCAET, dans l'objectif de contribution à la neutralité carbone : équilibre entre les émissions anthropiques résiduelles et la séquestration de carbone annuelle, défini dans la Stratégie Nationale Bas Carbone à l'horizon 2050.

## **Mises à jour des surfaces d'occupation du sol**

Si vous disposez de données locales (sur l'occupation du sol ou sur les changements d'occupation du sol) plus précises ou plus récentes, il est recommandé d'affiner le diagnostic. Quelques informations spécifiques et précautions concernant cette option :&#x20;

* La matrice "Changement d'occupation des sols (ha/an)" se remplit et se lit dans le sens occupation du sol initiale & occupation du sol finale.
* En général, si une autre base de données d'occupation du sol est utilisée, la nomenclature peut différer. Il faut alors réaffecter les typologies selon la nomenclature ALDO. Vous pouvez vous aider du descriptif des typologies d'[occupation du sol](../introduction/definitions.md#occupation-du-sol-et-changement-doccupation-du-sol). Il n'y a toutefois pas de correspondance exacte.
* Concernant l'année de référence : si vous souhaitez mettre à jour seulement quelques typologies d'occupation du sol, il faut que ce soit cohérent avec les autres surfaces (2023 pour les surfaces d'occupation des sols, une année moyenne entre 2013 et 2023 pour les surfaces de changements d'occupation des sols).
* Concernant l'année de référence : si vous souhaitez mettre à jour toutes les surfaces avec une BDD locale dans son intégralité : vous pouvez choisir l'année que vous voulez si plus récente. Veillez à faire correspondre le périmètre de votre territoire s'il a évolué depuis : [#agregation-de-communes](configuration-manuelle.md#agregation-de-communes "mention")
* Si une seule surface est modifiée, vérifiez la pertinence/cohérence pour que le total des surfaces soit approximativement celui du périmètre étudié.
