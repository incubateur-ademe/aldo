import {
  getArea as getAreaData,
  getCarbonDensity,
  getBiomassCarbonDensity,
  getForestLitterCarbonDensity,
  getForestBiomassCarbonDensities,
  getHedgerowsDataForCommunes
} from '../../data/stocks.ts'
import { getStocksWoodProducts } from './woodProducts.ts'
import { StocksIds, entries, groundType, has, type StocksId } from '../constants.ts'
import { sumByProperty, weightedAverage } from '../math.ts'
import { FOREST_SUBTYPES } from '../../data/shared.ts'
import type { Commune, Location } from '../../data/types.ts'

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
  woodCalculation: 'recolte' or 'consommation'
}
*/
export interface Stock {
  area?: number
  originalArea?: number
  areaModified?: boolean
  hasModifications?: boolean
  groundDensity?: number
  groundStock?: number
  biomassDensity?: number
  biomassStock?: number
  liveBiomassDensity?: number
  liveBiomassStock?: number
  deadBiomassDensity?: number
  deadBiomassStock?: number
  forestLitterDensity?: number
  forestLitterStock?: number
  totalDensity?: number
  totalReservoirStock: number
  totalStock: number
  stockPercentage?: number
  groundAndLitterStockPercentage?: number
  biomassStockPercentage?: number
  children?: readonly StocksId[]
  parent?: StocksId
  // haies : km par occupation du sol
  byGroundType?: Partial<Record<StocksId, number>>
  // produits bois
  localPopulation?: number
  francePopulation?: number
  portionPopulation?: number
  biFranceStocksTotal?: number
  boFranceStocksTotal?: number
  biStock?: number
  boStock?: number
  boLocalHarvestTotal?: number
  biLocalHarvestTotal?: number
  localHarvestTotal?: number
  boFranceHarvestTotal?: number
  biFranceHarvestTotal?: number
  boPortion?: number
  biPortion?: number
}

type StockNumberKey = { [K in keyof Stock]-?: Stock[K] extends number | undefined ? K : never }[keyof Stock]

export type Stocks = Record<StocksId, Stock> & {
  total: number
  totalEquivalent: number
  percentageByReservoir: Record<string, number>
  byDensity: Partial<Record<StocksId, number>>
}

export interface StocksOptions {
  areas?: Record<string, number>
  woodCalculation?: string
}

interface KeywordOptions {
  areas?: Record<string, number>
  groundKeyword?: string
}

function getArea (location: Location, key: StocksId, overrides?: Record<string, number>) {
  const override = overrides?.[key]
  if (override !== undefined && (override || override === 0)) {
    return override
  } else {
    return getAreaData(location, key)
  }
}

// to be called per-commune
function getStocksByKeyword (location: Location, keyword: StocksId, options: KeywordOptions): Stock {
  const area = getArea(location, keyword, options.areas)
  const commune = location.commune ?? { insee: '' }
  const groundDensity = getCarbonDensity(commune, options.groundKeyword || keyword)
  const groundStock = groundDensity * area
  const biomassDensity = getBiomassCarbonDensity(location, keyword) || 0
  const biomassStock = biomassDensity * area
  const stocks: Stock = {
    totalReservoirStock: groundStock + biomassStock,
    area,
    groundStock,
    biomassStock,
    groundDensity,
    biomassDensity,
    totalDensity: groundDensity + biomassDensity,
    totalStock: 0
  }
  if (has(FOREST_SUBTYPES, keyword)) {
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

    stocks.totalDensity = (stocks.totalDensity ?? 0) + forestLitterDensity + liveBiomassDensity + deadBiomassDensity
    stocks.totalReservoirStock += stocks.forestLitterStock + liveBiomassStock + deadBiomassStock
  }
  stocks.totalStock = stocks.totalReservoirStock
  return stocks
}

function getSubStocksByKeyword (location: Location, keyword: StocksId, parent: StocksId, options: KeywordOptions): Stock {
  const stocks = getStocksByKeyword(location, keyword, options)
  stocks.parent = parent
  return stocks
}

