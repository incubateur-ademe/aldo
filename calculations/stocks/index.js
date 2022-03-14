const { getArea, getCarbonDensity, getBiomassCarbonDensity, getPopulationTotal, getFranceStocksWoodProducts, epciList, getForestLitterCarbonDensity } = require('../../data')

async function getStocksByKeyword (location, keyword) {
  const area = await getArea(location, keyword)
  const groundDensity = await getCarbonDensity(location, keyword)
  const groundStock = groundDensity * area
  const biomassDensity = await getBiomassCarbonDensity(location, keyword)
  const biomassStock = biomassDensity * area
  return {
    stock: groundStock + biomassStock,
    area,
    groundStock,
    biomassStock,
    totalDensity: groundDensity + biomassDensity
  }
}

async function getStocksPrairies (location) {
  const groundCarbonType = 'prairies'
  const biomassTypes = [
    'prairies zones arborées',
    'prairies zones herbacées',
    'prairies zones arbustives'
  ]
  let area = 0
  let groundStock = 0
  let biomassStock = 0
  let totalDensity = 0
  for (const biomassType of biomassTypes) {
    const subarea = await getArea(location, biomassType)
    const groundDensity = await getCarbonDensity(location, groundCarbonType)
    groundStock += groundDensity * subarea
    const biomassDensity = await getBiomassCarbonDensity(location, biomassType)
    biomassStock += biomassDensity * subarea
    area += subarea
    totalDensity += groundDensity + biomassDensity
  }
  return {
    stock: groundStock + biomassStock,
    area,
    groundStock,
    biomassStock,
    totalDensity
  }
}

async function getStocksSolsArtificiels (location) {
  // there are three different types of arificial ground to consider:
  // * impermeable
  // * with trees
  // * with other greenery (shrubbery, grass etc)

  // start by estimating the area taken by each
  const areaWithoutTrees = await getArea(location, 'sols artificiels non-arborés')
  const areaWithTrees = await getArea(location, 'sols arborés')
  const totalArea = areaWithoutTrees + areaWithTrees

  // TODO: are there sources to cite for these estimates?
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
    // TODO: ask why areaWithTrees included when running the % estimate and then subtracted,
    // instead of just leaving it out
    areaShrubby = estimatedPortionGreen * (areaWithoutTrees + areaWithTrees) - areaWithTrees
  }

  let groundStock = 0
  let biomassStock = 0
  let totalDensity = 0

  let groundDensity = await getCarbonDensity(location, 'sols artificiels imperméabilisés')
  groundStock += groundDensity * areaImpermeable
  let biomassDensity = await getBiomassCarbonDensity(location, 'sols artificiels imperméabilisés')
  biomassStock += biomassDensity * areaImpermeable
  totalDensity += groundDensity + biomassDensity

  groundDensity = await getCarbonDensity(location, 'sols artificiels enherbés')
  groundStock += groundDensity * areaShrubby
  biomassDensity = await getBiomassCarbonDensity(location, 'sols artificiels arbustifs')
  biomassStock += biomassDensity * areaShrubby
  totalDensity += groundDensity + biomassDensity

  groundDensity = await getCarbonDensity(location, 'sols artificiels arborés et buissonants')
  groundStock += groundDensity * areaWithTrees
  biomassDensity = await getBiomassCarbonDensity(location, 'sols artificiels arborés et buissonants')
  biomassStock += biomassDensity * areaWithTrees
  totalDensity += groundDensity + biomassDensity

  return {
    stock: groundStock + biomassStock,
    area: totalArea,
    groundStock,
    biomassStock,
    totalDensity
  }
}

async function getStocksHaies (location) {
  // TODO: ask more about this calculation - reusing forest carbon density?
  const carbonDensity = await getBiomassCarbonDensity(location, 'forêt mixte')
  const area = await getArea(location, 'haies')
  const stock = carbonDensity * area
  return {
    stock,
    area,
    biomassStock: stock,
    totalDensity: carbonDensity
  }
}

