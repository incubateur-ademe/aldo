// this script generates a CSV file to render the data used by Aldo available for everyone

const communes = require('../data/dataByCommune/communes_17122018.csv.json')
const communeData = require('../data/dataByCommune/communes.json')
const REGION_TO_INTER_REGION = require('../data/dataByCommune/region-to-inter-region.json')
const { GroundTypes } = require('../calculations/constants')
const { getStocks } = require('../calculations/stocks')
const { getAnnualFluxes } = require('../calculations/flux')
const { getForestAreaData } = require('../data/stocks')
const { getIgnLocalisation } = require('../data/shared')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

function copyObject (obj) {
  return JSON.parse(JSON.stringify(obj))
}

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

const STOCKS_HEADERS = [
  ...COMMUNE_HEADERS,
  { id: 'gt1', title: 'occupation_du_sol_1' },
  { id: 'gt2', title: 'occupation_du_sol_2' },
  { id: 'area', title: 'surface_ha' },
  { id: 'haies', title: 'lineaire_haies_km' },
  { id: 'reservoir', title: 'reservoir' },
  { id: 'usage', title: 'usage_produits_bois' },
  { id: 'approche', title: 'approche_calculation_produits_bois' },
  { id: 'harvest', title: 'recolte_locale_m3_an-1' },
  { id: 'harvestRatio', title: 'ratio_recolte_France' },
  { id: 'populationRatio', title: 'ratio_population_France' },
  { id: 'density', title: 'stock_de_reference_tC_ha-1' },
  { id: 'haiesDensity', title: 'stock_de_reference_tC_km-1' },
  { id: 'stock', title: 'stock_tC' }
]

const FLUX_HEADERS = [
  ...COMMUNE_HEADERS,
  { id: 'gas', title: 'gaz' },
  { id: 'reservoir', title: 'reservoir' },
  { id: 'category', title: 'usage_produits_bois' },
  { id: 'approche', title: 'approche_calculation_produits_bois' },
  { id: 'localHarvest', title: 'recolte_locale_m3_an-1' },
  { id: 'harvestRatio', title: 'ratio_recolte_France' },
  { id: 'populationRatio', title: 'ratio_population_France' },
  { id: 'fromLevel1', title: 'occupation_du_sol_initiale_1' },
  { id: 'from', title: 'occupation_du_sol_initiale_2' },
  { id: 'toLevel1', title: 'occupation_du_sol_finale_1' },
  { id: 'to', title: 'occupation_du_sol_finale_2' },
  { id: 'area', title: 'surface_moyenne_convertie_ha_an-1' },
  { id: 'gt1', title: 'occupation_du_sol_1' },
  { id: 'gt2', title: 'occupation_du_sol_2' },
  { id: 'forestArea', title: 'surface_ha' },
  { id: 'bioGrowth', title: 'accroissement_biologique_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'bioMortality', title: 'mortalite_biologique_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'bioRemoval', title: 'prelevements_de_bois_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'bioRemoval', title: 'prelevements_de_bois_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'bioTotal', title: 'bilan_total_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'conversionFactor', title: 'facteur_de_conversion_tC_m3_BFT-1' },
  { id: 'annualFluxEquivalent', title: 'flux_unitaire_tCO2e_ha-1_an-1' },
  { id: 'co2e', title: 'flux_tCO2e_an-1' }
]

const RESERVOIR_TRANSLATION = {
  ground: 'sol',
  biomass: 'biomasse vivante',
  liveBiomass: 'biomasse vivante',
  deadBiomass: 'biomasse morte',
  forestLitter: 'litière'
}

const RESERVOIRS = Object.keys(RESERVOIR_TRANSLATION)

const GROUND_TYPE_2_TO_1 = {}
GroundTypes.forEach((gt) => {
  if (!gt.children) {
    GROUND_TYPE_2_TO_1[gt.stocksId] = gt.parentType || gt.stocksId
  }
})

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
    const groundRecord = copyObject(record)
    groundRecord.gt2 = groundType
    groundRecord.gt1 = GROUND_TYPE_2_TO_1[groundType]
    groundRecord.area = area
    const stock = stocks[groundType]
    if (!stock) return
    RESERVOIRS.forEach((reservoir) => {
      const reservoirRecord = copyObject(groundRecord)
      const densityKey = `${reservoir}Density`
      if (!Object.hasOwn(stock, densityKey)) return
      reservoirRecord.reservoir = RESERVOIR_TRANSLATION[reservoir]
      reservoirRecord.density = stock[densityKey]
      reservoirRecord.stock = stock[`${reservoir}Stock`]
      records.push(reservoirRecord)
    })
  })
  // haies
  const hedgerowsStock = stocks.haies
  Object.entries(hedgerowsStock.byGroundType).forEach(([gt, km]) => {
    const hedgerowsRecord = copyObject(record)
    hedgerowsRecord.gt1 = gt
    hedgerowsRecord.gt2 = 'haies'
    hedgerowsRecord.haies = km
    hedgerowsRecord.reservoir = RESERVOIR_TRANSLATION.biomass
    hedgerowsRecord.density = hedgerowsStock.biomassDensity
    hedgerowsRecord.stock = hedgerowsRecord.haies * hedgerowsRecord.density
    records.push(hedgerowsRecord)
  })
  // wood products
  const usages = ['bo', 'bi']
  const woodHarvestStock = stocks['produits bois']
  usages.forEach((usage) => {
    const woodRecord = copyObject(record)
    woodRecord.reservoir = 'produits bois'
    woodRecord.usage = usage.toUpperCase()
    woodRecord.approche = 'production'
    woodRecord.harvest = woodHarvestStock[`${usage}LocalHarvestTotal`]
    woodRecord.harvestRatio = woodHarvestStock[`${usage}Portion`]
    woodRecord.stock = woodHarvestStock[`${usage}Stock`]
    records.push(woodRecord)
  })
  const woodConsumptionStock = getStocks([record], { woodCalculation: 'consommation' })['produits bois']
  usages.forEach((usage) => {
    const woodRecord = copyObject(record)
    woodRecord.reservoir = 'produits bois'
    woodRecord.usage = usage.toUpperCase()
    woodRecord.approche = 'consommmation'
    woodRecord.populationRatio = woodConsumptionStock.portionPopulation
    woodRecord.stock = woodHarvestStock[`${usage}Stock`]
    records.push(woodRecord)
  })
}