function aggregateStocksForParent (subStocks: Partial<Record<StocksId, Stock>>, parent?: StocksId): Stock {
  const stocks: Stock = {
    totalReservoirStock: 0,
    area: 0,
    groundStock: 0,
    biomassStock: 0,
    forestLitterStock: 0,
    liveBiomassStock: 0,
    deadBiomassStock: 0,
    totalStock: 0
  }
  for (const subStock of Object.values(subStocks)) {
    if (parent && subStock.parent !== parent) continue
    stocks.totalReservoirStock += subStock.totalReservoirStock
    stocks.area = (stocks.area ?? 0) + (subStock.area ?? 0)
    stocks.groundStock = (stocks.groundStock ?? 0) + (subStock.groundStock ?? 0)
    stocks.biomassStock = (stocks.biomassStock ?? 0) + (subStock.biomassStock ?? 0)
    if (subStock.forestLitterStock) {
      stocks.forestLitterStock = (stocks.forestLitterStock ?? 0) + subStock.forestLitterStock
      stocks.liveBiomassStock = (stocks.liveBiomassStock ?? 0) + (subStock.liveBiomassStock ?? 0)
      stocks.deadBiomassStock = (stocks.deadBiomassStock ?? 0) + (subStock.deadBiomassStock ?? 0)
    }
  }
  stocks.totalStock = stocks.totalReservoirStock
  return stocks
}

function getAreasSolsArtificiels (location: Location, options: StocksOptions): Record<string, number> {
  // Citepa 2021 provides A_i (imperméabilisés), A_h (enherbés/arbustifs), A_a (arborés) as separate values.
  const impermeableKey = 'sols artificiels imperméabilisés'
  const shrubbyKey = 'sols artificiels arbustifs'
  const treeKey = 'sols artificiels arborés et buissonants'

  return {
    [impermeableKey]: options.areas?.[impermeableKey] ?? getArea(location, impermeableKey, {}) ?? 0,
    [shrubbyKey]: options.areas?.[shrubbyKey] ?? getArea(location, shrubbyKey, {}) ?? 0,
    [treeKey]: options.areas?.[treeKey] ?? getArea(location, treeKey, {}) ?? 0
  }
}

