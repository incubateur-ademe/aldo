const {
  getArea: getAreaData,
  getCarbonDensity,
  getBiomassCarbonDensity,
  getForestLitterCarbonDensity,
  getForestBiomassCarbonDensities,
  getHedgerowsDataForCommunes
} = require('../../data/stocks')
const { getStocksWoodProducts } = require('./woodProducts')
const { GroundTypes } = require('../constants')

function getArea (location, key, overrides) {
  if (overrides && (overrides[key] || overrides[key] === 0)) {
    return overrides[key]
  } else {
    return getAreaData(location, key)
  }
}

// to be called per-commune
function getStocksByKeyword (location, keyword, options) {
  const area = getArea(location, keyword, options.areas)
  const groundDensity = getCarbonDensity(location.commune, options.groundKeyword || keyword)
  const groundStock = groundDensity * area
  const biomassDensity = getBiomassCarbonDensity(location, keyword) || 0
  const biomassStock = biomassDensity * area
  const stocks = {
    totalReservoirStock: groundStock + biomassStock,
    area,
    groundStock,
    biomassStock,
    groundDensity,
    biomassDensity,
    totalDensity: groundDensity + biomassDensity
  }
  if (keyword.startsWith('forêt ')) {
    const forestBiomassDensities = getForestBiomassCarbonDensities(location, keyword)

    const liveBiomassDensity = forestBiomassDensities.live
    const liveBiomassStock = liveBiomassDensity * area
    stocks.liveBiomassDensity = liveBiomassDensity
    stocks.liveBiomassStock = liveBiomassStock

    const deadBiomassDensity = forestBiomassDensities.dead
    stocks.deadBiomassDensity = deadBiomassDensity
    const deadBiomassStock = deadBiomassDensity * area
    stocks.deadBiomassStock = deadBiomassStock

    const forestLitterDensity = getForestLitterCarbonDensity(keyword.replace('forêt ', ''))
    stocks.forestLitterDensity = forestLitterDensity
    stocks.forestLitterStock = forestLitterDensity * area

    stocks.totalDensity += forestLitterDensity + liveBiomassDensity + deadBiomassDensity
    stocks.totalReservoirStock += stocks.forestLitterStock + liveBiomassStock + deadBiomassStock
  }
  stocks.totalStock = stocks.totalReservoirStock
  return stocks
}

function getSubStocksByKeyword (location, keyword, parent, options) {
  options = JSON.parse(JSON.stringify(options))
  const stocks = getStocksByKeyword(location, keyword, options)
  stocks.parent = parent
  return stocks
}

function aggregateStocksForParent (subStocks, parent) {
  const stocks = {
    totalReservoirStock: 0,
    area: 0,
    groundStock: 0,
    biomassStock: 0,
    forestLitterStock: 0,
    liveBiomassStock: 0,
    deadBiomassStock: 0
  }
  for (const subType of Object.keys(subStocks)) {
    if (parent && subStocks[subType].parent !== parent) continue
    stocks.totalReservoirStock += subStocks[subType].totalReservoirStock
    stocks.area += subStocks[subType].area
    stocks.groundStock += subStocks[subType].groundStock
    stocks.biomassStock += subStocks[subType].biomassStock
    if (subStocks[subType].forestLitterStock) {
      stocks.forestLitterStock += subStocks[subType].forestLitterStock
      stocks.liveBiomassStock += subStocks[subType].liveBiomassStock
      stocks.deadBiomassStock += subStocks[subType].deadBiomassStock
    }
  }
  stocks.totalStock = stocks.totalReservoirStock
  return stocks
}

function getAreasSolsArtificiels (location, options) {
  // there are three different types of arificial ground to consider:
  // * impermeable
  // * with trees
  // * with other greenery (shrubbery, grass etc)
  const impermeableKey = 'sols artificiels imperméabilisés'
  const shrubbyKey = 'sols artificiels arbustifs'
  const treeKey = 'sols artificiels arborés et buissonants'

  // start by estimating the area taken by each
  const areaWithoutTrees = getArea(location, impermeableKey, {})
  let areaWithTrees = options.areas[treeKey]
  if (isNaN(areaWithTrees)) {
    areaWithTrees = getArea(location, treeKey, {})
  }
  const totalArea = areaWithoutTrees + areaWithTrees

  // TODO: ask are there sources to cite for these estimates?
  const estimatedPortionImpermeable = options.proportionSolsImpermeables || 0.8
  const estimatedPortionGreen = 1 - estimatedPortionImpermeable

  let areaImpermeable = options.areas[impermeableKey]
  // TODO: replace hardcoded 0.2 in this function with estimatedPortionGreen + write test
  if (isNaN(areaImpermeable)) {
    // TODO: ask why proportion of areaWithTrees in both cases is important
    if (areaWithTrees < 0.2 * totalArea) {
      areaImpermeable = estimatedPortionImpermeable * totalArea
    } else {
      // TODO: ask why subtracting areaWithTrees here
      areaImpermeable = areaWithoutTrees - areaWithTrees
    }
  }

  let areaShrubby = options.areas[shrubbyKey]
  if (isNaN(areaShrubby)) {
    if (areaWithTrees < 0.2 * (areaImpermeable + areaWithTrees)) {
      // TODO: can use totalArea instead of sum
      areaShrubby = estimatedPortionGreen * (areaWithoutTrees + areaWithTrees) - areaWithTrees
    } else {
      areaShrubby = 0
    }
  }

  // TODO: what is this 'area' key doing?
  const areas = { area: areaImpermeable + areaShrubby + areaWithTrees }
  areas[impermeableKey] = areaImpermeable
  areas[shrubbyKey] = areaShrubby
  areas[treeKey] = areaWithTrees
  return areas
}

