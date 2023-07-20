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
// const DEPARTMENTS = require('./departments.json')
// const REGIONS = require('./regions.json')

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
    }
  ])
})

STOCKS_HEADERS.push({
  id: 'hedgerows_biomassDensity',
  title: 'haies_biomasse_stock_de_reference_tC_ha-1'
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
    { id: `${usage}_harvestRatio`, title: `${usage}_ratio_recolte_France` }
  ])
})

const FLUX_HEADERS = [
  ...COMMUNE_HEADERS,
  { id: 'co2e', title: 'flux_tCO2e_an-1' }
]

const ALL_TYPES = simpleStockIds.concat(forestStockIds)

ALL_TYPES.forEach((fromGt) => {
  ALL_TYPES.forEach((toGt) => {
    if (fromGt === toGt) return
    FLUX_HEADERS.push({
      id: `${fromGt}_to_${toGt}_area`,
      title: `${fromGt}_vers_${toGt}_surface_convertie_ha_an-1`
    })
    FLUX_HEADERS.push({
      id: `${fromGt}_to_${toGt}_groundFlux`,
      title: `${fromGt}_vers_${toGt}_sol_flux_unitaire_tCO2e_ha-1_an-1`
    })
    FLUX_HEADERS.push({
      id: `${fromGt}_to_${toGt}_biomassFlux`,
      title: `${fromGt}_vers_${toGt}_biomasse_flux_unitaire_tCO2e_ha-1_an-1`
    })
    if (fromGt.startsWith('forêt') || toGt.startsWith('forêt')) {
      FLUX_HEADERS.push({
        id: `${fromGt}_to_${toGt}_forestLitterFlux`,
        title: `${fromGt}_vers_${toGt}_litiere_flux_unitaire_tCO2e_ha-1_an-1`
      })
    }
  })
})

const RESERVOIR_TO_KEY = {
  sol: 'ground',
  biomasse: 'biomass',
  litière: 'forestLitter',
  'sol et litière': 'n20'
}

