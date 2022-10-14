module.exports = {
  GroundTypes: [
    {
      stocksId: 'cultures',
      name: 'Cultures',
      color: 'terre',
      fluxId: 'cult',
      clcCodes: ['211', '212', '213', '241', '242', '243', '244']
    },
    {
      stocksId: 'prairies',
      name: 'Prairies',
      color: 'tournesol',
      clcCodes: ['231', '321', '322', '323'],
      children: ['prairies zones arbustives', 'prairies zones herbacées', 'prairies zones arborées']
    },
    {
      stocksId: 'prairies zones arborées',
      name: 'Prairies zones arborées',
      shortName: 'Arborées',
      parentType: 'prairies',
      fluxId: 'prai',
      altFluxId: 'prai_arbo',
      color: 'tournesol',
      clcCodes: ['323']
    },
    {
      stocksId: 'prairies zones herbacées',
      name: 'Prairies zones herbacées',
      shortName: 'Herbacées',
      parentType: 'prairies',
      fluxId: 'prai',
      altFluxId: 'prai_herb',
      color: 'tournesol',
      clcCodes: ['231', '321']
    },
    {
      stocksId: 'prairies zones arbustives',
      name: 'Prairies zones arbustives',
      shortName: 'Arbustives',
      parentType: 'prairies',
      fluxId: 'prai',
      altFluxId: 'prai_arbu',
      color: 'tournesol',
      clcCodes: ['322']
    },
    {
      stocksId: 'zones humides',
      name: 'Zones humides',
      color: 'cumulus',
      fluxId: 'zh',
      clcCodes: ['411', '412', '421', '422', '423', '511', '512', '521', '522', '523']
    },
    {
      stocksId: 'vergers',
      name: 'Vergers',
      color: 'glycine',
      fluxId: 'verg',
      clcCodes: ['222', '223']
    },
    {
      stocksId: 'vignes',
      name: 'Vignes',
      color: 'tuile',
      fluxId: 'vign',
      clcCodes: ['221']
    },
    {
      stocksId: 'sols artificiels',
      name: 'Sols artificiels',
      color: 'gris',
      children: ['sols artificiels imperméabilisés', 'sols artificiels arbustifs', 'sols artificiels arborés et buissonants']
    },
    {
      stocksId: 'sols artificiels arbustifs',
      name: 'Sols artificiels enherbés et arbustifs',
      shortName: 'Enherbés et arbustifs',
      parentType: 'sols artificiels',
      color: 'gris',
      fluxId: 'art_enh',
      // clcCodes for this and imperméabilisés the same because the area for flux
      // goes through further calculations before being used to calculate flux
      clcCodes: ['111', '112', '121', '122', '123', '124', '131', '132', '133', '142']
    },
    {
      stocksId: 'sols artificiels imperméabilisés',
      name: 'Sols artificiels imperméabilisés',
      shortName: 'Imperméabilisés',
      parentType: 'sols artificiels',
      color: 'gris',
      fluxId: 'art_imp',
      clcCodes: ['111', '112', '121', '122', '123', '124', '131', '132', '133', '142']
    },
    {
      stocksId: 'sols artificiels arborés et buissonants',
      name: 'Sols artificiels arborés',
      shortName: 'Arborés',
      parentType: 'sols artificiels',
      color: 'gris',
      fluxId: 'art_arb',
      clcCodes: ['141']
    },
    {
      stocksId: 'forêts',
      name: 'Forêts',
      color: 'bourgeon',
      fluxId: 'for',
      clcCodes: ['311', '312', '313', '324'],
      children: ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']
    },
    {
      stocksId: 'forêt mixte',
      name: 'Forêt mixte',
      shortName: 'Mixte',
      parentType: 'forêts',
      color: 'bourgeon',
      clcCodes: ['313']
    },
    {
      stocksId: 'forêt feuillu',
      name: 'Forêt feuillu',
      shortName: 'Feuillu',
      parentType: 'forêts',
      color: 'bourgeon',
      // TODO: 324 should be mixte
      clcCodes: ['311', '324']
    },
    {
      stocksId: 'forêt conifere',
      name: 'Forêt conifère',
      shortName: 'Conifère',
      parentType: 'forêts',
      color: 'bourgeon',
      clcCodes: ['312']
    },
    {
      stocksId: 'forêt peupleraie',
      name: 'Forêt peupleraie',
      shortName: 'Peupleraie',
      parentType: 'forêts',
      color: 'bourgeon'
    },
    {
      stocksId: 'produits bois',
      name: 'Produits bois',
      color: 'opera'
    },
    {
      stocksId: 'haies',
      name: 'Haies',
      color: 'emeraude'
    }
  ],
  AgriculturalPractices: [
    {
      name: 'Intégration ou allongement de prairies temporaires dans les rotations de cultures',
      id: 'prairieExtension',
      url: 'allongement_prairies',
      groundType: 'cultures'
    },
    {
      name: 'Intensification modérée des prairies peu productives (hors alpages et estives)',
      id: 'prairieIntensification',
      url: 'intensification_prairies',
      groundType: 'prairies'
    },
    {
      name: 'Agroforesterie en grandes cultures',
      id: 'cropsAgroforestry',
      url: 'agroforestrie_cultures',
      groundType: 'cultures'
    },
    {
      name: 'Agroforesterie en prairies',
      id: 'prairiesAgroforestry',
      url: 'agroforestrie_prairies',
      groundType: 'prairies'
    },
    {
      name: 'Couverts intermédiaires (CIPAN) en grandes cultures',
      id: 'catchCrops',
      url: 'cipan',
      groundType: 'cultures'
    },
    {
      name: 'Haies sur cultures (60 mètres linéaires par ha)',
      id: 'cropsHedges',
      url: 'haies_cultures',
      groundType: 'cultures'
    },
    {
      name: 'Haies sur prairies (100 mètres linéaires par ha)',
      id: 'prairiesHedges',
      url: 'haies_prairies',
      groundType: 'prairies'
    },
    {
      name: 'Bandes enherbées',
      id: 'grassyStrips',
      url: 'bandes_enherbees',
      groundType: 'cultures'
    },
    {
      name: 'Couverts intercalaires en vignes',
      id: 'vineyardsInterCoverCropping',
      url: 'couverts_vignes',
      groundType: 'vignes'
    },
    {
      name: 'Couverts intercalaires en vergers',
      id: 'orchardsInterCoverCropping',
      url: 'couverts_vergers',
      groundType: 'vergers'
    }
  ],
  Colours: {
    terre: { // orange
      main: '#E4794A',
      950: '#fee9e5'
    },
    bourgeon: { // green
      main: '#68A532',
      950: '#C9FCAC'
    },
    glycine: { // purple
      main: '#A55A80',
      950: '#FEE7FC'
    },
    opera: { // brown
      main: '#BD987A',
      950: '#f7ece4'
    },
    caramel: { // brown
      main: '#C08C65',
      950: '#F7EBE5'
    },
    ecume: { // blue
      main: '#465F9D',
      950: '#E9EDFE'
    },
    verveine: { // green
      main: '#B7A73F',
      950: '#fceeac'
    },
    emeraude: { // green
      main: '#00A95F',
      950: '#c3fad5'
    },
    macaron: { // pink
      main: '#E18B76',
      950: '#fee9e6'
    },
    menthe: { // green
      main: '#009081',
      950: '#bafaee'
    },
    tournesol: { // yellow
      main: '#C8AA39',
      950: '#feecc2'
    },
    archipel: { // green
      main: '#009099',
      950: '#c7f6fc'
    },
    tuile: { // pink
      main: '#CE614A',
      950: '#fee9e7'
    },
    cumulus: { // blue
      main: '#417DC4',
      950: '#e6eefe'
    },
    moutard: { // yellow
      main: '#C3992A',
      950: '#feebd0'
    },
    gris: { // grey
      main: '#7b7b7b',
      950: '#eeeeee'
    }
  }
}