function getStocksHedgerows (location, options) {
  const data = getHedgerowsDataForCommunes(location)
  const originalArea = sumByProperty(data, 'length')
  const carbonDensity = weightedAverage(data, 'carbonDensity', 'length')
  let area = originalArea
  let biomassStock
  if (options?.areas?.haies) {
    area = options.areas.haies
  }
  const byGroundType = {}
  data.forEach((d) => {
    const stocksIds = Object.keys(d.byGroundType)
    stocksIds.forEach((id) => {
      if (!Object.hasOwn(byGroundType, id)) byGroundType[id] = 0
      byGroundType[id] += d.byGroundType[id]
    })
    if (originalArea === area) {
      d.biomassStock = d.length * d.carbonDensity
    }
  })
  if (originalArea === area) {
    biomassStock = sumByProperty(data, 'biomassStock')
  } else {
    biomassStock = area * carbonDensity
  }
  return {
    totalReservoirStock: biomassStock,
    totalStock: biomassStock,
    // continue using the term 'area' for consistency
    area,
    originalArea,
    areaModified: area !== originalArea,
    hasModifications: area !== originalArea,
    biomassDensity: carbonDensity,
    groundDensity: 0,
    biomassStock: biomassStock,
    totalDensity: carbonDensity,
    byGroundType
  }
}

function asPercentage (value, total) {
  return Math.round(value / total * 1000) / 10
}

// TODO: put in check for if the locations given are valid and findable?
// Or maybe put this error throwing at the lowest level and let them bubble up
/*
Data format:
stocks: {
  <groundTypeKey>: {
    area: in ha, user-entered area or our data
    originalArea: in ha, area in our data
    areaModified: area or area of child was overridden by user
    hasModifications: areaModified || other modifications through options
    groundDensity: in tC/ha
    groundStock: in tC
    biomassDensity: in tC/ha
    biomassStock: in tC
    forestLitterDensity: in tC/ha
    forestLitterStock: in tC
    totalDensity: total density across ground, biomass, forest litter reservoirs
    totalReservoirStock: total stocks for ground type for ground, biomass, forest litter reservoirs
    totalStock: total stocks for territory
    stockPercentage: 0-100 (totalStock / stocks.total * 100)
    children: [<keyword>] optional
    parent: <keyword> optional
  },
  total: total stock for territory,
  percentageByReservoir: reformat data for graph
  byDensity: reformat data for graph
}

options: {
  areas: {
    <groundTypeKey>: in ha
  },
  woodCalculation: 'recolte' or 'consommation',
  proportionSolsImpermeables: 0 - 1
}
*/
function getStocks (communes, options) {
  options = options || {}
  options.areas = options.areas || {}

  const stocksForLocations = []
  // area overrides shouldn't be passed down at this level
  const communeLevelOptions = JSON.parse(JSON.stringify(options))
  communeLevelOptions.areas = {}
  communes.forEach((commune) => {
    stocksForLocations.push(getStocksForLocation({ commune }, communeLevelOptions))
  })
  const stocks = aggregateStocks(stocksForLocations)
  annotateAreaCustomisations(stocks, options, stocks)
  stocks.haies = getStocksHedgerows({ communes }, options)

  stocks.total = getTotalStock(stocks)
  stocks.totalEquivalent = stocks.total * 44 / 12
  // extra data prep for display - TODO: consider whether this is better handled by the handler
  percentagesByParentType(stocks)
  stocks.percentageByReservoir = getPercentageByReservoir(stocks)
  stocks.byDensity = densityByChildType(stocks)
  return stocks
}

