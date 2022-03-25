const { getArea, getCarbonDensity, getBiomassCarbonDensity, getPopulationTotal, getFranceStocksWoodProducts, epciList, getForestLitterCarbonDensity } = require('../../data')

function getStocksByKeyword (location, keyword) {
  const area = getArea(location, keyword)
  const groundDensity = getCarbonDensity(location, keyword)
  const groundStock = groundDensity * area
  const biomassDensity = getBiomassCarbonDensity(location, keyword)
  const biomassStock = biomassDensity * area
  return {
    stock: groundStock + biomassStock,
    area,
    groundStock,
    biomassStock,
    totalDensity: groundDensity + biomassDensity
  }
}

function getStocksPrairies (location) {
  const groundCarbonType = 'prairies'
  const biomassTypes = [
    'prairies zones arborées',
    'prairies zones herbacées',
    'prairies zones arbustives'
  ]
  let area = 0
  let groundStock = 0
  let biomassStock = 0
  const densities = {}
  for (const biomassType of biomassTypes) {
    const subarea = getArea(location, biomassType)
    const groundDensity = getCarbonDensity(location, groundCarbonType)
    groundStock += groundDensity * subarea
    const biomassDensity = getBiomassCarbonDensity(location, biomassType)
    biomassStock += biomassDensity * subarea
    area += subarea
    densities[biomassType] = groundDensity + biomassDensity
  }
  return {
    stock: groundStock + biomassStock,
    area,
    groundStock,
    biomassStock,
    densities
  }
}

function getStocksSolsArtificiels (location) {
  // there are three different types of arificial ground to consider:
  // * impermeable
  // * with trees
  // * with other greenery (shrubbery, grass etc)

  // start by estimating the area taken by each
  const areaWithoutTrees = getArea(location, 'sols artificiels non-arborés')
  const areaWithTrees = getArea(location, 'sols arborés')
  const totalArea = areaWithoutTrees + areaWithTrees

  // TODO: ask are there sources to cite for these estimates?
  const estimatedPortionImpermeable = 0.8
  const estimatedPortionGreen = 0.2

  // TODO: ask why proportion of areaWithTrees in both cases is important
  let areaImpermeable = 0
  if (areaWithTrees < 0.2 * totalArea) {
    areaImpermeable = estimatedPortionImpermeable * totalArea
  } else {
    // TODO: ask why subtracting areaWithTrees here
    areaImpermeable = areaWithoutTrees - areaWithTrees
  }

  let areaShrubby = 0
  if (areaWithTrees < 0.2 * (areaImpermeable + areaWithTrees)) {
    areaShrubby = estimatedPortionGreen * (areaWithoutTrees + areaWithTrees) - areaWithTrees
  }

  let groundStock = 0
  let biomassStock = 0
  const densities = {}

  let groundDensity = getCarbonDensity(location, 'sols artificiels imperméabilisés')
  groundStock += groundDensity * areaImpermeable
  let biomassDensity = getBiomassCarbonDensity(location, 'sols artificiels imperméabilisés')
  biomassStock += biomassDensity * areaImpermeable
  densities['sols artificiels imperméabilisés'] = groundDensity + biomassDensity

  groundDensity = getCarbonDensity(location, 'sols artificiels enherbés')
  groundStock += groundDensity * areaShrubby
  biomassDensity = getBiomassCarbonDensity(location, 'sols artificiels arbustifs')
  biomassStock += biomassDensity * areaShrubby
  densities['sols artificiels arbustifs'] = groundDensity + biomassDensity

  groundDensity = getCarbonDensity(location, 'sols artificiels arborés et buissonants')
  groundStock += groundDensity * areaWithTrees
  biomassDensity = getBiomassCarbonDensity(location, 'sols artificiels arborés et buissonants')
  biomassStock += biomassDensity * areaWithTrees
  densities['sols artificiels arborés et buissonants'] = groundDensity + biomassDensity

  return {
    stock: groundStock + biomassStock,
    area: totalArea,
    groundStock,
    biomassStock,
    densities
  }
}

function getStocksHaies (location) {
  // TODO: ask more about this calculation - reusing forest carbon density?
  const carbonDensity = getBiomassCarbonDensity(location, 'forêt mixte')
  const area = getArea(location, 'haies')
  const stock = carbonDensity * area
  return {
    stock,
    area,
    biomassStock: stock,
    totalDensity: carbonDensity
  }
}