function addFluxRecords (records, record) {
  const fluxes = getAnnualFluxes([record])
  fluxes.allFlux.forEach((f) => {
    const fluxRecord = copyObject(record)
    Object.assign(fluxRecord, f)
    if (fluxRecord.from) {
      fluxRecord.fromLevel1 = GROUND_TYPE_2_TO_1[fluxRecord.from]
      fluxRecord.toLevel1 = GROUND_TYPE_2_TO_1[fluxRecord.to]
    } else if (fluxRecord.to === 'produits bois') {
      fluxRecord.reservoir = 'produits bois'
      fluxRecord.to = undefined
      fluxRecord.approche = 'production'
      fluxRecord.harvestRatio = fluxRecord.localPortion
      fluxRecord.category = fluxRecord.category.toUpperCase()
    } else {
      // biomass flux in forests is based on today's area and not an area change
      // reformat this data to clarify this
      fluxRecord.gt2 = fluxRecord.to
      fluxRecord.gt1 = GROUND_TYPE_2_TO_1[fluxRecord.to]
      fluxRecord.to = undefined
      fluxRecord.forestArea = fluxRecord.area
      fluxRecord.area = undefined
    }
    if (fluxRecord.reservoir === 'biomasse') {
      fluxRecord.reservoir = 'biomasse vivante'
    }
    records.push(fluxRecord)
  })
  const woodConsumptionFluxes = getAnnualFluxes([record], { woodCalculation: 'consommation' })
    .allFlux
    .filter((f) => f.to === 'produits bois')
  woodConsumptionFluxes.forEach((f) => {
    const woodRecord = copyObject(record)
    Object.assign(woodRecord, f)
    woodRecord.reservoir = 'produits bois'
    woodRecord.to = undefined
    woodRecord.approche = 'consommmation'
    woodRecord.populationRatio = woodRecord.localPortion
    woodRecord.category = woodRecord.category.toUpperCase()
    records.push(woodRecord)
  })
}

function resetFiles () {
  const stocksHeaderWriter = createCsvWriter({
    path: '../data/dataByCommune/stocks.csv',
    header: STOCKS_HEADERS
  })
  const fluxHeaderWriter = createCsvWriter({
    path: '../data/dataByCommune/flux.csv',
    header: FLUX_HEADERS
  })
  return writeFiles(stocksHeaderWriter, [], fluxHeaderWriter, [])
}

function writeFiles (stocksWriter, stocksRecords, fluxWriter, fluxRecords) {
  return stocksWriter.writeRecords(stocksRecords)
    .then(() => {
      return fluxWriter.writeRecords(fluxRecords)
        .then(() => {
          console.log('batch complete')
        })
        .catch((e) => {
          console.log('Error writing flux records')
          console.log(e)
        })
    })
    .catch((e) => {
      console.log('Error writing stocks records')
      console.log(e)
    })
}

async function exportData (stocksWriter, fluxWriter, communes, startIdx) {
  const batchSize = 200
  const stocksRecords = []
  const fluxRecords = []

  communes.slice(startIdx, startIdx + batchSize).forEach((commune) => {
    const record = createRecordForCommune(commune)
    addStocksRecords(stocksRecords, record)
    addFluxRecords(fluxRecords, record)
  })

  return writeFiles(stocksWriter, stocksRecords, fluxWriter, fluxRecords)
    .then(() => {
      startIdx += batchSize
      if (startIdx < communes.length) {
        return exportData(stocksWriter, fluxWriter, communes, startIdx)
      }
    })
    .catch((e) => {
      console.log('Error writing files around', startIdx)
      console.log(e)
    })
}

async function main () {
  await resetFiles()

  const stocksWriter = createCsvWriter({
    path: '../data/dataByCommune/stocks.csv',
    header: STOCKS_HEADERS,
    append: true
  })
  const fluxWriter = createCsvWriter({
    path: '../data/dataByCommune/flux.csv',
    header: FLUX_HEADERS,
    append: true
  })

  const testCommunes = communes.slice(0, 1000)
  await exportData(stocksWriter, fluxWriter, testCommunes, 0)
}

main()