// TODO: refactor to restrict to single commune
function getStocksForLocation (location, options) {
  const stocks = {
    cultures: getStocksByKeyword(location, 'cultures', options),
    'zones humides': getStocksByKeyword(location, 'zones humides', options),
    vergers: getStocksByKeyword(location, 'vergers', options),
    vignes: getStocksByKeyword(location, 'vignes', options),
    'produits bois': getStocksWoodProducts(location, options?.woodCalculation, options)
  }

  // extra steps for ground types that are grouped together
  // prairies
  const prairieChildren = GroundTypes.find(gt => gt.stocksId === 'prairies').children
  const prairiesSubtypes = {}
  prairieChildren.forEach((c) => {
    prairiesSubtypes[c] = getSubStocksByKeyword(location, c, 'prairies', {
      areas: options.areas,
      groundKeyword: 'prairies'
    })
  })
  Object.assign(stocks, prairiesSubtypes)
  stocks.prairies = aggregateStocksForParent(prairiesSubtypes)
  stocks.prairies.children = prairieChildren
  // forests
  const forestChildren = GroundTypes.find(gt => gt.stocksId === 'forêts').children
  const forestSubtypes = {}
  forestChildren.forEach((c) => {
    forestSubtypes[c] = getSubStocksByKeyword(location, c, 'forêts', {
      areas: options.areas,
      groundKeyword: 'forêts'
    })
  })
  Object.assign(stocks, forestSubtypes)
  stocks.forêts = aggregateStocksForParent(forestSubtypes)
  stocks.forêts.children = forestChildren
  // sols artificiels
  // All sols artificiels areas need to be calculated at once
  const newOptions = JSON.parse(JSON.stringify(options))
  const solsArtAreas = getAreasSolsArtificiels(location, options)
  Object.assign(newOptions.areas, solsArtAreas)
  const solArtChildren = GroundTypes.find(gt => gt.stocksId === 'sols artificiels').children
  const solArtSubtypes = {}
  solArtChildren.forEach((c) => {
    solArtSubtypes[c] = getSubStocksByKeyword(location, c, 'sols artificiels', {
      areas: newOptions.areas,
      groundKeyword: c.endsWith('arbustifs') ? 'sols artificiels enherbés' : undefined
    })
  })
  Object.assign(stocks, solArtSubtypes)
  stocks['sols artificiels'] = aggregateStocksForParent(solArtSubtypes)
  stocks['sols artificiels'].children = solArtChildren

  return stocks
}

function aggregateStocks (stocksForLocations) {
  const aggregatedStocks = {}
  const sumKeys = [
    'area',
    'groundStock',
    'biomassStock',
    'liveBiomassStock',
    'deadBiomassStock',
    'forestLitterStock',
    'totalReservoirStock',
    'totalStock',
    'localPopulation',
    'portionPopulation',
    'biPortion',
    'boPortion',
    'biLocalHarvestTotal',
    'boLocalHarvestTotal',
    'localHarvestTotal',
    'biStock',
    'boStock'
  ]
  const meanFallbacks = {} // if there is no area, want to fall back to mean not weighted avg
  const areaWeightedKeys = [
    'groundDensity',
    'biomassDensity',
    'liveBiomassDensity',
    'deadBiomassDensity',
    'forestLitterDensity',
    'totalDensity'
  ]
  const constantKeys = [
    'areaModified',
    'hasModifications',
    'children',
    'parent',
    'francePopulation',
    'biFranceStocksTotal',
    'boFranceStocksTotal',
    'biFranceHarvestTotal',
    'boFranceHarvestTotal'
  ]
  // TODO: stockPercentage?
  stocksForLocations.forEach((stocksForLocation) => {
    Object.entries(stocksForLocation).forEach(([groundType, valuesForType]) => {
      if (!aggregatedStocks[groundType]) aggregatedStocks[groundType] = {}
      if (!meanFallbacks[groundType]) meanFallbacks[groundType] = {}
      Object.entries(valuesForType).forEach(([key, value]) => {
        if (!aggregatedStocks[groundType][key]) {
          aggregatedStocks[groundType][key] = 0
        }
        if (!meanFallbacks[groundType][key]) {
          meanFallbacks[groundType][key] = 0
        }
        if (sumKeys.includes(key)) aggregatedStocks[groundType][key] += value
        else if (areaWeightedKeys.includes(key)) {
          aggregatedStocks[groundType][key] += value * stocksForLocation[groundType].area
          meanFallbacks[groundType][key] += value
        }
        if (constantKeys.includes(key)) {
          aggregatedStocks[groundType][key] = value || aggregatedStocks[groundType][key]
        }
      })
    })
  })
  Object.keys(aggregatedStocks).forEach((groundType) => {
    areaWeightedKeys.forEach((key) => {
      if (!aggregatedStocks[groundType][key] && !meanFallbacks[groundType][key]) return
      const area = aggregatedStocks[groundType].area
      if (area) {
        aggregatedStocks[groundType][key] /= area
      } else {
        aggregatedStocks[groundType][key] = meanFallbacks[groundType][key] / stocksForLocations.length
      }
    })
    aggregatedStocks[groundType].originalArea = aggregatedStocks[groundType].area
  })
  return aggregatedStocks
}

