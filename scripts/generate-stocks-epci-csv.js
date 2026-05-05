const fs = require('fs')
const path = require('path')

const { getStocks } = require('../calculations/stocks/index')
const {
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest,
  getFranceStocksWoodProducts
} = require('../data/stocks')
const { getPopulationTotal } = require('../data')
const { getCommunes } = require('../data/communes')
const { getEpcis, getEPCIBaseMeta } = require('./generate-epci-utils')

const FRANCE_HARVEST = getAnnualFranceWoodProductsHarvest()
const FRANCE_WOOD_STOCKS = getFranceStocksWoodProducts()
const FRANCE_POPULATION = getPopulationTotal()

const NON_FOREST_TYPES = [
  'cultures', 'prairies zones arborées', 'prairies zones herbacées', 'prairies zones arbustives', 'zones humides',
  'vergers', 'vignes', 'sols artificiels arbustifs', 'sols artificiels imperméabilisés', 'sols artificiels arborés et buissonants'
]
const FOREST_TYPES = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']
const HAIES_GT_KEYS = [
  ['cultures', 'cultures_haies_km'],
  ['prairies', 'prairies_haies_km'],
  ['zones humides', 'zones humides_haies_km'],
  ['vergers', 'vergers_haies_km'],
  ['vignes', 'vignes_haies_km'],
  ['sols artificiels', 'sols artificiels_haies_km'],
  ['forêts', 'forêts_haies_km']
]

function buildHeaders () {
  const h = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole',
    'population', 'ratio_population_France', 'stock_tC'
  ]
  NON_FOREST_TYPES.forEach((gt) => h.push(`${gt}_surface_ha`, `${gt}_sol_stock_de_reference_tC_ha-1`, `${gt}_biomasse_stock_de_reference_tC_ha-1`, `${gt}_stock_total_tC`))
  FOREST_TYPES.forEach((ft) => h.push(`${ft}_surface_ha`, `${ft}_sol_stock_de_reference_tC_ha-1`, `${ft}_biomasse_vivante_stock_de_reference_tC_ha-1`, `${ft}_biomasse_morte_stock_de_reference_tC_ha-1`, `${ft}_litiere_stock_de_reference_tC_ha-1`, `${ft}_stock_total_tC`))
  h.push('haies_biomasse_stock_de_reference_tC_ha-1', 'haies_stock_total_tC')
  HAIES_GT_KEYS.forEach(([, col]) => h.push(col))
  h.push(
    'bo_recolte_locale_m3_an-1', 'bo_ratio_recolte_France', 'bo_recolte_total_tC',
    'bi_recolte_locale_m3_an-1', 'bi_ratio_recolte_France', 'bi_recolte_total_tC',
    'produit_bois_recolte_total_tC', 'bo_consommation_total_tC', 'bi_consommation_total_tC', 'produit_bois_consommation_total_tC'
  )
  return h
}

function csvValue (v) {
  if (v === null || v === undefined || v === '') return ''
  const str = String(v)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"'
  return str
}

function generate (outputPath) {
  const headers = buildHeaders()
  const epcis = getEpcis()
  const total = epcis.length
  const lines = [headers.join(',')]

  console.log(`Traitement de ${total} EPCI…`)
  epcis.forEach((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const meta = getEPCIBaseMeta(epci)
    const population = meta.population || 0
    const ratioPopFrance = population / FRANCE_POPULATION
    const communes = getCommunes({ epci })
    const stocks = getStocks(communes, {})

    const woodHarvest = getAnnualWoodProductsHarvest({ epci })
    const boRatio = woodHarvest.bo / FRANCE_HARVEST.bo
    const biRatio = woodHarvest.bi / FRANCE_HARVEST.bi
    const boRecolte = boRatio * FRANCE_WOOD_STOCKS.bo
    const biRecolte = biRatio * FRANCE_WOOD_STOCKS.bi
    const boConsom = ratioPopFrance * FRANCE_WOOD_STOCKS.bo
    const biConsom = ratioPopFrance * FRANCE_WOOD_STOCKS.bi

    const row = [
      meta.insee, meta.nom, meta.epci, meta.departement, meta.region, meta.zpc,
      meta.inter_region, meta.groupe_ser, meta.greco, meta.rad_13, meta.bassin_populicole,
      population, ratioPopFrance, stocks.total ?? ''
    ]

    NON_FOREST_TYPES.forEach((gt) => {
      const s = stocks[gt] || {}
      row.push(s.area ?? 0, s.groundDensity ?? 0, s.biomassDensity ?? 0, s.totalStock ?? 0)
    })
    FOREST_TYPES.forEach((ft) => {
      const s = stocks[ft] || {}
      row.push(s.area ?? 0, s.groundDensity ?? 0, s.liveBiomassDensity ?? 0, s.deadBiomassDensity ?? 0, s.forestLitterDensity ?? 0, s.totalStock ?? 0)
    })
    const haies = stocks.haies || {}
    row.push(haies.biomassDensity ?? 0, haies.totalStock ?? 0)
    HAIES_GT_KEYS.forEach(([key]) => row.push(haies.byGroundType?.[key] ?? 0))
    row.push(
      woodHarvest.bo, boRatio, boRecolte,
      woodHarvest.bi, biRatio, biRecolte,
      boRecolte + biRecolte, boConsom, biConsom, boConsom + biConsom
    )
    lines.push(row.map(csvValue).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} EPCI  |  Colonnes : ${headers.length}`)
}

const outputFile = process.argv[2] || path.join(process.cwd(), 'stocks-epci.csv')
generate(outputFile)
