// this script generates a CSV file to render the data used by Aldo available for everyone

const communes = require('../data/dataByCommune/communes_17122018.csv.json')
const communeData = require('../data/dataByCommune/communes.json')
const REGION_TO_INTER_REGION = require('../data/dataByCommune/region-to-inter-region.json')
const { GroundTypes } = require('../calculations/constants')
const { getAnnualFluxes } = require('../calculations/flux')
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
const PARENT_TYPES = [
  'cultures',
  'prairies',
  'zones humides',
  'vergers',
  'vignes',
  'sols artificiels',
  'forêts'
]
const forestStockIds = [
  'forêt mixte',
  'forêt feuillu',
  'forêt conifere',
  'forêt peupleraie'
]

const AREA_HEADERS = [
  ...COMMUNE_HEADERS,
  { id: 'co2e', title: 'flux_tCO2e_an-1' }
]
const VALUE_HEADERS = [
  ...COMMUNE_HEADERS
]
const BIOMASS_GROWTH_HEADERS = [
  ...COMMUNE_HEADERS
]

const ALL_TYPES = simpleStockIds.concat(forestStockIds)

ALL_TYPES.forEach((fromGt) => {
  ALL_TYPES.forEach((toGt) => {
    if (fromGt === toGt) return
    // we don't have data for changes between forest types
    if (fromGt.startsWith('forêt') && toGt.startsWith('forêt')) return
    AREA_HEADERS.push({
      id: `${fromGt}_to_${toGt}_area`,
      title: `${fromGt}_vers_${toGt}_surface_ha_an-1`
    })
    AREA_HEADERS.push({
      id: `${fromGt}_to_${toGt}_totalSequestration`,
      title: `${fromGt}_vers_${toGt}_tCO2e_an-1`
    })
    VALUE_HEADERS.push({
      id: `${fromGt}_to_${toGt}_groundFlux`,
      title: `${fromGt}_vers_${toGt}_sol` // _flux_unitaire_tCO2e_ha-1_an-1
    })
    VALUE_HEADERS.push({
      id: `${fromGt}_to_${toGt}_biomassFlux`,
      title: `${fromGt}_vers_${toGt}_biomasse`
    })
    if (fromGt.startsWith('forêt') || toGt.startsWith('forêt')) {
      VALUE_HEADERS.push({
        id: `${fromGt}_to_${toGt}_forestLitterFlux`,
        title: `${fromGt}_vers_${toGt}_litiere`
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
  BIOMASS_GROWTH_HEADERS.push(...[
    { id: `${gt}_forestArea`, title: `${gt}_surface_ha` },
    { id: `${gt}_growth`, title: `${gt}_accroissement_biologique_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_mortality`, title: `${gt}_mortalite_biologique_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_timberExtraction`, title: `${gt}_prelevements_de_bois_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_fluxMeterCubed`, title: `${gt}_bilan_total_unitaire_m3_BFT_ha-1_an-1` },
    { id: `${gt}_conversionFactor`, title: `${gt}_facteur_de_conversion_tC_m3_BFT-1` },
    { id: `${gt}_annualFluxEquivalent`, title: `${gt}_accroissement_biologique_flux_unitaire_tCO2e_ha-1_an-1` },
    { id: `${gt}_co2e`, title: `${gt}_accroissement_biologique_flux_tCO2e_an-1` }
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
    record[`${gt}_co2e`] = summary.co2e
  })
  for (const fromGt of ALL_TYPES) {
    const fromCo2e = fluxes.fluxCo2eByGroundType[fromGt]
    if (fromCo2e) {
      for (const toGt of ALL_TYPES) {
        if (fromGt !== toGt) {
          const fluxLookupKey = `${fromGt}_to_${toGt}`
          record[`${fluxLookupKey}_totalSequestration`] = fromCo2e[toGt]
        }
      }
    }
  }
  record.co2e = fluxes.total
  records.push(record)
}

function resetFiles () {
  const fluxWriters = []
  fluxWriters.push(createCsvWriter({
    path: './flux/changement-surfaces.csv',
    header: AREA_HEADERS
  }))
  fluxWriters.push(createCsvWriter({
    path: './flux/flux-unitaire.csv',
    header: VALUE_HEADERS
  }))
  fluxWriters.push(createCsvWriter({
    path: './flux/accroissement-biomasse.csv',
    header: BIOMASS_GROWTH_HEADERS
  }))
  return writeFiles({}, [], fluxWriters, [])
}

function writeFiles (stocksWriters, stocksRecords, fluxWriters, fluxRecords) {
  function catchError (writer) {
    return (e) => {
      console.log('Error writing ', writer.fileWriter.path)
      console.log(e)
    }
  }

  const promises = fluxWriters.map((writer) => writer.writeRecords(fluxRecords).catch(catchError(writer)))

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

  const fluxWriters = []
  fluxWriters.push(createCsvWriter({
    path: './flux/changement-surfaces.csv',
    header: AREA_HEADERS,
    append: true
  }))
  fluxWriters.push(createCsvWriter({
    path: './flux/flux-unitaire.csv',
    header: VALUE_HEADERS,
    append: true
  }))
  fluxWriters.push(createCsvWriter({
    path: './flux/accroissement-biomasse.csv',
    header: BIOMASS_GROWTH_HEADERS,
    append: true
  }))

  await exportData({}, fluxWriters, communes, 0).then(() => {
    console.log('All done!')
  })
}

main()
