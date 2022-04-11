const {
  getArea: getAreaData,
  getCarbonDensity,
  getBiomassCarbonDensity,
  getForestLitterCarbonDensity
} = require('../../data')
const { getStocksWoodProducts } = require('./woodProducts')

function getArea (location, key, overrides) {
  if (overrides && (overrides[key] || overrides[key] === 0)) {
    return overrides[key]
  } else {
    return getAreaData(location, key)
  }
}

function getStocksByKeyword (location, keyword, options) {
  const area = getArea(location, keyword, options.area)
  const groundDensity = getCarbonDensity(location, options.groundKeyword || keyword)
  const groundStock = groundDensity * area
  const biomassDensity = getBiomassCarbonDensity(location, keyword)
  const biomassStock = biomassDensity * area
  const stocks = {
    stock: groundStock + biomassStock,
    area,
    groundStock,
    biomassStock,
    groundDensity,
    biomassDensity,
    totalDensity: groundDensity + biomassDensity
  }
  if (options.getLitter) {
    const forestLitterDensity = getForestLitterCarbonDensity(keyword.replace('forêt ', ''))
    stocks.forestLitterDensity = forestLitterDensity
    stocks.totalDensity += forestLitterDensity
    stocks.forestLitterStock = forestLitterDensity * area
    stocks.stock += stocks.forestLitterStock
  }
  return stocks
}

function getSubStocksByKeyword (location, keyword, parent, options) {
  options = JSON.parse(JSON.stringify(options))
  options.groundKeyword = parent
  const stocks = getStocksByKeyword(location, keyword, options)
  stocks.parent = parent
  return stocks
}

function getStocksPrairies (subStocks) {
  const stocks = {
    stock: 0,
    area: 0,
    groundStock: 0,
    biomassStock: 0,
    forestLitterStock: 0
  }
  for (const subType of Object.keys(subStocks)) {
    stocks.stock += subStocks[subType].stock
    stocks.area += subStocks[subType].area
    stocks.groundStock += subStocks[subType].groundStock
    stocks.biomassStock += subStocks[subType].biomassStock
    if (subStocks[subType].forestLitterStock) {
      stocks.forestLitterStock += subStocks[subType].forestLitterStock
    }
  }
  return stocks
}

function getStocksSolsArtificiels (location, options) {
  // there are three different types of arificial ground to consider:
  // * impermeable
  // * with trees
  // * with other greenery (shrubbery, grass etc)

  // start by estimating the area taken by each
  const areaWithoutTrees = getArea(location, 'sols artificiels non-arborés', options.area)
  const areaWithTrees = getArea(location, 'sols arborés', options.area)
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

function getStocksHaies (location, options) {
  // TODO: ask more about this calculation - reusing forest carbon density?
  const carbonDensity = getBiomassCarbonDensity(location, 'forêt mixte')
  const area = getArea(location, 'haies', options.area)
  const stock = carbonDensity * area
  return {
    stock,
    area,
    biomassDensity: carbonDensity,
    groundDensity: 0,
    biomassStock: stock,
    totalDensity: carbonDensity
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
  options = options || {}
  const stocks = {
    cultures: getStocksByKeyword(location, 'cultures', options),
    'zones humides': getStocksByKeyword(location, 'zones humides', options),
    vergers: getStocksByKeyword(location, 'vergers', options),
    vignes: getStocksByKeyword(location, 'vignes', options),
    'sols artificiels': getStocksSolsArtificiels(location, options),
    'produits bois': getStocksWoodProducts(originalLocation, options?.woodCalculation, options),
    haies: getStocksHaies(location, options)
  }

  // extra steps for ground types that are grouped together
  // prairies
  const prairieChildren = ['prairies zones arbustives', 'prairies zones herbacées', 'prairies zones arborées']
  const prairiesSubtypes = {}
  prairieChildren.forEach((c) => {
    prairiesSubtypes[c] = getSubStocksByKeyword(location, c, 'prairies', options)
  })
  Object.assign(stocks, prairiesSubtypes)
  stocks.prairies = getStocksPrairies(prairiesSubtypes)
  stocks.prairies.children = prairieChildren
  // forests
  const forestChildren = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']
  const forestSubtypes = {}
  options.getLitter = true
  forestChildren.forEach((c) => {
    forestSubtypes[c] = getSubStocksByKeyword(location, c, 'forêts', options)
  })
  Object.assign(stocks, forestSubtypes)
  stocks.forêts = getStocksPrairies(forestSubtypes)
  stocks.forêts.children = forestChildren

  // extra data prep for display - TODO: consider whether this is better handled by the handler
  // -- percentages by level 1 ground type
  const parentTypes = Object.keys(stocks).filter((s) => !stocks[s].parent)
  const stocksTotal = parentTypes.reduce((a, b) => a + stocks[b].stock, 0)
  for (const key of parentTypes) {
    stocks[key].stockPercentage = asPercentage(stocks[key].stock, stocksTotal)
  }
  // -- percentage stock by reservoir
  const groundStock = parentTypes.reduce((acc, cur) => acc + (stocks[cur].groundStock || 0), 0)
  const biomassStock = parentTypes.reduce((acc, cur) => acc + (stocks[cur].biomassStock || 0), 0)
  const forestLitterStock = parentTypes.reduce((acc, cur) => acc + (stocks[cur].forestLitterStock || 0), 0)
  stocks.percentageByReservoir = {
    'Sol (30 cm)': asPercentage(groundStock, stocksTotal),
    'Biomasse sur pied': asPercentage(biomassStock, stocksTotal),
    Litière: asPercentage(forestLitterStock, stocksTotal),
    'Matériaux bois': asPercentage(stocks['produits bois'].stock, stocksTotal)
  }
  // -- density per level 2 ground type
  stocks.byDensity = {}
  Object.keys(stocks).forEach(key => {
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
