# 🗺️ Périmètre et limites

## Périmètre d'utilisation

<details>

<summary>Maillage administratif</summary>

:new: La version actuelle CHANTERELLE propose depuis juin 2023 une visualisation des résultats à l'échelle communale et EPCI. L'agrégation de plusieur territoires est possible via l'outil en ligne, elle est même recommandée lors d'une estimation au niveau communal.

L'agrégation des différentes données disponibles dans ALDO se fait à l'échelon communal, selon le millésime communal officiel de décembre 2018.

Ce millésime **2018** coïncide donc avec les deux bases de données les plus conséquentes utilisées dans l'outil ALDO : Corine Land Cover **2018** pour les surfaces d'occupation du sol (et les changements d'occupation du sol), et la BD Forêt® V2 - **2018** de l'IGN (pour les surfaces forestières) - Consultez les [sources.md](../introduction/sources.md "mention"). Il n'existe pas de versions plus récentes pour ces BDD.

Si vous ne trouvez pas le nom/SIREN d'un territoire, plusieurs raisons possibles : &#x20;

* Y a t-il fusion, création, disparition, changement de nom, etc. depuis décembre 2018 ?
* Existait-il en l'état en décembre 2018 ?

Si besoin de recomposer votre territoire actuel, vous pouvez sélectionner vous-mêmes les communes à agréger en suivant la procédure expliquée dans la[configuration-manuelle.md](../configuration/configuration-manuelle.md "mention")

</details>

<details>

<summary>Échelle de visualisation des résultats </summary>

L'agrégation des différentes bases de données disponibles dans ALDO se fait à partir de l'échelon communal pour aboutir à des territoires de plusieurs communes (PNR, EPCI, départements, autres). Les résultats ne sont pas interprétables à l'échelle d'une seule commune pour éviter des écarts importants avec l'échelle de calcul des données sources (stocks et flux de référence à l'hectare).

:new: Depuis la version CHANTERELLE de juin 2023, des **messages d'alerte** peuvent s'afficher en cas d'échelle de visualisation non pertinente :&#x20;

\-> Sélection d'une quantité de communes **inférieure à une dizaine de communes** :&#x20;

_Vous avez sélectionné un territoire jugé trop petit compte tenu de l'incertitude. ALDO propose des ordres de grandeurs sur les stocks et flux de carbone dans les sols et la biomasse pour initier une réflexion sur la gestion des sols et des forêts en lien avec les activités agricoles, sylvicoles et l’aménagement du territoire. Notons que toutes les valeurs moyennes de stocks de carbone et flux de référence à l’hectare sont calculées à l’échelle de vastes domaines géographiques : les grandes régions écologiques pour la biomasse forestière et les régions pédoclimatiques pour les stocks de carbone dans les sols. Si la moyenne est significative et statistiquement valide à ces échelles, elle peut masquer des situations locales hétérogènes : en dessous d'une dizaine de communes, on considère qu'ALDO n'est pas l'outil adéquat pour fournir ces résultats. Plus de détails sur les échelles de_ [_significativité des données._](perimetre-et-limites.md#incertitudes-et-significativite-des-donnees)

