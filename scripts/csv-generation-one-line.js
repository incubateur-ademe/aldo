// this script generates a CSV file to render the data used by Aldo available for everyone

const communes = require('../data/dataByCommune/communes_17122018.csv.json')
const communeData = require('../data/dataByCommune/communes.json')
const REGION_TO_INTER_REGION = require('../data/dataByCommune/region-to-inter-region.json')
const { GroundTypes } = require('../calculations/constants')
const { getStocks } = require('../calculations/stocks')
const { getForestAreaData } = require('../data/stocks')
const { getIgnLocalisation } = require('../data/shared')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

const GROUND_TYPE_2_TO_1 = {}
GroundTypes.forEach((gt) => {
  if (!gt.children) {
    GROUND_TYPE_2_TO_1[gt.stocksId] = gt.parentType || gt.stocksId
  }
})

const COMMUNE_HEADERS = [
  { id: 'insee', title: 'insee' },
  { id: 'nom', title: 'nom' },
  { id: 'epci', title: 'epci' },
  { id: 'departement', title: 'departement' },
  { id: 'region', title: 'region' },
  { id: 'zpc', title: 'zpc' },
  { id: 'interregion', title: 'inter_region' },
  { id: 'groupeser', title: 'groupe_ser' },
  { id: 'greco', title: 'greco' },
  { id: 'rad13', title: 'rad_13' },
  { id: 'bassinPopulicole', title: 'bassin_populicole' },
  { id: 'population', title: 'population' }
]

// sort out stocks headers
const STOCKS_HEADERS = [
  ...COMMUNE_HEADERS,
  // put population ratio after population
  { id: 'populationRatio', title: 'ratio_population_France' },
  { id: 'stock', title: 'stock_tC' }
]

const simpleStockIds = [
  'cultures',
  'prairies zones arborées',
  'prairies zones herbacées',
  'prairies zones arbustives',
  'zones humides',
  'vergers',
  'vignes',
  'sols artificiels arbustifs',
  'sols artificiels imperméabilisés',
  'sols artificiels arborés et buissonants'
]

simpleStockIds.forEach((id) => {
  STOCKS_HEADERS.push(...[
    {
      id: `${id}_area`,
      title: `${id}_surface_ha`
    },
    {
      id: `${id}_groundDensity`,
      title: `${id}_sol_stock_de_reference_tC_ha-1`
    },
    {
      id: `${id}_biomassDensity`,
      title: `${id}_biomasse_stock_de_reference_tC_ha-1`
    },
    {
      id: `${id}_totalStock`,
      title: `${id}_stock_total_tC`
    }
  ])
})

const forestStockIds = [
  'forêt mixte',
  'forêt feuillu',
  'forêt conifere',
  'forêt peupleraie'
]
forestStockIds.forEach((id) => {
  STOCKS_HEADERS.push(...[
    {
      id: `${id}_area`,
      title: `${id}_surface_ha`
    },
    {
      id: `${id}_groundDensity`,
      title: `${id}_sol_stock_de_reference_tC_ha-1`
    },
    {
      id: `${id}_liveBiomassDensity`,
      title: `${id}_biomasse_vivante_stock_de_reference_tC_ha-1`
    },
    {
      id: `${id}_deadBiomassDensity`,
      title: `${id}_biomasse_morte_stock_de_reference_tC_ha-1`
    },
    {
      id: `${id}_forestLitterDensity`,
      title: `${id}_litiere_stock_de_reference_tC_ha-1`
    },
    {
      id: `${id}_totalStock`,
      title: `${id}_stock_total_tC`
    }
  ])
})

STOCKS_HEADERS.push({
  id: 'hedgerows_biomassDensity',
  title: 'haies_biomasse_stock_de_reference_tC_ha-1'
})
STOCKS_HEADERS.push({
  id: 'hedgerows_totalStock',
  title: 'haies_stock_total_tC'
})

const PARENT_TYPES = [
  'cultures',
  'prairies',
  'zones humides',
  'vergers',
  'vignes',
  'sols artificiels',
  'forêts'
]

PARENT_TYPES.forEach((groundType) => {
  STOCKS_HEADERS.push({
    id: `${groundType}_length`,
    title: `${groundType}_haies_km`
  })
})

// wood products
const WOOD_USAGES = ['bo', 'bi']

WOOD_USAGES.forEach((usage) => {
  STOCKS_HEADERS.push(...[
    { id: `${usage}_harvest`, title: `${usage}_recolte_locale_m3_an-1` },
    { id: `${usage}_harvestRatio`, title: `${usage}_ratio_recolte_France` },
    { id: `${usage}_harvestTotal`, title: `${usage}_recolte_total_tC` }
  ])
})

STOCKS_HEADERS.push(...[
  { id: 'wood_harvestTotal', title: 'produit_bois_recolte_total_tC' }
])