function getStocksForests (location) {
  const subtypes = ['forêt feuillu', 'forêt conifere', 'forêt mixte', 'forêt peupleraie']
  let groundStock = 0
  let biomassStock = 0
  let forestLitterStock = 0
  let area = 0
  const groundDensity = getCarbonDensity(location, 'forêts')
  let biomassDensity = 0
  let forestLitterDensity = 0
  const densities = {}
  for (const subtype of subtypes) {
    const subarea = getArea(location, subtype)
    groundStock += groundDensity * subarea
    const subtypeBiomassDensity = getBiomassCarbonDensity(location, subtype)
    biomassStock += subtypeBiomassDensity * subarea
    biomassDensity += subtypeBiomassDensity
    // TODO: standardise keys across functions (so don't have to run replace on subtype here)
    const subtypeForestLitterDensity = getForestLitterCarbonDensity(subtype.replace('forêt ', ''))
    forestLitterStock += subtypeForestLitterDensity * subarea
    forestLitterDensity += subtypeForestLitterDensity
    area += subarea
    densities[subtype] = groundDensity + subtypeBiomassDensity + subtypeForestLitterDensity
  }
  return {
    stock: groundStock + biomassStock + forestLitterStock,
    area,
    groundStock,
    biomassStock,
    forestLitterStock,
    densities
  }
}

function co2ToCarbon (co2) {
  return co2 * 12 / 44
}

function getStocksWoodProducts (location, calculationMethod) {
  if (calculationMethod === 'consommation') {
    const popTotal = getPopulationTotal(epciList())
    const epciPop = location.epci.populationTotale
    const proportion = epciPop / popTotal
    const franceStocks = getFranceStocksWoodProducts()
    return {
      stock: co2ToCarbon((franceStocks.bi + franceStocks.bo) * proportion)
    }
  }
}

function asPercentage (value, total) {
  return Math.round(value / total * 1000) / 10
}

// TODO: put in check for if the locations given are valid and findable?
// Or maybe put this error throwing at the lowest level and let them bubble up
function getStocks (location, options) {
  const originalLocation = location
  location = { epci: location.epci.code } // TODO: change the other APIs to use whole EPCI object like stocks wood products?
  const stocks = {
    cultures: getStocksByKeyword(location, 'cultures'),
    prairies: getStocksPrairies(location),
    'zones humides': getStocksByKeyword(location, 'zones humides'),
    vergers: getStocksByKeyword(location, 'vergers'),
    vignes: getStocksByKeyword(location, 'vignes'),
    'sols artificiels': getStocksSolsArtificiels(location),
    'produits bois': getStocksWoodProducts(originalLocation, options?.woodCalculation || 'consommation'),
    forêts: getStocksForests(location),
    haies: getStocksHaies(location)
  }
  const groundTypes = Object.keys(stocks)
  const stocksTotal = Object.values(stocks).reduce((a, b) => a + b.stock, 0)
  for (const key of Object.keys(stocks)) {
    stocks[key].stockPercentage = asPercentage(stocks[key].stock, stocksTotal)
  }
  const groundStock = Object.values(stocks).reduce((acc, cur) => acc + (cur.groundStock || 0), 0)
  const biomassStock = Object.values(stocks).reduce((acc, cur) => acc + (cur.biomassStock || 0), 0)
  const forestLitterStock = Object.values(stocks).reduce((acc, cur) => acc + (cur.forestLitterStock || 0), 0)
  stocks.percentageByReservoir = {
    'Sol (30 cm)': asPercentage(groundStock, stocksTotal),
    'Biomasse sur pied': asPercentage(biomassStock, stocksTotal),
    Litière: asPercentage(forestLitterStock, stocksTotal),
    'Matériaux bois': asPercentage(stocks['produits bois'].stock, stocksTotal)
  }
  stocks.byDensity = {}
  groundTypes.forEach(key => {
    if (key !== 'produits bois' && stocks[key].hasOwnProperty('totalDensity')) {
      stocks.byDensity[key] = stocks[key].totalDensity || 0
    } else if (stocks[key].densities) {
      Object.assign(stocks.byDensity, stocks[key].densities)
    }
  })
  return stocks
}

module.exports = {
  getStocks
}
