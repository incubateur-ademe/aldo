/**
 * Génère le fichier "ALDO stocks de carbone"
 * correspondant au fichier DATA ADEME : aldo-stocks-de-carbone
 *
 * Pour chaque commune, les stocks de carbone (tC) par type d'occupation du sol :
 *  - Types non-forestiers (10) : surface (ha), densité sol (tC/ha), densité biomasse (tC/ha), stock total (tC)
 *  - Types forestiers  (4)     : surface (ha), densité sol, biomasse vivante, morte, litière (tC/ha), stock total (tC)
 *  - Haies                     : densité biomasse (tC/ha), stock total (tC) + km par type
 *  - Produits bois             : récolte locale (m3/an, ratio, tC) + consommation (tC)
 *
 * Sources :
 *  - Surfaces          : data/dataByCommune/communes.json (champ citepa2021)
 *  - Sol (densité)     : data/dataByCommune/stocks-zpc.csv (par ZPC)
 *  - Biomasse          : data/dataByCommune/biomass-hors-forets.csv (par inter-région)
 *  - Forêt biomasse    : data/dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv
 *  - Haies             : data/dataByCommune/carbone-haies.csv + haie-clc18.csv
 *  - Produits bois     : calculations/stocks/woodProducts.js
 *
 * Usage : node scripts/generate-stocks-csv.js [chemin-de-sortie]
 * Par défaut : stocks.csv dans le répertoire courant
 */

const fs = require('fs')
const path = require('path')

const { getStocks } = require('../calculations/stocks/index')
const {
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest,
  getFranceStocksWoodProducts
} = require('../data/stocks')
const { getPopulationTotal } = require('../data')

// ---------------------------------------------------------------------------
// Codes INSEE des arrondissements (exclus)
// ---------------------------------------------------------------------------
const ARRONDISSEMENT_CODES = new Set([
  '75101', '75102', '75103', '75104', '75105', '75106', '75107', '75108',
  '75109', '75110', '75111', '75112', '75113', '75114', '75115', '75116',
  '75117', '75118', '75119', '75120',
  '69381', '69382', '69383', '69384', '69385', '69386', '69387', '69388', '69389',
  '13201', '13202', '13203', '13204', '13205', '13206', '13207', '13208',
  '13209', '13210', '13211', '13212', '13213', '13214', '13215', '13216'
])

// ---------------------------------------------------------------------------
// Données partagées (chargées une seule fois)
// ---------------------------------------------------------------------------
const communesData = require('../data/dataByCommune/communes.json')
const forestAreaRaw = require('../data/dataByCommune/surface-foret.csv.json')
const regionToInterRegion = require('../data/dataByCommune/region-to-inter-region.json')

// Préchauffage des fichiers
require('../data/dataByCommune/stocks-zpc.csv.json')
require('../data/dataByCommune/biomass-hors-forets.csv.json')
require('../data/dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json')
require('../data/dataByCommune/carbone-haies.csv.json')
require('../data/dataByCommune/haie-clc18.csv.json')
require('../data/dataByEpci/proportion-usage-bois-par-region.csv.json')

// Constantes produits bois
const FRANCE_HARVEST = getAnnualFranceWoodProductsHarvest()
const FRANCE_WOOD_STOCKS = getFranceStocksWoodProducts()
const FRANCE_POPULATION = getPopulationTotal()

// ---------------------------------------------------------------------------
// Index géographique par commune (métadonnées forêt)
// ---------------------------------------------------------------------------
const forestMetaByCommune = {}
forestAreaRaw.forEach((row) => {
  const code = String(row.INSEE_COM).padStart(5, '0')
  if (!forestMetaByCommune[code]) {
    forestMetaByCommune[code] = {
      groupe_ser: row.code_groupeser || '',
      greco: row.code_greco || '',
      rad_13: row.code_rad13 || '',
      bassin_populicole: row.code_bassin_populicole || ''
    }
  }
})

// ---------------------------------------------------------------------------
// Structures de colonnes
// ---------------------------------------------------------------------------
const NON_FOREST_TYPES = [
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

const FOREST_TYPES = [
  'forêt mixte',
  'forêt feuillu',
  'forêt conifere',
  'forêt peupleraie'
]

const HAIES_GT_KEYS = [
  ['cultures', 'cultures_haies_km'],
  ['prairies', 'prairies_haies_km'],
  ['zones humides', 'zones humides_haies_km'],
  ['vergers', 'vergers_haies_km'],
  ['vignes', 'vignes_haies_km'],
  ['sols artificiels', 'sols artificiels_haies_km'],
  ['forêts', 'forêts_haies_km']
]

// ---------------------------------------------------------------------------
// Construction des en-têtes
// ---------------------------------------------------------------------------
function buildHeaders () {
  const h = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole',
    'population', 'ratio_population_France', 'stock_tC'
  ]
  // Non-forest: 4 cols each
  NON_FOREST_TYPES.forEach((gt) => {
    h.push(`${gt}_surface_ha`)
    h.push(`${gt}_sol_stock_de_reference_tC_ha-1`)
    h.push(`${gt}_biomasse_stock_de_reference_tC_ha-1`)
    h.push(`${gt}_stock_total_tC`)
  })
  // Forest: 6 cols each
  FOREST_TYPES.forEach((ft) => {
    h.push(`${ft}_surface_ha`)
    h.push(`${ft}_sol_stock_de_reference_tC_ha-1`)
    h.push(`${ft}_biomasse_vivante_stock_de_reference_tC_ha-1`)
    h.push(`${ft}_biomasse_morte_stock_de_reference_tC_ha-1`)
    h.push(`${ft}_litiere_stock_de_reference_tC_ha-1`)
    h.push(`${ft}_stock_total_tC`)
  })
  // Haies
  h.push('haies_biomasse_stock_de_reference_tC_ha-1')
  h.push('haies_stock_total_tC')
  HAIES_GT_KEYS.forEach(([, col]) => h.push(col))
  // Produits bois
  h.push('bo_recolte_locale_m3_an-1')
  h.push('bo_ratio_recolte_France')
  h.push('bo_recolte_total_tC')
  h.push('bi_recolte_locale_m3_an-1')
  h.push('bi_ratio_recolte_France')
  h.push('bi_recolte_total_tC')
  h.push('produit_bois_recolte_total_tC')
  h.push('bo_consommation_total_tC')
  h.push('bi_consommation_total_tC')
  h.push('produit_bois_consommation_total_tC')
  return h
}