async function getStocksForests (location) {
  const subtypes = ['forêt feuillu', 'forêt conifere', 'forêt mixte', 'forêt peupleraie']
  let groundStock = 0
  let biomassStock = 0
  let forestLitterStock = 0
  let area = 0
  const forestGroundDensity = await getCarbonDensity(location, 'forêts')
  const groundDensity = forestGroundDensity
  let biomassDensity = 0
  let forestLitterDensity = 0
  for (let subtype of subtypes) {
    const subarea = await getArea(location, subtype)
    groundStock += forestGroundDensity * subarea
    const subtypeBiomassDensity = await getBiomassCarbonDensity(location, subtype)
    biomassStock += subtypeBiomassDensity * subarea
    biomassDensity += subtypeBiomassDensity
    subtype = subtype.replace('forêt ', '') // TODO: standardise keys across functions
    const subtypeForestLitterDensity = await getForestLitterCarbonDensity(subtype)
    forestLitterStock += subtypeForestLitterDensity * subarea
    forestLitterDensity += subtypeForestLitterDensity
    area += subarea
  }
  return {
    stock: groundStock + biomassStock + forestLitterStock,
    area,
    groundStock,
    biomassStock,
    forestLitterStock,
    totalDensity: groundDensity + biomassDensity + forestLitterDensity
  }
}

function co2ToCarbon (co2) {
  return co2 * 12 / 44
}

async function getStocksWoodProducts (location, calculationMethod) {
  if (calculationMethod === 'consommation') {
    const popTotal = await getPopulationTotal(await epciList())
    const epciPop = location.epci.populationTotale
    const proportion = epciPop / popTotal
    const franceStocks = getFranceStocksWoodProducts()
    return {
      stock: co2ToCarbon((franceStocks.bi + franceStocks.bo) * proportion)
    }
  }
}

// TODO: put in check for if the locations given are valid and findable?
// Or maybe put this error throwing at the lowest level and let them bubble up
async function getStocks (location, options) {
  const originalLocation = location
  location = { epci: location.epci.code } // TODO: change the other APIs to use whole EPCI object like stocks wood products?
  const stocks = {
    cultures: await getStocksByKeyword(location, 'cultures'),
    prairies: await getStocksPrairies(location),
    'zones humides': await getStocksByKeyword(location, 'zones humides'),
    vergers: await getStocksByKeyword(location, 'vergers'),
    vignes: await getStocksByKeyword(location, 'vignes'),
    'sols artificiels': await getStocksSolsArtificiels(location),
    'produits bois': await getStocksWoodProducts(originalLocation, options?.woodCalculation || 'consommation'),
    forêts: await getStocksForests(location),
    haies: await getStocksHaies(location)
  }
  const groundTypes = Object.keys(stocks)
  const stocksTotal = Object.values(stocks).reduce((a, b) => a + b.stock, 0)
  for (const key of Object.keys(stocks)) {
    stocks[key].stockPercentage = Math.round(stocks[key].stock / stocksTotal * 1000) / 10
  }
  const groundStock = Object.values(stocks).reduce((acc, cur) => acc + (cur.groundStock || 0), 0)
  const biomassStock = Object.values(stocks).reduce((acc, cur) => acc + (cur.biomassStock || 0), 0)
  const forestLitterStock = Object.values(stocks).reduce((acc, cur) => acc + (cur.forestLitterStock || 0), 0)
  stocks.byReservoir = {
    'Sol (30 cm)': groundStock,
    'Biomasse sur pied': biomassStock,
    Litière: forestLitterStock,
    'Matériaux bois': stocks['produits bois'].stock
  }
  stocks.byDensity = {}
  groundTypes.forEach(key => {
    if (key !== 'produits bois') {
      stocks.byDensity[key] = stocks[key].totalDensity || 0
    }
  })
  return stocks
}

module.exports = {
  getStocks
}
