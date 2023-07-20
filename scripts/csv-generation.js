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
const DEPARTMENTS = require('./departments.json')
// const REGIONS = require('regions.json')

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
  { id: 'otherStockType', title: 'autre_stock' },
  { id: 'area', title: 'surface_ha' },
  { id: 'haies', title: 'lineaire_haies_km' },
  { id: 'groundDensity', title: 'sol_stock_de_reference_tC_ha-1' },
  { id: 'groundStock', title: 'sol_stock_tC' },
  { id: 'liveBiomassDensity', title: 'biomasse_vivante_stock_de_reference_tC_ha-1' },
  { id: 'haiesDensity', title: 'biomasse_vivante_stock_de_reference_tC_km-1' },
  { id: 'liveBiomassStock', title: 'biomasse_vivante_stock_tC' },
  { id: 'deadBiomassDensity', title: 'biomasse_morte_stock_de_reference_tC_ha-1' },
  { id: 'deadBiomassStock', title: 'biomasse_morte_stock_tC' },
  { id: 'forestLitterDensity', title: 'litiere_stock_de_reference_tC_ha-1' },
  { id: 'forestLitterStock', title: 'litiere_stock_tC' },
  { id: 'usage', title: 'usage_produits_bois' },
  { id: 'approche', title: 'approche_calculation_produits_bois' },
  { id: 'harvest', title: 'recolte_locale_m3_an-1' },
  { id: 'harvestRatio', title: 'ratio_recolte_France' },
  { id: 'populationRatio', title: 'ratio_population_France' },
  { id: 'stock', title: 'stock_tC' }
]

const FLUX_HEADERS = [
  ...COMMUNE_HEADERS,
  // are the levels actually interesting?
  { id: 'fromLevel1', title: 'occupation_du_sol_initiale_1' },
  { id: 'from', title: 'occupation_du_sol_initiale_2' },
  { id: 'toLevel1', title: 'occupation_du_sol_finale_1' },
  { id: 'to', title: 'occupation_du_sol_finale_2' },
  { id: 'area', title: 'surface_moyenne_convertie_ha_an-1' },
  { id: 'otherFluxType', title: 'autre_flux' },
  { id: 'gt1', title: 'occupation_du_sol_1' },
  { id: 'gt2', title: 'occupation_du_sol_2' },
  // the reference values
  { id: 'groundUnitFlux', title: 'sol_flux_unitaire_tCO2e_ha-1_an-1' },
  { id: 'groundFlux', title: 'sol_flux_tCO2e_an-1' },
  { id: 'biomassUnitFlux', title: 'biomasse_vivante_flux_unitaire_tCO2e_ha-1_an-1' },
  { id: 'biomassFlux', title: 'biomasse_vivante_flux_tCO2e_an-1' },
  { id: 'forestLitterUnitFlux', title: 'litiere_flux_unitaire_tCO2e_ha-1_an-1' },
  { id: 'forestLitterFlux', title: 'litiere_flux_tCO2e_an-1' },
  { id: 'n20Flux', title: 'sol_et_litiere_flux_tCO2e_an-1' },

  { id: 'forestArea', title: 'surface_ha' },
  { id: 'ignLocalisationLevel', title: 'niveau_localisation_ign' },
  { id: 'ignLocalisationCode', title: 'code_localisation_ign' },
  { id: 'growth', title: 'accroissement_biologique_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'mortality', title: 'mortalite_biologique_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'timberExtraction', title: 'prelevements_de_bois_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'fluxMeterCubed', title: 'bilan_total_unitaire_m3_BFT_ha-1_an-1' },
  { id: 'conversionFactor', title: 'facteur_de_conversion_tC_m3_BFT-1' },
  { id: 'bioAnnualFluxEquivalent', title: 'accroissement_biologique_flux_unitaire_tCO2e_ha-1_an-1' },
  // wood product columns
  { id: 'category', title: 'usage_produits_bois' },
  { id: 'approche', title: 'approche_calculation_produits_bois' },
  { id: 'localHarvest', title: 'recolte_locale_m3_an-1' },
  { id: 'harvestRatio', title: 'ratio_recolte_France' },
  { id: 'populationRatio', title: 'ratio_population_France' },
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

const RESERVOIR_TO_KEY = {
  sol: 'ground',
  biomasse: 'biomass',
  litière: 'forestLitter',
  'sol et litière': 'n20'
}

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
  const expectedRecordCount = 25
  // 25 = 14 child types + 7 haies + 4 prod bois
  let recordCountForCommune = 0
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
      const densityKey = `${reservoir}Density`
      if (!Object.hasOwn(stock, densityKey)) return
      const recordKeyPrefix = reservoir === 'biomass' ? 'liveBiomass' : reservoir
      groundRecord[`${recordKeyPrefix}Density`] = stock[densityKey]
      groundRecord[`${recordKeyPrefix}Stock`] = stock[`${reservoir}Stock`]
    })
    groundRecord.stock = stock.totalStock
    records.push(groundRecord)
    recordCountForCommune++
  })
  // haies
  const hedgerowsStock = stocks.haies
  Object.entries(hedgerowsStock.byGroundType).forEach(([gt, km]) => {
    const hedgerowsRecord = copyObject(record)
    hedgerowsRecord.gt1 = gt
    hedgerowsRecord.otherStockType = 'haies'
    hedgerowsRecord.haies = km
    hedgerowsRecord.haiesDensity = hedgerowsStock.biomassDensity
    hedgerowsRecord.liveBiomassStock = hedgerowsRecord.haies * hedgerowsRecord.haiesDensity
    records.push(hedgerowsRecord)
    recordCountForCommune++
  })
  // wood products
  const usages = ['bo', 'bi']
  const woodHarvestStock = stocks['produits bois']
  usages.forEach((usage) => {
    const woodRecord = copyObject(record)
    woodRecord.otherStockType = 'produits bois'
    woodRecord.usage = usage.toUpperCase()
    woodRecord.approche = 'production'
    woodRecord.harvest = woodHarvestStock[`${usage}LocalHarvestTotal`]
    woodRecord.harvestRatio = woodHarvestStock[`${usage}Portion`]
    woodRecord.stock = woodHarvestStock[`${usage}Stock`]
    records.push(woodRecord)
    recordCountForCommune++
  })
  const woodConsumptionStock = getStocks([record], { woodCalculation: 'consommation' })['produits bois']
  usages.forEach((usage) => {
    const woodRecord = copyObject(record)
    woodRecord.otherStockType = 'produits bois'
    woodRecord.usage = usage.toUpperCase()
    woodRecord.approche = 'consommmation'
    woodRecord.populationRatio = woodConsumptionStock.portionPopulation
    woodRecord.stock = woodHarvestStock[`${usage}Stock`]
    records.push(woodRecord)
    recordCountForCommune++
  })
  if (recordCountForCommune !== expectedRecordCount) {
    console.log('Commune insee', record.insee, 'has', recordCountForCommune, 'stocks records')
  }
}