function getTotalStock (stocks) {
  return getParentTypes(stocks).reduce((a, b) => a + stocks[b].totalStock, 0)
}

function getParentTypes (stocks) {
  return Object.keys(stocks).filter((s) => !stocks[s].parent)
}

function percentagesByParentType (stocks) {
  const parentTypes = getParentTypes(stocks)
  const groundAndLitterStocksTotal = parentTypes.reduce((a, b) => {
    return a + (stocks[b].groundStock || 0) + (stocks[b].forestLitterStock || 0)
  }, 0)
  const biomassStocksTotal = parentTypes.reduce((a, b) => a + sumAllBiomassStock(stocks[b]), 0)
  for (const key of parentTypes) {
    stocks[key].stockPercentage = asPercentage(stocks[key].totalStock, stocks.total)
    const groundAndLitter = stocks[key].groundStock + (stocks[key].forestLitterStock || 0)
    stocks[key].groundAndLitterStockPercentage = asPercentage(groundAndLitter, groundAndLitterStocksTotal)
    stocks[key].biomassStockPercentage = asPercentage(sumAllBiomassStock(stocks[key]), biomassStocksTotal)
  }
}

function getPercentageByReservoir (stocks) {
  const parentTypes = getParentTypes(stocks)
  const groundStock = parentTypes.reduce((acc, cur) => acc + (stocks[cur].groundStock || 0), 0)
  const biomassStock = parentTypes.reduce((acc, cur) => acc + sumAllBiomassStock(stocks[cur]), 0)
  const forestLitterStock = parentTypes.reduce((acc, cur) => acc + (stocks[cur].forestLitterStock || 0), 0)
  return {
    'Sol (30 cm)': asPercentage(groundStock, stocks.total),
    'Biomasse sur pied': asPercentage(biomassStock, stocks.total),
    Litière: asPercentage(forestLitterStock, stocks.total),
    'Matériaux bois': asPercentage(stocks['produits bois'].totalStock, stocks.total)
  }
}

function densityByChildType (stocks) {
  const byDensity = {}
  Object.keys(stocks).forEach(key => {
    if (key !== 'produits bois' && stocks[key].hasOwnProperty('totalDensity')) {
      byDensity[key] = stocks[key].totalDensity || 0
    } else if (stocks[key].densities) {
      Object.assign(byDensity, stocks[key].densities)
    }
  })
  return byDensity
}

// TODO: replace this temporary hack, put in place to simply allow the pages
// to load.
/*
{
  areas: {},
  areaChanges: {},
  woodCalculation: 'récolte',
  proportionSolsImpermeables: '0.80',
  agriculturalPracticesEstablishedAreas: {},
  fluxHaveModifications: false,
  stocksHaveModifications: false
}
*/
function annotateAreaCustomisations (stocks, options) {
  const parentTypesToUpdate = []
  Object.keys(options.areas).forEach(groundType => {
    if (!stocks[groundType]) return
    stocks[groundType].originalArea = stocks[groundType].area
    stocks[groundType].area = options.areas[groundType]
    stocks[groundType].areaModified = true
    stocks[groundType].hasModifications = true
    calculateStocks(stocks[groundType])
    if (stocks[groundType].parent) {
      parentTypesToUpdate.push(stocks[groundType].parent)
    }
  })

  parentTypesToUpdate.forEach((groundType) => {
    stocks[groundType].originalArea = stocks[groundType].area
    stocks[groundType].areaModified = true
    stocks[groundType].hasModifications = true
    Object.assign(stocks[groundType], aggregateStocksForParent(stocks, groundType))
  })
}

function calculateStocks (stock) {
  const keys = [
    'ground',
    'biomass',
    'liveBiomass',
    'deadBiomass',
    'forestLitter',
    'total'
  ]
  const area = stock.area
  keys.forEach(key => {
    const density = stock[`${key}Density`]
    if (density) {
      stock[`${key}Stock`] = density * area
    }
  })
  stock.totalReservoirStock = stock.totalStock
}

function sumAllBiomassStock (stock) {
  return (stock.biomassStock || 0) + (stock.liveBiomassStock || 0) + (stock.deadBiomassStock || 0)
}

// consider refactoring to share these between files and unit testing
function sumByProperty (objArray, key) {
  let sum = 0
  objArray.forEach((obj) => {
    sum += obj[key]
  })
  return sum
}

function weightedAverage (objArray, key, keyForWeighting) {
  let weightedSum = 0
  objArray.forEach((obj) => {
    weightedSum += obj[key] * obj[keyForWeighting]
  })
  const total = sumByProperty(objArray, keyForWeighting)
  return total ? weightedSum / total : 0
}

module.exports = {
  getStocks
}
