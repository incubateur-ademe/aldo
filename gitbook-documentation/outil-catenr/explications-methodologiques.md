# 📊 Explications méthodologiques

#### Stocks de carbone à l'état initial

Les stocks de carbone à l'état initial sont calculés à partir des données de stocks de l'outil ALDO en distinguant les 3 compartiments (sol, biomasse et litière) :

* **Les stocks de carbone dans les sols** sont ceux de l'occupation initiale définie par l'utilisateur.
* **Les stocks de carbone associés à la biomasse** sont estimés en tenant compte de l'âge de l'écosystème et du stock associé à l'occupation initiale.&#x20;
* Le stock lié à la biomasse est proportionnel à l'âge d'équilibre si la maturité des sols n'a pas été atteinte.

_Exemple : la durée de stockage de référence de la biomasse en forêt est de 40 ans. En faisant l'hypothèse conservatrice simplificatrice que le stockage est constant sur cette durée, une forêt âgée de 10 ans aura atteint 25 % du stock de référence et elle continuera à stocker du carbone pendant 30 ans._

#### Évolution des stocks de carbone par occupation des sols

* **Pour l'hexagone :** les variations de stocks de carbone sont calculées à partir des flux de l'outil ALDO qui associent un flux à chaque changement d'occupation des sols en tenant compte du temps nécessaire à l'atteinte d'un nouvel équilibre lorsque des durées de référence ont été utilisées. Les flux ont lieu sur toute cette durée de référence.

#### Mise en place de pratiques agricoles stockantes

Pour l'hexagone, des pratiques agricoles stockant du carbone ont été retenues par défaut dans le **scénario optimiste**. Ces pratiques sont mises en place sur les cultures, prairies, vergers et vignes selon la répartition suivante :

| Cultures / usages             | Pratiques mises en place                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Cultures**                  | <p>Semis direct continu<br>Couverts intermédiaires (CIPAN) en grandes cultures<br>Agroforesterie en grandes cultures</p> |
| **Prairies zones herbacées**  | Agroforesterie en prairies                                                                                               |
| **Prairies zones arbustives** | Agroforesterie en prairies                                                                                               |
| **Prairies zones arborées**   | /                                                                                                                        |
| **Vergers**                   | Couverts intercalaires en vergers                                                                                        |
| **Vignes**                    | Couverts intercalaires en vignes                                                                                         |

> Ces pratiques et les flux de carbone associés sont issus des données ALDO qui proviennent elles-mêmes de l'étude INRAE _"Quelle contribution de l'agriculture française à la réduction des émissions de gaz à effet de serre ?"_. Elles sont appliquées sur une durée de 20 ans.

***

#### Zones humides associées à un autre usage

Les données de flux de carbone associés aux occupations en zone humide sont calculées :

* En associant l'occupation des sols initiale définie en plus de la zone humide sur le réservoir biomasse et litière pour le calcul des flux ;
* En attribuant les flux liés au passage d'un état initial zone humide à l'état final défini par l'utilisateur pour le réservoir sol.

_Exemple : pour une prairie arborée en zone humide à l'état initial passant à une zone imperméabilisée dans le scénario projet, les flux associés à ce changement d'affectation des terres sont ceux associés au passage prairie arborée --> zone imperméabilisée pour le sol (Walcker, 2018)._

**Le devenir de la zone humide varie selon les scénarios considérés :**

* Dans les scénarios pessimistes, les zones humides ne se maintiennent pas ;
* Dans les scénarios les plus probables et optimistes, la zone humide se maintient et l'état initial n'est pas modifié artificiellement.

***

## Scénarios et hypothèses

Les variations des stocks sont estimées pour **6 scénarios** : **3 scénarios** correspondant à la situation de **référence** dans laquelle le projet n'est pas réalisé et **3 scénarios** correspondant aux situations dans laquelle le **projet** est mis en place.

Pour la situation de référence et la situation projet, **3 hypothèses** d'occupations des sols sont considérées :