function addFluxRecords (records, record) {
  const fluxes = getAnnualFluxes([record])
  // want to regroup fluxes into one record per ground change - ie. putting all reservoirs
  // in the same record. To speed things up a bit here is a lookup
  const fluxLookup = {}
  const biomassGrowthRecords = []
  const woodRecords = []
  // fluxLookup[from_to] = { from, to, area, groundFluxUnit, groundFlux, liveBiomassFluxUnit...}
  fluxes.allFlux.forEach((f) => {
    if (f.to === 'produits bois') {
      const woodRecord = copyObject(record)
      Object.assign(woodRecord, f)
      woodRecord.otherFluxType = 'produits bois'
      woodRecord.to = undefined
      woodRecord.approche = 'production'
      woodRecord.harvestRatio = woodRecord.localPortion
      woodRecord.category = woodRecord.category.toUpperCase()
      woodRecords.push(woodRecord)
    } else if (!f.from) {
      // biomass flux in forests is based on today's area and not an area change
      // reformat this data to clarify this
      const biomassGrowthRecord = copyObject(record)
      Object.assign(biomassGrowthRecord, f)
      biomassGrowthRecord.gt2 = biomassGrowthRecord.to
      biomassGrowthRecord.gt1 = GROUND_TYPE_2_TO_1[biomassGrowthRecord.to]
      biomassGrowthRecord.to = undefined
      biomassGrowthRecord.forestArea = biomassGrowthRecord.area
      biomassGrowthRecord.area = undefined
      biomassGrowthRecord.bioAnnualFluxEquivalent = f.annualFluxEquivalent
      biomassGrowthRecords.push(biomassGrowthRecord)
    } else {
      // the standard case - an emission/sequestration due to a change in ground type
      const fluxLookupKey = `${f.from}_${f.to}`
      if (!fluxLookup[fluxLookupKey]) {
        fluxLookup[fluxLookupKey] = copyObject(record)
        Object.assign(fluxLookup[fluxLookupKey], f)
        fluxLookup[fluxLookupKey].fromLevel1 = GROUND_TYPE_2_TO_1[f.from]
        fluxLookup[fluxLookupKey].toLevel1 = GROUND_TYPE_2_TO_1[f.to]
      } else {
        fluxLookup[fluxLookupKey].co2e += f.co2e
      }
      const prefix = RESERVOIR_TO_KEY[f.reservoir]
      fluxLookup[fluxLookupKey][`${prefix}UnitFlux`] = f.annualFluxEquivalent * (f.yearsForFlux || 1)
      fluxLookup[fluxLookupKey][`${prefix}Flux`] = f.co2e
    }
  })
  const groundChangeRecords = Object.values(fluxLookup)
  records.push(...groundChangeRecords)
  records.push(...biomassGrowthRecords)
  records.push(...woodRecords)
  const expectedRecordCount = 178
  // 178 =
  // 10 (non-forest types) * 13 (all types except self)
  // + 4 (forest types) * 10 (non-forest ground types)
  // + 4 biomass growth
  // + 4 wood recrods
  let recordCountForCommune = groundChangeRecords.length + biomassGrowthRecords.length + woodRecords.length
  const woodConsumptionFluxes = getAnnualFluxes([record], { woodCalculation: 'consommation' })
    .allFlux
    .filter((f) => f.to === 'produits bois')
  woodConsumptionFluxes.forEach((f) => {
    const woodRecord = copyObject(record)
    Object.assign(woodRecord, f)
    woodRecord.otherFluxType = 'produits bois'
    woodRecord.to = undefined
    woodRecord.approche = 'consommmation'
    woodRecord.populationRatio = woodRecord.localPortion
    woodRecord.category = woodRecord.category.toUpperCase()
    records.push(woodRecord)
    recordCountForCommune += 1
  })
  const commonCounts = [expectedRecordCount, 182, 186]
  if (!commonCounts.includes(recordCountForCommune)) {
    console.log('Commune insee', record.insee, 'has', recordCountForCommune, 'flux records')
  }
}

