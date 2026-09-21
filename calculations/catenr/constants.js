// Constantes de la version « light » de l'outil CAT'ENR intégrée à ALDO.
//
// Source : Outil_CAT_EnR_v5.3.xlsx (ADEME), onglets « 2.PV Caractéristiques »,
// « Listes », « Données ALDO_cinétique » et « Calcul - Carbone ».
// Les noms d'occupation des sols sont ceux de la liste CAT'ENR
// (plage nommée Occupation_des_sols_Hexagone), qui ne recouvre pas exactement
// les stocksId d'ALDO : la correspondance est donnée par ALDO_CORRESPONDANCE.

// Onglet « Listes », colonnes B et C (Occupation des sols / Correspondance ALDO).
// CAT'ENR propose deux entrées de plus qu'ALDO (« sols artificiels enherbés » et
// « Sols nus ») qui sont toutes deux ramenées aux sols artificiels imperméabilisés.
const Occupations = [
  { id: 'cultures', code: 'cult', name: 'Cultures', aldo: 'cultures' },
  { id: 'prairies zones arborées', code: 'prarbo', name: 'Prairies zones arborées', aldo: 'prairies zones arborées' },
  { id: 'prairies zones herbacées', code: 'prherb', name: 'Prairies zones herbacées', aldo: 'prairies zones herbacées' },
  { id: 'prairies zones arbustives', code: 'prarbu', name: 'Prairies zones arbustives', aldo: 'prairies zones arbustives' },
  { id: 'zones humides', code: 'zh', name: 'Zones humides', aldo: 'zones humides' },
  { id: 'vergers', code: 'verg', name: 'Vergers', aldo: 'vergers' },
  { id: 'vignes', code: 'vign', name: 'Vignes', aldo: 'vignes' },
  { id: 'sols artificiels arbustifs', code: 'saarbu', name: 'Sols artificiels arbustifs', aldo: 'sols artificiels arbustifs' },
  { id: 'sols artificiels imperméabilisés', code: 'saimp', name: 'Sols artificiels imperméabilisés', aldo: 'sols artificiels imperméabilisés' },
  { id: 'sols artificiels arborés et buissonants', code: 'saarbo', name: 'Sols artificiels arborés et buissonants', aldo: 'sols artificiels arborés et buissonants' },
  { id: 'forêt mixte', code: 'formix', name: 'Forêt mixte', aldo: 'forêt mixte' },
  { id: 'forêt feuillu', code: 'forfeu', name: 'Forêt feuillu', aldo: 'forêt feuillu' },
  { id: 'forêt conifere', code: 'forcon', name: 'Forêt conifère', aldo: 'forêt conifere' },
  { id: 'forêt peupleraie', code: 'forpeu', name: 'Forêt peupleraie', aldo: 'forêt peupleraie' },
  { id: 'sols artificiels enherbés', code: 'saenh', name: 'Sols artificiels enherbés', aldo: 'sols artificiels imperméabilisés' },
  { id: 'Sols nus', code: 'nus', name: 'Sols nus', aldo: 'sols artificiels imperméabilisés' }
]

// Onglet « Données ALDO_cinétique », plage B18:D32 : nom de flux -> nom de sol.
// Le stock dans les sols est mutualisé entre les sous-types de prairies et de forêts.
const SolNames = {
  'prairies zones arborées': 'prairies',
  'prairies zones herbacées': 'prairies',
  'prairies zones arbustives': 'prairies',
  'forêt mixte': 'forêt',
  'forêt feuillu': 'forêt',
  'forêt conifere': 'forêt',
  'forêt peupleraie': 'forêt'
}

// Colonnes de data/dataByCommune/stocks-zpc.csv correspondant à un nom de sol.
const StocksColumns = {
  cultures: 'cultures',
  prairies: 'prairies',
  forêt: 'forêts',
  'zones humides': 'zones humides',
  vergers: 'vergers',
  vignes: 'vignes',
  'sols artificiels arbustifs': 'sols artificiels enherbés',
  'sols artificiels imperméabilisés': 'sols artificiels imperméabilisés',
  'sols artificiels arborés et buissonants': 'sols artificiels arborés et buissonants'
}

// Onglet « Listes », colonnes H et I : occupation retenue dans le scénario projet
// pessimiste, selon le type de composant. Une valeur absente signifie que le
// scénario pessimiste reprend l'occupation finale du cas le plus probable.
const PessimisticProjectOccupations = {
  'Sol sous panneau': 'Sols nus',
  'Espaces entre les panneaux': 'Sols nus',
  'Emprises artificialisées': 'sols artificiels imperméabilisés',
  'Emprises hors infrastructures': undefined,
  Autre: undefined
}

// Occupation initiale proposée par défaut dans le formulaire. Le tableur laisse
// la colonne vide ; ALDO pré-remplit la valeur la plus courante pour ce type de projet.
const DEFAULT_INITIAL_OCCUPATION = 'prairies zones arborées'

