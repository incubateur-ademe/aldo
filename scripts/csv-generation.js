// this script generates a CSV file to render the data used by Aldo available for everyone

const communes = require('../data/dataByCommune/communes_17122018.csv.json')
const communeData = require('../data/dataByCommune/communes.json')
const REGION_TO_INTER_REGION = require('../data/dataByCommune/region-to-inter-region.json')
const { GroundTypes } = require('../calculations/constants')
const { getStocks } = require('../calculations/stocks')
const { getForestAreaData } = require('../data/stocks')
const { getIgnLocalisation } = require('../data/shared')

function copyObject (obj) {
  return JSON.parse(JSON.stringify(obj))
}

function main () {
  const createCsvWriter = require('csv-writer').createObjectCsvWriter
  const csvWriter = createCsvWriter({
    path: '../data/dataByCommune/stocks.csv',
    header: [
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
      { id: 'population', title: 'population' },
      { id: 'gt1', title: 'occupation_du_sol_1' },
      { id: 'gt2', title: 'occupation_du_sol_2' },
      { id: 'area', title: 'surface_ha' },
      { id: 'haies', title: 'lineaire_haies_km' },
      { id: 'reservoir', title: 'reservoir' },
      { id: 'usage', title: 'usage_produits_bois' },
      { id: 'approche', title: 'approche_calculation_produits_bois' },
      { id: 'harvest', title: 'recolte_locale_m3_an_-1' },
      { id: 'harvestRatio', title: 'ratio_recolte_France' },
      { id: 'populationRatio', title: 'ratio_population_France' },
      { id: 'density', title: 'stock_de_reference_tC_ha_-1' },
      { id: 'haiesDensity', title: 'stock_de_reference_tC_km_-1' },
      { id: 'stock', title: 'stock_tC' }
    ]
  })

  const groundType2to1 = {}
  GroundTypes.forEach((gt) => {
    if (!gt.children) {
      groundType2to1[gt.stocksId] = gt.parentType || gt.stocksId
    }
  })
  const reservoirTranslation = {
    ground: 'sol',
    biomass: 'biomasse vivante',
    liveBiomass: 'biomasse vivante',
    deadBiomass: 'biomasse morte',
    forestLitter: 'litière'
  }
  const reservoirs = Object.keys(reservoirTranslation)

  const records = []

  const testCommunes = communes.splice(0, 1)
  testCommunes.forEach((commune) => {
    const record = communeData[commune.insee]
    const stocks = getStocks([record])
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
    // the stocks linked to areas
    Object.entries(record.clc18).forEach(([groundType, area]) => {
      const groundRecord = copyObject(record)
      groundRecord.gt2 = groundType
      groundRecord.gt1 = groundType2to1[groundType]
      groundRecord.area = area
      const stock = stocks[groundType]
      if (!stock) return
      reservoirs.forEach((reservoir) => {
        const reservoirRecord = copyObject(groundRecord)
        const densityKey = `${reservoir}Density`
        if (!Object.hasOwn(stock, densityKey)) return
        reservoirRecord.reservoir = reservoirTranslation[reservoir]
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
      hedgerowsRecord.reservoir = reservoirTranslation.biomass
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
  })

  csvWriter.writeRecords(records) // returns a promise
    .then(() => {
      console.log('...Done')
    })
}

main()
