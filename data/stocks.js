
// Gets the carbon area density of a given ground type.
function getCarbonDensity (location, groundType) {
  const csvFilePath = './dataByEpci/ground.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  return parseFloat(data[groundType]) || 0
}

// Gets the area in hectares (ha) of a given ground type in a location.
// The ground types Corine Land Cover uses are different from the types used by Aldo,
// so a mapping is used and the sum of ha of all matching CLC types is returned.
// NB: in the lookup the type names for ground data and the more specific biomass data
// are placed on the same level, so some CLC codes are used in two types.
function getArea (location, groundType) {
  if (groundType === 'haies') {
    return getAreaHaies(location)
  } else if (groundType === 'forêt peupleraie') {
    return getAreaPoplars(location)
  }
  // consider making this a separate json file for isolation
  // TODO: make more standardised keys?
  const aldoTypeToClcCodes = {
    cultures: ['211', '212', '213', '241', '242', '243', '244'],
    prairies: ['231', '321', '322', '323'],
    'prairies zones herbacées': ['231', '321'],
    'prairies zones arbustives': ['322'],
    'prairies zones arborées': ['323'],
    forêt: ['311', '312', '313', '324'],
    'forêt feuillu': ['311', '324'],
    'forêt conifere': ['312'],
    'forêt mixte': ['313'],
    vignes: ['221'],
    vergers: ['222', '223'],
    'sols arborés': ['141'], // aka "sols artificiels arborés et buissonants" in stocks_c tab
    'sols artificiels non-arborés': ['111', '112', '121', '122', '123', '124', '131', '132', '133', '142'],
    'sols artificiels imperméabilisés': ['111', '121', '122', '123', '124', '131', '132', '133', '142'],
    'sols artificialisés': ['112'],
    // TODO: ask about logic F39: area sols arbustifs stocks_c tab.
    'zones humides': ['411', '412', '421', '422', '423', '511', '512', '521', '522', '523']
  }
  const clcCodes = aldoTypeToClcCodes[groundType]
  if (!clcCodes) {
    throw new Error(`No CLC code mapping found for ground type '${groundType}'`)
  }
  const csvFilePath = './dataByEpci/clc18.csv'
  const areasByClcType = require(csvFilePath + '.json')
  const areaForSiren = areasByClcType.find(data => data.siren === location.epci)
  let totalArea = 0
  for (const clcCode of clcCodes) {
    const area = areaForSiren[clcCode]
    // TODO: output warnings for codes that aren't in data at all? As opposed to empty value
    if (area) {
      totalArea += parseFloat(area)
    }
  }
  // forests are a bit more complicated
  if (groundType === 'forêt feuillu') {
    totalArea -= getAreaPoplars(location)
  }
  return totalArea
}

function getAreaHaies (location) {
  const csvFilePath = './dataByEpci/surface-haies.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.filter(data => data.siren === location.epci)
  if (data.length > 1) {
    console.log('WARNING: more than one haies surface area for siren: ', location.epci)
  }
  return parseFloat(data[0].area)
}

// TODO: ask why not using IGN for all forest areas
function getAreaPoplars (location) {
  const csvFilePath = './dataByEpci/ign19.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  return parseFloat(data.peupleraies)
}

function getBiomassCarbonDensity (location, groundType) {
  if (groundType === 'forêt peupleraie') {
    return getPoplarBiomassCarbonDensity(location)
  } else if (groundType.startsWith('forêt')) {
    return getForestBiomassCarbonDensity(location, groundType.split(' ')[1])
  }
  const csvFilePath = './dataByEpci/biomass-hors-forets.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  // NB: all stocks are integers, but flux has decimals
  return parseInt(data[groundType], 10) || 0
}

function getForestBiomassCarbonDensity (location, forestType) {
  const csvFilePath = './dataByEpci/biomass-forets.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci && data.type.toLowerCase() === forestType)
  if (!data) {
    throw new Error(`No biomass data found for forest type '${forestType}' and epci '${location.epci}'`)
  }
  return parseFloat(data.stock)
}

function getPoplarBiomassCarbonDensity (location) {
  const csvFilePath = './dataByEpci/biomasse-forets-peupleraies.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  return parseFloat(data?.carbonDensity)
}

// source: CITEPA 2016 in tCO2
function getFranceStocksWoodProducts () {
  return {
    bo: 177419001,
    bi: 258680001
    // TODO: ask about BE, which is present in other places but not these stats
  }
}

function getAnnualFranceWoodProductsHarvest () {
  return getAnnualWoodProductsHarvest({ epci: 'FRANCE' })
}

function getAnnualWoodProductsHarvest (location) {
  const csvFilePath = './dataByEpci/produits-bois.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.filter(data => data.siren === location.epci)
  function getValue (composition, category) {
    const val = data.find((d) => d.composition === composition)[category]
    return parseFloat(val)
  }
  return {
    feuillus: {
      bo: getValue('feuillus', 'recolteBo'),
      bi: getValue('feuillus', 'recolteBi')
    },
    coniferes: {
      bo: getValue('coniferes', 'recolteBo'),
      bi: getValue('coniferes', 'recolteBi')
    }
  }
}

function getForestLitterCarbonDensity (subtype) {
  const subtypes = ['feuillu', 'mixte', 'conifere', 'peupleraie']
  if (subtypes.indexOf(subtype) === -1) {
    throw new Error(`No forest litter carbon density found for forest subtype '${subtype}'`)
  }
  return 9 // TODO: ask follow up on source of this data
}

module.exports = {
  getCarbonDensity,
  getArea,
  getBiomassCarbonDensity,
  getForestBiomassCarbonDensity,
  getFranceStocksWoodProducts,
  getForestLitterCarbonDensity,
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest
}