function resetFiles () {
  const stocksWriters = {}
  stocksWriters.france = createCsvWriter({
    path: './export/stocks.csv',
    header: STOCKS_HEADERS
  })
  const fluxWriters = {}
  fluxWriters.france = createCsvWriter({
    path: './export/flux.csv',
    header: FLUX_HEADERS
  })
  DEPARTMENTS.forEach((d) => {
    stocksWriters[d] = createCsvWriter({
      path: `./export/stocks-departement/stocks-departement-${d}.csv`,
      header: STOCKS_HEADERS
    })
    fluxWriters[d] = createCsvWriter({
      path: `./export/flux-departement/flux-departement-${d}.csv`,
      header: FLUX_HEADERS
    })
  })
  return writeFiles(stocksWriters, [], fluxWriters, [])
}

function writeFiles (stocksWriters, stocksRecords, fluxWriters, fluxRecords) {
  const promises = []
  function catchError (type, dep) {
    return (e) => {
      console.log('Error writing ', type, ' records for dep', dep)
      console.log(e)
    }
  }
  promises.push(stocksWriters.france.writeRecords(stocksRecords).catch(catchError('stock', 'france')))
  promises.push(fluxWriters.france.writeRecords(fluxRecords).catch(catchError('flux', 'france')))

  DEPARTMENTS.forEach((dep) => {
    const departmentStocks = stocksRecords.filter((r) => r.departement === dep)
    const stocksPromise = stocksWriters[dep].writeRecords(departmentStocks)
      .catch(catchError('stock', dep))
    promises.push(stocksPromise)
    const departmentFlux = fluxRecords.filter((r) => r.departement === dep)
    const fluxPromise = fluxWriters[dep].writeRecords(departmentFlux)
      .catch(catchError('flux', dep))
    promises.push(fluxPromise)
  })

  return Promise.all(promises).then(() => {
    console.log('batch complete')
  })
}

async function exportData (stocksWriters, fluxWriters, communes, startIdx) {
  const batchSize = 200
  const stocksRecords = []
  const fluxRecords = []

  communes.slice(startIdx, startIdx + batchSize).forEach((commune) => {
    const record = createRecordForCommune(commune)
    addStocksRecords(stocksRecords, record)
    addFluxRecords(fluxRecords, record)
  })

  return writeFiles(stocksWriters, stocksRecords, fluxWriters, fluxRecords)
    .then(() => {
      startIdx += batchSize
      if (startIdx < communes.length) {
        return exportData(stocksWriters, fluxWriters, communes, startIdx)
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
    path: './export/stocks.csv',
    header: STOCKS_HEADERS,
    append: true
  })
  const fluxWriters = {}
  fluxWriters.france = createCsvWriter({
    path: './export/flux.csv',
    header: FLUX_HEADERS,
    append: true
  })
  DEPARTMENTS.forEach((d) => {
    stocksWriters[d] = createCsvWriter({
      path: `./export/stocks-departement/stocks-departement-${d}.csv`,
      header: STOCKS_HEADERS,
      append: true
    })
    fluxWriters[d] = createCsvWriter({
      path: `./export/flux-departement/flux-departement-${d}.csv`,
      header: FLUX_HEADERS,
      append: true
    })
  })

  const testCommunes = communes.slice(0, 400)
  await exportData(stocksWriters, fluxWriters, testCommunes, 0)
}

main()