\-> Sélection de territoires **trop éloignés géographiquemen**t (par exemple des EPCI ou communes n'appartenant pas au même département ou à la même région).

_Vous avez sélectionné des territoires qui n'appartiennent pas tous au même territoire "supra" (EPCI, département ou région) La sélection de territoires trop éloignés géographiquement n'est pas pertinente (les valeurs de référence des stocks et flux de carbone à l'hectare varie selon l'emplacement du territoire). Nous vous recommandons, si tel était le cas, d'obtenir vos résultats de manière séparée pour chacun des territoires sélectionnés pour avoir une vision plus contrastée et localisée des spécificités locales._

</details>

<details>

<summary>DOM-COM</summary>

En l’état actuel, l’outil n’inclue pas dans son périmètre les territoires d’outre-mer. Pour les territoires des DOM-COM, il est recommandé de réaliser le diagnostic avec des données locales.

</details>

<details>

<summary><strong>International</strong></summary>

L'outil ALDO et les données qui sont proposées ne sont pas adaptées à un usage en dehors du territoire de la France métropolitaine. Comme le montre [les cartes](../introduction/sources.md) des zones pédologiques, des zones climatiques et des sylvo-écorégions, les types de sol et de biomasse ne sont adaptés qu'à un contexte locale.

</details>

## Limites méthodologiques et précautions

<details>

<summary>Incertitudes et significativité des données</summary>

D’un point de vue méthodologique, l’estimation des flux de carbone entre les sols, la forêt et l’atmosphère est sujette à des incertitudes importantes car elle dépend de nombreux facteurs, notamment pédologiques et climatiques.

Notons que toutes les valeurs moyennes de stocks de carbone et flux de référence à l’hectare sont calculées à l’échelle de vastes domaines géographiques : les grandes régions écologiques pour la biomasse forestière et les régions pédoclimatiques pour les stocks de carbone dans les sols.&#x20;

**->** Si la moyenne est **significative et statistiquement valide** à ces échelles de vastes domaines géographiques, elle peut masquer des **situations locales hétérogènes.** Les stocks et les flux de carbone à l'hectare peuvent ne pas être statistiquement valides à l'échelle de la commune ou des EPCI.

ALDO applique aux surfaces locales (EPCI, communes, etc.) les valeurs moyenne à l'hectare de ces grands ensembles géographiques. Et donc les résultats à l'échelle de visualisation (territoire) doivent être interprétés comme des ordres de grandeurs et non pas comme des valeurs statistiquement valides. Il est important de vérifier leur pertinence et, le cas échéant, de les remplacer par des valeurs plus cohérentes avec le territoire.

Par exemple, concernant les stocks et flux des forêts, la moyenne calculée à l’échelle des forêts résineuses de Bretagne combine en réalité des peuplements de pins sur le littoral et dans les landes (productivité faible à moyenne) et les plantations industrielles de douglas et d’épicéa de Sitka dans l’intérieur de la Bretagne (forte productivité).

</details>

<details>

<summary>Le puits de carbone actuel en forêt n’est pas celui de demain</summary>

Le puits qui représente aujourd’hui la forêt est lié à une dynamique d’expansion inédite. Au cours du XXème siècle, la surface forestière s’est ainsi accrue de 6 millions d’hectares et couvre aujourd’hui 16,8 millions d’hectares. La maturation de ces forêts se traduit par une augmentation du stock de bois sur pied, qui a doublé au cours des cinquante dernières années. L’augmentation du stock sur pied pouvant être expliqué par l’accroissement des surfaces (ex : recolonisation naturelle d'espaces agricoles abandonnés) et par une moindre exploitation industrielle ou domestique de forêts qui étaient auparavant exploitées par une population essentiellement rurale. Il s’agit d’une situation non stationnaire car le puits carbone in situ est théoriquement amené à s’arrêter à long terme (l’augmentation de stock de carbone in situ est limitée).

Les dynamiques de stockage de carbone dans la biomasse forestière dépendent de trois paramètres : la croissance des arbres, qui détermine les absorptions de CO2 atmosphérique, la mortalité naturelle et le prélèvement du bois, qui provoquent des réémissions progressives de carbone dans l’atmosphère par décomposition ou combustion. La gestion forestière modifie ces paramètres à travers le choix des essences et les prélèvements qui vont déterminer les classes d’âge des peuplements. Les stocks dans la biomasse augmentent avec l’âge du peuplement, jusqu’à atteindre un niveau maximal de saturation dans les forêts matures non exploitées. Dans les forêts gérées selon un objectif de production de bois, l’âge de coupe des peuplements est inférieur à celui de la mortalité naturelle des arbres et généralement établi pour maximiser la rentabilité économique. Leurs stocks sont généralement inférieurs à l’état de saturation du réservoir. Ils tendent également à s’équilibrer à long terme lorsque le niveau de prélèvement de bois se limite à l’accroissement des forêts. Aujourd’hui, les forêts françaises n’ont pas encore atteint ces états d'équilibre, c’est pourquoi elles représentent un puits de carbone important.

Le changement climatique bouleverse également les stocks de carbone en modifiant la vitesse de croissance des peuplements et la mortalité liée à des évènements extrêmes.&#x20;

</details>

<details>

<summary>Projections sur l’évolution de la forêt</summary>

Les données sur la forêt intégrées dans l’outil ALDO décrivent les stocks et les flux actuels de séquestration en tentant compte la répartition en classes d’âge actuelle des forêts et le niveau de prélèvement de bois actuel. L’outil ALDO ne permettent pas d’évaluer l'évolution future des stocks de carbone des forêts dépendant des stratégies forestières mises en place. L’outil ALDO ne permet pas non plus d’évaluer la disponibilité additionnelle de biomasse forestière qui dépendra également de l’évolution des pratiques sylvicoles dans le territoire.&#x20;

</details>

<details>

<summary>Comparaison des données ALDO avec d'autres sources de données</summary>

ALDO est le seul outil proposant actuellement une méthode unique couvrant l'intégralité du territoire français métropolitain. Les données surfaciques (occupation du sol et changement d'occupation des sols) et les stocks/flux de carbone peuvent être différentes en fonction de la source utilisée :

* La résolution de Corine Land Cover pour l'occupation du sol est de 25 ha. Des données plus fines ou plus récentes peuvent être disponibles sur certains territoires (études fournies par des observatoires, des AASQA, des prestataires privés, etc.). Dans ce cas, il est recommandé de les utiliser [#mises-a-jour-des-surfaces-doccupation-du-sol](../configuration/configuration-manuelle.md#mises-a-jour-des-surfaces-doccupation-du-sol "mention")
* Concernant les valeurs de stocks et flux de carbone du compartiment sol, des données de référence plus locales peuvent être utilisées, issues de modèles prenant en compte notamment les caractéristiques pédologiques et l'occupation du sol, voire des données issues de mesures directes. Dans ce cas les analyses agropédologiques de sol doivent être réalisées selon le protocole de la norme ISO 23400 "lignes directrices pour la détermination des stocks de carbone organique \[...] à l'échelle d'une parcelle" pour déterminer des valeurs en tC/ha à partir de mesure de taux de matière organique sur 30cm et densité apparente sèche.
* Concernant les valeurs de stocks et flux de carbone de la biomasse forestière, des données de référence plus locales peuvent être utilisées, issues des inventaires forestiers réalisés à l'échelle locale. Le nombre de points à inventorier serait toujours supérieur à celui de l’Inventaire Forestier National (IFN) pour permettre d’améliorer la précision statistique au niveau du territoire d’étude. La densification de l’information levée sur le terrain permet de réduire les intervalles de confiance des variables estimées (surface, volume, ventilées par classes de diamètres, par essence,…) par rapport à ce que permettent les données de l’IFN. L’échantillonnage statistique de ces inventaires doit être défini spécifiquement pour produire une information valide à l’échelle du territoire concerné. Les données collectées sur le terrain dans le cadre de la réalisation de ces inventaires peuvent comporter, outre des informations dendrométriques, des informations sur l’écologie des stations (végétation, sol, etc.) et sur les habitats forestiers. Ce type d’inventaire fournit une information précise sur le stock actuel de bois (par essences, par catégories de dimension, par qualités des bois…), sa dynamique récente (accroissement, mortalité, prélèvement).
* :new: <mark style="color:yellow;">Des évolutions de l'outil sont prévues</mark>. Le CITEPA est actuellement en train d'améliorer considérablement la méthodologie de l'[inventaire UTCATF](https://www.citepa.org/fr/t/theme-utcatf/) (approche spatialement explicite, permettant d'affiner les matrices surfaciques de changements d'occupation des sols). Les données accessibles mi-2023, auront une résolution de 0,25 ha. <mark style="color:yellow;">Ces données seront intégrées dans ALDO dans une version ultérieure prévue pour 2024.</mark>

</details>

<details>

<summary>Fréquence d'actualisation des données</summary>

ALDO compile des bases de données dont l'actualisation peut dater. Par exemple la base de données Corine Land Cover est mise à jour tous les 6 ans. Si dans la grande majorité des besoins, cela permet de fournir une tendance moyenne de l'état des stocks et des flux sur un territoire, cela ne permet pas de prendre en compte **automatiquement** tous les changements d'envergure plus récents de l'état de votre territoire (incendies, artificialisation, déboisement ou reboisement important, etc.). Dans ce cas, vous pouvez modifier les surfaces d'occupation du sol dans la [configuration-manuelle.md](../configuration/configuration-manuelle.md "mention"). Par exemple, convertir 200 ha de forêts en prairies suite à un incendie.

:new: <mark style="color:yellow;">L'inventaire du CITEPA (voir ci-dessus) permettra de suivre plus finement ce type de surfaces, comme les incendies, à partir de la BDIFF (Base de données Incendies Feux de Forêts de IGN) pour estimer les pertes de biomasse.</mark>

</details>

<details>

<summary>Dynamique du carbone des sols </summary>

ALDO ne permet pas de prendre en compte la dynamique du carbone des sols en l'état actuel. Par exemple, si une surface en culture est devenue boisée avant d'être artificialisée, le flux de carbone associé ne sera pas le même qu'une surface en culture directement artificialisée.

C'est pourquoi il n'est pas possible de consulter sur ALDO les flux engendrés par les changements d'occupation du sol des millésimes Corine Land Cover antérieurs (1990, 2000, ou 2006) et de les comparer avec l'état actuel. Sources : [Variations surfaciques entre 2012 et 2018](../introduction/sources.md#variations-de-surfaces-ha-an).

:new: <mark style="color:yellow;">Le CITEPA (voir ci-dessus) permettra d'intégrer la dynamique du carbone des sols entre plusieurs millésimes de l'inventaire CITEPA.</mark>

</details>

<details>

<summary>Règlementation - décret PCAET</summary>

L'estimation de la séquestration carbone est devenue obligatoire dans le cadre de l'élaboration d'un PCAET (décret le n° 2016-849). ALDO ne traite pas de l'ensemble des questions demandées par le décret. Pour les EPCI concernés, il est important de souligner les limites pour répondre à la [reglementation.md](reglementation.md "mention").

</details>