* **Une hypothèse pessimiste :** correspondant à un non-maintien de la végétation et des bonnes pratiques (sous l'effet du changement climatique par exemple) ;
* **Une hypothèse la plus probable** ;
* **Une hypothèse optimiste :** dans laquelle la végétation se maintient et évolue spontanément et dans laquelle de bonnes pratiques sont mises en place.

<figure><img src="../.gitbook/assets/image (12).png" alt=""><figcaption></figcaption></figure>

#### Évolution des stocks de carbone selon les scénarios considérés (tCO2e)

Pour chacun des scénarios, les hypothèses concernant les occupations et les modes de gestion des sols sont détaillées dans les tableaux ci-dessous.

***

### Scénario de référence

<table data-header-hidden><thead><tr><th></th><th></th><th></th><th></th><th></th><th></th></tr></thead><tbody><tr><td>Occupation des sols initiale</td><td>Évolution : Hypothèse pessimiste</td><td>Évolution : Cas le plus probable</td><td>Évolution : Hypothèse optimiste <em>(évolution naturelle des milieux, non entretenus)</em></td><td>Mode de gestion des sols : Cas le plus probable</td><td>Mode de gestion des sols : Hypothèse optimiste</td></tr><tr><td><strong>Cultures</strong></td><td rowspan="15"><em>Par défaut : cas le plus probable</em><br><br>Autre cas à renseigner par l'utilisateur selon les dynamiques locales et l'évolution possible sous l'effet du changement climatique</td><td rowspan="15">Par défaut, <strong>maintien dans l'état actuel</strong>, à affiner par l'utilisateur en fonction des dynamiques locales (présence de friches non entretenues, urbanisation, etc.)</td><td>Cultures</td><td>-</td><td rowspan="4">Pratiques agricoles stockantes</td></tr><tr><td><strong>Prairies zones herbacées</strong></td><td>Prairies zones arborées</td><td>-</td></tr><tr><td><strong>Prairies zones arbustives</strong></td><td>Prairies zones arborées</td><td>-</td></tr><tr><td><strong>Prairies zones arborées</strong></td><td>Prairies zones arborées</td><td>-</td></tr><tr><td><strong>Forêt de feuillus</strong></td><td>Forêt de feuillus</td><td rowspan="5">Utilisation des modes de gestion moyens par zone sylvicole <em>(intégrés à l'outil ALDO)</em></td><td rowspan="5">Utilisation des modes de gestion moyens par zone sylvicole <em>(intégrés à l'outil ALDO)</em></td></tr><tr><td><strong>Forêts mixtes</strong></td><td>Forêt de conifères</td></tr><tr><td><strong>Forêt de conifères</strong></td><td>Forêt de conifères</td></tr><tr><td><strong>Forêt de peupleraies</strong></td><td>Forêt de peupleraies</td></tr><tr><td><strong>Zone humide</strong></td><td>Zone humide</td></tr><tr><td><strong>Vergers</strong></td><td>Vergers</td><td>-</td><td rowspan="2">Pratiques agricoles stockantes</td></tr><tr><td><strong>Vignes</strong></td><td>Vignes</td><td>-</td></tr><tr><td><strong>Sols artificiels imperméabilisés</strong></td><td>Sols artificiels imperméabilisés</td><td>-</td><td>-</td></tr><tr><td><strong>Sols artificiels arbustifs</strong></td><td>Sols artificiels arbustifs</td><td>-</td><td>-</td></tr><tr><td><strong>Sols artificiels arborés et buissonnants</strong></td><td>Sols artificiels arborés et buissonnants</td><td>-</td><td>-</td></tr><tr><td><strong>Haies associées aux espaces agricoles</strong></td><td>Haies associées aux espaces agricoles</td><td>-</td><td>-</td></tr></tbody></table>

***

### Scénario projet

#### Éléments construits

<table><thead><tr><th>Constituants de l'installation</th><th>État peut traverser</th><th>État final : Hypothèse pessimiste</th><th>État final : Hypothèse optimiste</th></tr></thead><tbody><tr><td><strong>Sols sous panneaux</strong></td><td rowspan="2">Sols nus</td><td>Sols nus</td><td rowspan="2">Par défaut : sols artificiels arborés.<br>À affiner par l'utilisateur (paysagement, etc.)</td></tr><tr><td><strong>Sols en inter-rangs et sous ombrières</strong></td><td>Sols artificiels extensifs</td></tr><tr><td><strong>Structures de support, des panneaux / fondations des cabanes</strong></td><td colspan="3">Surfaces artificielles imperméabilisées</td></tr><tr><td><strong>Clôtures</strong></td><td colspan="3">Surfaces artificielles imperméabilisées</td></tr><tr><td><strong>Chemin d'accès et voirie</strong></td><td colspan="3">Surfaces artificielles imperméabilisées</td></tr><tr><td><strong>Plateforme permanente</strong></td><td colspan="3">Surfaces artificielles imperméabilisées</td></tr></tbody></table>

#### Autres espaces dans l'emprise de la centrale

<table><thead><tr><th>Occupation des sols initiale</th><th>Mode de gestion : Hypothèse pessimiste</th><th>Mode de gestion : Hypothèse optimiste</th></tr></thead><tbody><tr><td><strong>Cultures</strong></td><td>-</td><td rowspan="4">Pratiques agricoles stockantes</td></tr><tr><td><strong>Prairies zones herbacées</strong></td><td>-</td></tr><tr><td><strong>Prairies zones arbustives</strong></td><td>-</td></tr><tr><td><strong>Prairies zones arborées</strong></td><td>-</td></tr><tr><td><strong>Forêt de feuillus</strong></td><td rowspan="5">Utilisation des modes de gestion moyens par zone sylvicole <em>(intégrés à l'outil ALDO)</em></td><td rowspan="5">Utilisation des modes de gestion moyens par zone sylvicole <em>(intégrés à l'outil ALDO)</em></td></tr><tr><td><strong>Forêts mixtes</strong></td></tr><tr><td><strong>Forêt de conifères</strong></td></tr><tr><td><strong>Forêt de peupleraies</strong></td></tr><tr><td><strong>Zone humide</strong></td></tr><tr><td><strong>Vergers</strong></td><td>-</td><td rowspan="2">Pratiques agricoles stockantes</td></tr><tr><td><strong>Vignes</strong></td><td>-</td></tr><tr><td><strong>Sols artificiels imperméabilisés</strong></td><td>-</td><td>-</td></tr><tr><td><strong>Sols artificiels arbustifs</strong></td><td>-</td><td>-</td></tr><tr><td><strong>Sols artificiels arborés et buissonnants</strong></td><td>-</td><td>-</td></tr><tr><td><strong>Haies associées aux espaces agricoles</strong></td><td>-</td><td>-</td></tr></tbody></table>

***

#### Zoom sur les cinétiques de stockage/déstockage utilisées pour le calcul

Pour chaque flux, une cinétique de stockage/déstockage est définie :

* **Pour le sol de l'hexagone :** la cinétique de stockage est celle de l'outil ALDO issue de l'étude Arrouays et al. _« Stocker du carbone dans le sol agricole de France » (2002)_. Dans le cas des sols artificiels imperméabilisés, le flux est considéré comme immédiat car la cinétique est inférieure à 20 ans dans ALDO. Le déstockage est considéré comme immédiat.
* **Dans les outre-mer :** la cinétique de l'hexagone a été conservée pour l'ensemble des occupations des sols, excepté pour les mangroves plus anciennes en Guyane (Walcker, 2018).
* **Pour la biomasse :** les flux de déstockage sont considérés comme immédiats. Pour le stockage dans les buissons et arbres en prairie et milieux artificiels, la durée considérée est de 20 ans. Dans les forêts, une cinétique de 30 ans a été considérée, elle correspond à la durée utilisée dans le tableur carbone. Cette donnée peut être modifiée dans l'onglet masqué _« Données ALDO\_Cinétique »_ en s'appuyant sur la méthode du tableur carbone.
* **L'ensemble des cinétiques utilisées** est détaillé dans l'onglet masqué _« Données ALDO\_cinétique »_. Ces hypothèses ont été sélectionnées afin de favoriser l'absence de déstockage sur la compensation, en lien avec la démarche ERC.