WOOD_USAGES.forEach((usage) => {
  STOCKS_HEADERS.push(...[
    { id: `${usage}_populationTotal`, title: `${usage}_consommation_total_tC` }
  ])
})

STOCKS_HEADERS.push(...[
  { id: 'wood_populationTotal', title: 'produit_bois_consommation_total_tC' }
])

function createRecordForCommune (commune) {
  const record = communeData[commune.insee]
  // fill in geographical data not in extended commune data
  record.interregion = REGION_TO_INTER_REGION[record.region].interRegion
  let forestDataForCommune = getForestAreaData({ commune: record })
  if (forestDataForCommune.length) {
    forestDataForCommune = forestDataForCommune[0]
    record.groupeser = getIgnLocalisation(forestDataForCommune, 'groupeser').localisationCode
    record.greco = getIgnLocalisation(forestDataForCommune, 'greco').localisationCode
    record.rad13 = getIgnLocalisation(forestDataForCommune, 'rad13').localisationCode
    record.bassinPopulicole = getIgnLocalisation(forestDataForCommune, 'bassin_populicole').localisationCode
  }
  return record
}

function addStocksRecords (records, record) {
  // the stocks linked to areas
  const stocks = getStocks([record])
  Object.entries(record.clc18).forEach(([groundType, area]) => {
    const stock = stocks[groundType]
    if (!stock) {
      console.log('No stock:', record.insee, groundType)
      return
    }
    record[`${groundType}_area`] = area
    record[`${groundType}_groundDensity`] = stock.groundDensity
    record[`${groundType}_totalStock`] = stock.totalStock
    if (forestStockIds.includes(groundType)) {
      record[`${groundType}_liveBiomassDensity`] = stock.liveBiomassDensity
      record[`${groundType}_deadBiomassDensity`] = stock.deadBiomassDensity
      record[`${groundType}_forestLitterDensity`] = stock.forestLitterDensity
    } else {
      record[`${groundType}_biomassDensity`] = stock.biomassDensity
    }
  })
  // haies
  const hedgerowsStock = stocks.haies
  record.hedgerows_biomassDensity = hedgerowsStock.totalDensity
  record.hedgerows_totalStock = hedgerowsStock.totalStock
  Object.entries(hedgerowsStock.byGroundType).forEach(([gt, km]) => {
    record[`${gt}_length`] = km
  })
  // wood products
  const woodHarvestStock = stocks['produits bois']
  const woodConsumptionStock = getStocks([record], { woodCalculation: 'consommation' })['produits bois']
  WOOD_USAGES.forEach((usage) => {
    record[`${usage}_harvest`] = woodHarvestStock[`${usage}LocalHarvestTotal`]
    record[`${usage}_harvestRatio`] = woodHarvestStock[`${usage}Portion`]
    record[`${usage}_harvestTotal`] = woodHarvestStock[`${usage}Stock`]
    record.wood_harvestTotal = woodHarvestStock.totalStock
    record.populationRatio = woodConsumptionStock.portionPopulation
    record[`${usage}_populationTotal`] = woodConsumptionStock[`${usage}Stock`]
    record.wood_populationTotal = woodConsumptionStock.totalStock
  })
  record.stock = stocks.total
  records.push(record)
}

function resetFiles () {
  const stocksWriters = {}
  stocksWriters.france = createCsvWriter({
    path: './stocks/stocks.csv',
    header: STOCKS_HEADERS
  })
  return writeFiles(stocksWriters, [])
}

function writeFiles (stocksWriters, stocksRecords) {
  const promises = []
  function catchError (type, loc) {
    return (e) => {
      console.log('Error writing ', type, ' records for location code', loc)
      console.log(e)
    }
  }
  promises.push(stocksWriters.france.writeRecords(stocksRecords).catch(catchError('stock', 'france')))

  return Promise.all(promises).then(() => {
    console.log('batch complete')
  })
}

async function exportData (stocksWriters, communes, startIdx) {
  const batchSize = 100
  const stocksRecords = []

  communes.slice(startIdx, startIdx + batchSize).forEach((commune) => {
    const record = createRecordForCommune(commune)
    addStocksRecords(stocksRecords, record)
  })

  return writeFiles(stocksWriters, stocksRecords)
    .then(() => {
      startIdx += batchSize
      if (startIdx < communes.length) {
        return exportData(stocksWriters, communes, startIdx)
      }
    })
    .catch((e) => {
      console.log('Error writing files around', startIdx)
      console.log(e)
    })
}

async function main () {
  await resetFiles()

  const stocksWriters = {}
  stocksWriters.france = createCsvWriter({
    path: './stocks/stocks.csv',
    header: STOCKS_HEADERS,
    append: true
  })

  await exportData(stocksWriters, communes, 0).then(() => {
    console.log('All done!')
  })
}

main()