// ---------------------------------------------------------------------------
// Formatage CSV
// ---------------------------------------------------------------------------

function csvValue (v) {
  if (v === null || v === undefined || v === '') return ''
  const str = String(v)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// ---------------------------------------------------------------------------
// Génération principale
// ---------------------------------------------------------------------------
function generate (outputPath) {
  const headers = buildHeaders()
  const communes = Object.values(communesData).filter(
    (c) => !ARRONDISSEMENT_CODES.has(String(c.insee).padStart(5, '0'))
  )
  const total = communes.length

  console.log(`Traitement de ${total} communes…`)
  const lines = [headers.join(',')]

  communes.forEach((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }

    // inseeCode padded pour les lookups internes ; inseeOutput non-paddé pour le CSV
    // (le fichier de référence DATA ADEME stocke les codes comme entiers : 01001 → 1001)
    const inseeCode = String(commune.insee).padStart(5, '0')
    const inseeOutput = String(parseInt(commune.insee, 10))
    const forestMeta = forestMetaByCommune[inseeCode] || {}
    const interRegion = regionToInterRegion[String(commune.region)]?.interRegion || ''
    const population = commune.population || 0
    const ratioPopFrance = population / FRANCE_POPULATION

    // --- Stocks via le moteur de calcul ---
    let stocks
    try {
      stocks = getStocks([commune], {})
    } catch (err) {
      console.warn(`\nErreur stocks pour ${inseeCode}: ${err.message}`)
      return
    }

    // --- Produits bois récolte ---
    let woodHarvest
    try {
      woodHarvest = getAnnualWoodProductsHarvest({ commune })
    } catch (err) {
      console.warn(`\nErreur wood harvest pour ${inseeCode}: ${err.message}`)
      woodHarvest = { bo: 0, bi: 0 }
    }
    const boRatio = woodHarvest.bo / FRANCE_HARVEST.bo
    const biRatio = woodHarvest.bi / FRANCE_HARVEST.bi
    const boRecolte = boRatio * FRANCE_WOOD_STOCKS.bo
    const biRecolte = biRatio * FRANCE_WOOD_STOCKS.bi
    const boConsom = ratioPopFrance * FRANCE_WOOD_STOCKS.bo
    const biConsom = ratioPopFrance * FRANCE_WOOD_STOCKS.bi

    // --- Construction de la ligne ---
    const row = [
      inseeOutput,
      commune.nom,
      commune.epci || '',
      commune.departement || '',
      commune.region || '',
      commune.zpc || '',
      interRegion,
      forestMeta.groupe_ser,
      forestMeta.greco,
      forestMeta.rad_13,
      forestMeta.bassin_populicole,
      population,
      ratioPopFrance,
      stocks.total ?? ''
    ]

    // Non-forest types
    // Les surfaces viennent de commune.citepa2021 via getStocks() → s.area.
    // Chaque type de sol artificiel a sa propre surface dans CITEPA 2021 :
    // plus besoin du découpage 80/20 (logique CLC18 obsolète).
    NON_FOREST_TYPES.forEach((gt) => {
      const s = stocks[gt] || {}
      row.push(s.area ?? 0)
      row.push(s.groundDensity ?? 0)
      row.push(s.biomassDensity ?? 0)
      row.push(s.totalStock ?? 0)
    })

    // Forest types
    FOREST_TYPES.forEach((ft) => {
      const s = stocks[ft] || {}
      row.push(s.area ?? 0)
      row.push(s.groundDensity ?? 0)
      row.push(s.liveBiomassDensity ?? 0)
      row.push(s.deadBiomassDensity ?? 0)
      row.push(s.forestLitterDensity ?? 0)
      row.push(s.totalStock ?? 0)
    })

    // Haies
    const haies = stocks.haies || {}
    row.push(haies.biomassDensity ?? 0)
    row.push(haies.totalStock ?? 0)
    HAIES_GT_KEYS.forEach(([key]) => {
      row.push(haies.byGroundType?.[key] ?? 0)
    })

    // Produits bois
    row.push(woodHarvest.bo)
    row.push(boRatio)
    row.push(boRecolte)
    row.push(woodHarvest.bi)
    row.push(biRatio)
    row.push(biRecolte)
    row.push(boRecolte + biRecolte)
    row.push(boConsom)
    row.push(biConsom)
    row.push(boConsom + biConsom)

    lines.push(row.map(csvValue).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} communes  |  Colonnes : ${headers.length}`)
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
const outputFile = process.argv[2] || path.join(process.cwd(), 'stocks.csv')
generate(outputFile)