// biomass growth
forestStockIds.forEach((gt) => {
  FLUX_HEADERS.push(...[
    { id: `${gt}_forestArea`, title: `${gt}_surface_ha` },
    { id: `${gt}_growth`, title: `${gt}_accroissement_biologique_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_mortality`, title: `${gt}_mortalite_biologique_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_timberExtraction`, title: `${gt}_prelevements_de_bois_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_fluxMeterCubed`, title: `${gt}_bilan_total_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_conversionFactor`, title: `${gt}_facteur_de_conversion_tC_m3_BFT-1` },
    { id: `${gt}_annualFluxEquivalent`, title: `${gt}_accroissement_biologique_flux_unitaire_tCO2e_ha-1_an-1` },
  ])
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
    const stock = stocks[groundType]
    if (!stock) {
      console.log('No stock:', record.insee, groundType)
      return
    }
    record[`${groundType}_area`] = area
    record[`${groundType}_groundDensity`] = stock.groundDensity
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
  Object.entries(hedgerowsStock.byGroundType).forEach(([gt, km]) => {
    record[`${gt}_length`] = km
  })
  // wood products
  const woodHarvestStock = stocks['produits bois']
  const woodConsumptionStock = getStocks([record], { woodCalculation: 'consommation' })['produits bois']
  WOOD_USAGES.forEach((usage) => {
    record[`${usage}_harvest`] = woodHarvestStock[`${usage}LocalHarvestTotal`]
    record[`${usage}_harvestRatio`] = woodHarvestStock[`${usage}Portion`]
    record.populationRatio = woodConsumptionStock.portionPopulation
  })
  record.stock = stocks.total
  records.push(record)
}

function addFluxRecords (records, record) {
  const fluxes = getAnnualFluxes([record])
  fluxes.allFlux.forEach((f) => {
    if (f.to === 'produits bois') {
      // NB: wood products data isn't different from stocks, so not including
      // it in this file to reduce file size.
    } else if (f.from) {
      // the standard case - an emission/sequestration due to a change in ground type
      if (f.reservoir === 'sol et litière') return // n2O emissions don't have a reference value
      const fluxLookupKey = `${f.from}_to_${f.to}`
      const prefix = RESERVOIR_TO_KEY[f.reservoir]
      record[`${fluxLookupKey}_area`] = f.area
      record[`${fluxLookupKey}_${prefix}Flux`] = f.annualFluxEquivalent * (f.yearsForFlux || 1)
    }
    // when !f.from this is biomass growth which is treated after
  })
  // NB: there are communes which have more than one IGN localisation
  // so this data is an aggregation
  fluxes.biomassSummary.forEach((summary) => {
    const gt = summary.to
    record[`${gt}_forestArea`] = summary.area
    record[`${gt}_growth`] = summary.growth
    record[`${gt}_mortality`] = summary.mortality
    record[`${gt}_timberExtraction`] = summary.timberExtraction
    record[`${gt}_fluxMeterCubed`] = summary.fluxMeterCubed
    record[`${gt}_conversionFactor`] = summary.conversionFactor
    record[`${gt}_annualFluxEquivalent`] = summary.annualFluxEquivalent
  })
  record.co2e = fluxes.total
  records.push(record)
}

function resetFiles () {
  const stocksWriters = {}
  stocksWriters.france = createCsvWriter({
    path: './export-new/stocks.csv',
    header: STOCKS_HEADERS
  })
  const fluxWriters = {}
  fluxWriters.france = createCsvWriter({
    path: './export-new/flux.csv',
    header: FLUX_HEADERS
  })
  // DEPARTMENTS.forEach((d) => {
  //   stocksWriters[d] = createCsvWriter({
  //     path: `./export-new/stocks-departement/stocks-departement-${d}.csv`,
  //     header: STOCKS_HEADERS
  //   })
  //   fluxWriters[d] = createCsvWriter({
  //     path: `./export-new/flux-departement/flux-departement-${d}.csv`,
  //     header: FLUX_HEADERS
  //   })
  // })
  // REGIONS.forEach((r) => {
  //   stocksWriters[`r_${r}`] = createCsvWriter({
  //     path: `./export-new/stocks-region/stocks-region-${r}.csv`,
  //     header: STOCKS_HEADERS
  //   })
  //   fluxWriters[`r_${r}`] = createCsvWriter({
  //     path: `./export-new/flux-region/flux-region-${r}.csv`,
  //     header: FLUX_HEADERS
  //   })
  // })
  return writeFiles(stocksWriters, [], fluxWriters, [])
}

function writeFiles (stocksWriters, stocksRecords, fluxWriters, fluxRecords) {
  const promises = []
  function catchError (type, loc) {
    return (e) => {
      console.log('Error writing ', type, ' records for location code', loc)
      console.log(e)
    }
  }
  promises.push(stocksWriters.france.writeRecords(stocksRecords).catch(catchError('stock', 'france')))
  promises.push(fluxWriters.france.writeRecords(fluxRecords).catch(catchError('flux', 'france')))

  // DEPARTMENTS.forEach((dep) => {
  //   const departmentStocks = stocksRecords.filter((r) => r.departement === dep)
  //   if (!departmentStocks[0]) return
  //   const regionCode = departmentStocks[0].region
  //   // write department and region files
  //   const stocksPromise = stocksWriters[`d_${dep}`].writeRecords(departmentStocks)
  //     .catch(catchError('stock department', dep))
  //   promises.push(stocksPromise)
  //   const regionStocksPromise = stocksWriters[`r_${regionCode}`].writeRecords(departmentStocks)
  //     .catch(catchError('stock region', regionCode))
  //   promises.push(regionStocksPromise)

  //   const departmentFlux = fluxRecords.filter((r) => r.departement === dep)
  //   const fluxPromise = fluxWriters[`d_${dep}`].writeRecords(departmentFlux)
  //     .catch(catchError('flux department', dep))
  //   promises.push(fluxPromise)
  //   const regionFluxPromise = fluxWriters[`r_${regionCode}`].writeRecords(departmentFlux)
  //     .catch(catchError('flux region', regionCode))
  //   promises.push(regionFluxPromise)
  // })

  // need to allow for initialising region files
  // if (!stocksRecords.length) {
  //   REGIONS.forEach((r) => {
  //     const regionStocksPromise = stocksWriters[`r_${r}`].writeRecords([])
  //       .catch(catchError('stock', r))
  //     promises.push(regionStocksPromise)
  //     const regionFluxPromise = fluxWriters[`r_${r}`].writeRecords([])
  //       .catch(catchError('flux', r))
  //     promises.push(regionFluxPromise)
  //   })
  // }

  return Promise.all(promises).then(() => {
    console.log('batch complete')
  })
}

async function exportData (stocksWriters, fluxWriters, communes, startIdx) {
  const batchSize = 100
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
    path: './export-new/stocks.csv',
    header: STOCKS_HEADERS,
    append: true
  })
  const fluxWriters = {}
  fluxWriters.france = createCsvWriter({
    path: './export-new/flux.csv',
    header: FLUX_HEADERS,
    append: true
  })
  // DEPARTMENTS.forEach((d) => {
  //   stocksWriters[`d_${d}`] = createCsvWriter({
  //     path: `./export-new/stocks-departement/stocks-departement-${d}.csv`,
  //     header: STOCKS_HEADERS,
  //     append: true
  //   })
  //   fluxWriters[`d_${d}`] = createCsvWriter({
  //     path: `./export-new/flux-departement/flux-departement-${d}.csv`,
  //     header: FLUX_HEADERS,
  //     append: true
  //   })
  // })
  // REGIONS.forEach((r) => {
  //   stocksWriters[`r_${r}`] = createCsvWriter({
  //     path: `./export-new/stocks-region/stocks-region-${r}.csv`,
  //     header: STOCKS_HEADERS,
  //     append: true
  //   })
  //   fluxWriters[`r_${r}`] = createCsvWriter({
  //     path: `./export-new/flux-region/flux-region-${r}.csv`,
  //     header: FLUX_HEADERS,
  //     append: true
  //   })
  // })

  await exportData(stocksWriters, fluxWriters, communes, 0).then(() => {
    console.log('All done!')
  })
}

main()
