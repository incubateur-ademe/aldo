module.exports = {
  GroundTypes: [
    {
      stocksId: 'cultures',
      name: 'Cultures',
      color: 'terre'
    },
    {
      stocksId: 'prairies',
      name: 'Prairies',
      color: 'tournesol'
    },
    {
      stocksId: 'prairies zones arborées',
      name: 'Prairies zones arborées',
      shortName: 'Arborées',
      parentType: 'prairies',
      color: 'tournesol'
    },
    {
      stocksId: 'prairies zones herbacées',
      name: 'Prairies zones herbacées',
      shortName: 'Herbacées',
      parentType: 'prairies',
      color: 'tournesol'
    },
    {
      stocksId: 'prairies zones arbustives',
      name: 'Prairies zones arbustives',
      shortName: 'Arbustives',
      parentType: 'prairies',
      color: 'tournesol'
    },
    {
      stocksId: 'zones humides',
      name: 'Zones humides',
      color: 'cumulus'
    },
    {
      stocksId: 'vergers',
      name: 'Vergers',
      color: 'glycine'
    },
    {
      stocksId: 'vignes',
      name: 'Vignes',
      color: 'tuile'
    },
    {
      stocksId: 'sols artificiels',
      name: 'Sols artificiels',
      color: 'gris'
    },
    {
      stocksId: 'sols artificiels imperméabilisés',
      name: 'Sols artificiels imperméabilisés',
      parentType: 'sols artificiels',
      color: 'gris'
    },
    {
      stocksId: 'sols artificiels arbustifs',
      name: 'Sols artificiels arbustifs',
      parentType: 'sols artificiels',
      color: 'gris'
    },
    {
      stocksId: 'sols artificiels arborés et buissonants',
      name: 'Sols artificiels arborés et buissonants',
      parentType: 'sols artificiels',
      color: 'gris'
    },
    {
      stocksId: 'forêts',
      name: 'Forêts',
      color: 'bourgeon'
    },
    {
      stocksId: 'forêt mixte',
      name: 'Forêt mixte',
      shortName: 'Mixte',
      parentType: 'forêts',
      color: 'bourgeon'
    },
    {
      stocksId: 'forêt feuillu',
      name: 'Forêt feuillu',
      shortName: 'Feuillu',
      parentType: 'forêts',
      color: 'bourgeon'
    },
    {
      stocksId: 'forêt conifere',
      name: 'Forêt conifère',
      shortName: 'Conifère',
      parentType: 'forêts',
      color: 'bourgeon'
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
      color: 'moutard'
    }
  ],
  Colours: {
    bourgeon: { // green
      main: '#68A532',
      950: '#C9FCAC'
    },
    ecume: { // blue
      main: '#465F9D',
      950: '#E9EDFE'
    },
    glycine: { // purple
      main: '#A55A80',
      950: '#FEE7FC'
    },
    caramel: { // brown
      main: '#C08C65',
      950: '#F7EBE5'
    },
    verveine: { // green
      main: '#B7A73F',
      950: '#fceeac'
    },
    terre: { // orange
      main: '#E4794A',
      950: '#fee9e5'
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
    opera: { // brown
      main: '#BD987A',
      950: '#f7ece4'
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