function getStocksHedgerows (location: Location, options: StocksOptions): Stock {
  const data = getHedgerowsDataForCommunes(location)
  const originalArea = sumByProperty(data, 'length')
  const carbonDensity = weightedAverage(data, 'carbonDensity', 'length')
  let area = originalArea
  let biomassStock
  if (options.areas?.haies) {
    area = options.areas.haies
  }
  const byGroundType: Partial<Record<StocksId, number>> = {}
  data.forEach((d) => {
    for (const id of StocksIds) {
      const length = d.byGroundType[id]
      if (length === undefined) continue
      byGroundType[id] = (byGroundType[id] ?? 0) + length
    }
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
    biomassStock,
    totalDensity: carbonDensity,
    byGroundType
  }
}

function asPercentage (value: number, total: number) {
  return Math.round(value / total * 1000) / 10
}

// TODO: put in check for if the locations given are valid and findable?
// Or maybe put this error throwing at the lowest level and let them bubble up
export function getStocks (communes: Commune[], options: StocksOptions = {}): Stocks {
  const stocksForLocations: Partial<Record<StocksId, Stock>>[] = []
  // area overrides shouldn't be passed down at this level
  const communeLevelOptions: StocksOptions = { ...options, areas: {} }
  communes.forEach((commune) => {
    stocksForLocations.push(getStocksForLocation({ commune }, communeLevelOptions))
  })
  const byType = aggregateStocks(stocksForLocations)
  annotateAreaCustomisations(byType, options)
  byType.haies = getStocksHedgerows({ communes }, options)

  const total = getTotalStock(byType)
  const stocks: Stocks = {
    ...byType,
    total,
    totalEquivalent: total * 44 / 12,
    // extra data prep for display - TODO: consider whether this is better handled by the handler
    percentageByReservoir: {},
    byDensity: {}
  }
  percentagesByParentType(stocks)
  stocks.percentageByReservoir = getPercentageByReservoir(stocks)
  stocks.byDensity = densityByChildType(stocks)
  return stocks
}

// TODO: refactor to restrict to single commune
function getStocksForLocation (location: Location, options: StocksOptions): Partial<Record<StocksId, Stock>> {
  const stocks: Partial<Record<StocksId, Stock>> = {
    cultures: getStocksByKeyword(location, 'cultures', options),
    'zones humides': getStocksByKeyword(location, 'zones humides', options),
    vergers: getStocksByKeyword(location, 'vergers', options),
    vignes: getStocksByKeyword(location, 'vignes', options),
    'produits bois': getStocksWoodProducts(location, options.woodCalculation)
  }

  // extra steps for ground types that are grouped together
  // prairies
  const prairieChildren = groundType('prairies').children ?? []
  const prairiesSubtypes: Partial<Record<StocksId, Stock>> = {}
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
  const forestChildren = groundType('forêts').children ?? []
  const forestSubtypes: Partial<Record<StocksId, Stock>> = {}
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
  const solsArtAreas = { ...options.areas, ...getAreasSolsArtificiels(location, options) }
  const solArtChildren = groundType('sols artificiels').children ?? []
  const solArtSubtypes: Partial<Record<StocksId, Stock>> = {}
  solArtChildren.forEach((c) => {
    solArtSubtypes[c] = getSubStocksByKeyword(location, c, 'sols artificiels', {
      areas: solsArtAreas,
      groundKeyword: c.endsWith('arbustifs') ? 'sols artificiels enherbés' : undefined
    })
  })
  Object.assign(stocks, solArtSubtypes)
  stocks['sols artificiels'] = aggregateStocksForParent(solArtSubtypes)
  stocks['sols artificiels'].children = solArtChildren

  return stocks
}

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
] as const satisfies readonly StockNumberKey[]
const areaWeightedKeys = [
  'groundDensity',
  'biomassDensity',
  'liveBiomassDensity',
  'deadBiomassDensity',
  'forestLitterDensity',
  'totalDensity'
] as const satisfies readonly StockNumberKey[]
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
] as const satisfies readonly (keyof Stock)[]

function aggregateStocks (stocksForLocations: Partial<Record<StocksId, Stock>>[]): Record<StocksId, Stock> {
  // NB : l'ordre d'insertion des occupations est celui des pages et graphiques
  const aggregatedStocks: Partial<Record<StocksId, Stock>> = {}
  // if there is no area, want to fall back to mean not weighted avg
  const meanFallbacks: Partial<Record<StocksId, Partial<Record<StockNumberKey, number>>>> = {}
  // TODO: stockPercentage?
  stocksForLocations.forEach((stocksForLocation) => {
    for (const [groundType, valuesForType] of Object.entries(stocksForLocation) as [StocksId, Stock][]) {
      const aggregated = aggregatedStocks[groundType] ??= { totalReservoirStock: 0, totalStock: 0 }
      const fallbacks = meanFallbacks[groundType] ??= {}
      for (const [key, value] of Object.entries(valuesForType)) {
        if (has(sumKeys, key)) {
          aggregated[key] = (aggregated[key] ?? 0) + value
        } else if (has(areaWeightedKeys, key)) {
          aggregated[key] = (aggregated[key] ?? 0) + value * (valuesForType.area ?? 0)
          fallbacks[key] = (fallbacks[key] ?? 0) + value
        }
        if (has(constantKeys, key)) {
          aggregated[key] = value || aggregated[key]
        }
      }
    }
  })
  for (const [groundType, aggregated] of entries(aggregatedStocks)) {
    const fallbacks = meanFallbacks[groundType] ?? {}
    areaWeightedKeys.forEach((key) => {
      if (!aggregated[key] && !fallbacks[key]) return
      const area = aggregated.area
      if (area) {
        aggregated[key] = (aggregated[key] ?? 0) / area
      } else {
        aggregated[key] = (fallbacks[key] ?? 0) / stocksForLocations.length
      }
    })
    aggregated.originalArea = aggregated.area
  }
  // toutes les occupations sont attendues par les pages, même sans commune
  for (const id of StocksIds) aggregatedStocks[id] ??= { totalReservoirStock: 0, totalStock: 0 }
  return aggregatedStocks as Record<StocksId, Stock>
}