// Onglet « 2.PV Caractéristiques », lignes 48 à 60.
// `inSurfaceCheck` reprend le contrôle de cohérence SOMME(G48:G57)-G57 = F18 :
// seules les emprises situées dans la clôture y participent, la zone OLD étant
// retranchée puisqu'elle recouvre les autres emprises.
const PvRows = [
  {
    id: 'fondations',
    code: 'fo',
    name: 'Espace sous panneaux - fondations des panneaux',
    component: 'Emprises artificialisées',
    finalOccupation: 'sols artificiels imperméabilisés',
    inSurfaceCheck: true
  },
  {
    id: 'surface-projetee',
    code: 'sp',
    name: 'Espace sous panneaux - surface projetée',
    hint: 'Une distinction entre la végétation sous panneau et la végétation dans les emprises libres est faite dans certains scénarios.',
    component: 'Sol sous panneau',
    finalOccupation: 'sols artificiels enherbés',
    inSurfaceCheck: true
  },
  {
    id: 'entre-panneaux',
    code: 'ep',
    name: 'Espace entre les panneaux',
    component: 'Espaces entre les panneaux',
    finalOccupation: 'prairies zones herbacées',
    inSurfaceCheck: true
  },
  {
    id: 'emprises-libres',
    code: 'el',
    name: 'Emprises libres',
    component: 'Emprises hors infrastructures',
    finalOccupation: 'prairies zones herbacées',
    inSurfaceCheck: true
  },
  {
    id: 'voiries-infrastructures',
    code: 'vi',
    name: 'Emprise voiries et infrastructures',
    hint: 'Remplir, au choix, cette ligne ou les 4 suivantes selon les informations disponibles.',
    component: 'Emprises artificialisées',
    finalOccupation: 'sols artificiels imperméabilisés',
    inSurfaceCheck: true
  },
  {
    id: 'voiries-permanentes',
    code: 'vp',
    name: 'Emprise des voiries permanentes',
    hint: 'Les infrastructures temporaires de la phase chantier ne sont pas considérées dans cet onglet.',
    component: 'Emprises artificialisées',
    finalOccupation: 'sols artificiels imperméabilisés',
    child: true,
    inSurfaceCheck: true
  },
  {
    id: 'locaux-techniques',
    code: 'lt',
    name: 'Emprise des locaux techniques',
    component: 'Emprises artificialisées',
    finalOccupation: 'sols artificiels imperméabilisés',
    child: true,
    inSurfaceCheck: true
  },
  {
    id: 'citernes',
    code: 'ci',
    name: 'Emprise des citernes',
    component: 'Emprises artificialisées',
    finalOccupation: 'sols artificiels imperméabilisés',
    child: true,
    inSurfaceCheck: true
  },
  {
    id: 'fondations-clotures',
    code: 'fc',
    name: 'Emprise des fondations des clôtures',
    component: 'Emprises artificialisées',
    finalOccupation: 'sols artificiels imperméabilisés',
    child: true,
    inSurfaceCheck: true
  },
  {
    id: 'old',
    code: 'old',
    name: 'Zone Obligation Légale de débroussaillement (OLD)',
    component: 'Emprises hors infrastructures',
    finalOccupation: 'sols artificiels enherbés',
    inSurfaceCheck: true,
    // retranchée de la somme : la zone OLD recouvre les autres emprises
    subtractedFromSurfaceCheck: true
  },
  {
    id: 'defrichement-hors-old',
    code: 'dh',
    name: 'Défrichement / débroussaillage hors OLD',
    component: 'Emprises hors infrastructures',
    finalOccupation: 'prairies zones herbacées'
  },
  {
    id: 'haies-coupees',
    code: 'hc',
    name: 'Haies coupées',
    hint: 'Associer une surface en ha et une occupation des sols de type forêt ou sol artificiel imperméabilisé selon le type de haie.',
    component: 'Emprises hors infrastructures',
    finalOccupation: 'prairies zones herbacées'
  },
  {
    id: 'surface-sous-gestion',
    code: 'sg',
    name: 'Surface sous gestion (hors OLD)',
    component: 'Emprises hors infrastructures',
    finalOccupation: 'prairies zones herbacées'
  }
]

// Onglet « Calcul - Carbone », colonnes U à Z.
const Scenarios = [
  { id: 'referencePessimiste', group: 'reference', name: 'Référence - Pessimiste' },
  { id: 'referenceProbable', group: 'reference', name: 'Référence - La plus probable' },
  { id: 'referenceOptimiste', group: 'reference', name: 'Référence - Optimiste' },
  { id: 'projetPessimiste', group: 'projet', name: 'Projet - Pessimiste' },
  { id: 'projetProbable', group: 'projet', name: 'Projet - Le plus probable' },
  { id: 'projetOptimiste', group: 'projet', name: 'Projet - Optimiste' }
]

// Onglet « Données ALDO_cinétique », cellule nommée cinétique_litière.
const LITTER_KINETICS = 20

// Nombre d'années du tableau interne de synthèse (onglet « Calcul - Carbone »).
const MAX_YEAR = 50

module.exports = {
  DEFAULT_INITIAL_OCCUPATION,
  Occupations,
  SolNames,
  StocksColumns,
  PessimisticProjectOccupations,
  PvRows,
  Scenarios,
  LITTER_KINETICS,
  MAX_YEAR
}