function getTotalStock (stocks: Record<StocksId, Stock>) {
  return getParentTypes(stocks).reduce((a, b) => a + stocks[b].totalStock, 0)
}

// Occupations de premier niveau, dans l'ordre d'insertion
export function groundTypeKeys (stocks: Record<StocksId, Stock>): StocksId[] {
  return Object.keys(stocks).filter((key) => has(StocksIds, key))
}

function getParentTypes (stocks: Record<StocksId, Stock>) {
  return groundTypeKeys(stocks).filter((s) => !stocks[s].parent)
}

function percentagesByParentType (stocks: Stocks) {
  const parentTypes = getParentTypes(stocks)
  const groundAndLitterStocksTotal = parentTypes.reduce((a, b) => {
    return a + (stocks[b].groundStock || 0) + (stocks[b].forestLitterStock || 0)
  }, 0)
  const biomassStocksTotal = parentTypes.reduce((a, b) => a + sumAllBiomassStock(stocks[b]), 0)
  for (const key of parentTypes) {
    stocks[key].stockPercentage = asPercentage(stocks[key].totalStock, stocks.total)
    const groundAndLitter = (stocks[key].groundStock ?? 0) + (stocks[key].forestLitterStock || 0)
    stocks[key].groundAndLitterStockPercentage = asPercentage(groundAndLitter, groundAndLitterStocksTotal)
    stocks[key].biomassStockPercentage = asPercentage(sumAllBiomassStock(stocks[key]), biomassStocksTotal)
  }
}

function getPercentageByReservoir (stocks: Stocks) {
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

function densityByChildType (stocks: Stocks) {
  const byDensity: Partial<Record<StocksId, number>> = {}
  groundTypeKeys(stocks).forEach((stocksId) => {
    if (stocksId !== 'produits bois' && Object.hasOwn(stocks[stocksId], 'totalDensity')) {
      byDensity[stocksId] = stocks[stocksId].totalDensity || 0
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
  agriculturalPracticesEstablishedAreas: {},
  fluxHaveModifications: false,
  stocksHaveModifications: false
}
*/
function annotateAreaCustomisations (stocks: Record<StocksId, Stock>, options: StocksOptions) {
  const parentTypesToUpdate: StocksId[] = []
  Object.entries(options.areas ?? {}).forEach(([groundType, area]) => {
    if (!has(StocksIds, groundType)) return
    const stock = stocks[groundType]
    stock.originalArea = stock.area
    stock.area = area
    stock.areaModified = true
    stock.hasModifications = true
    calculateStocks(stock)
    if (stock.parent) {
      parentTypesToUpdate.push(stock.parent)
    }
  })

  parentTypesToUpdate.forEach((groundType) => {
    stocks[groundType].originalArea = stocks[groundType].area
    stocks[groundType].areaModified = true
    stocks[groundType].hasModifications = true
    Object.assign(stocks[groundType], aggregateStocksForParent(stocks, groundType))
  })
}

const reservoirKeys = [
  ['groundDensity', 'groundStock'],
  ['biomassDensity', 'biomassStock'],
  ['liveBiomassDensity', 'liveBiomassStock'],
  ['deadBiomassDensity', 'deadBiomassStock'],
  ['forestLitterDensity', 'forestLitterStock'],
  ['totalDensity', 'totalStock']
] as const satisfies readonly (readonly [StockNumberKey, StockNumberKey])[]

function calculateStocks (stock: Stock) {
  const area = stock.area ?? 0
  reservoirKeys.forEach(([densityKey, stockKey]) => {
    const density = stock[densityKey]
    if (density) {
      stock[stockKey] = density * area
    }
  })
  stock.totalReservoirStock = stock.totalStock
}

function sumAllBiomassStock (stock: Stock) {
  return (stock.biomassStock || 0) + (stock.liveBiomassStock || 0) + (stock.deadBiomassStock || 0)
}
