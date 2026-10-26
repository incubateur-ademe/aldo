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
 *  - Produits bois     : calculations/stocks/woodProducts.ts
 *
 * Usage : node scripts/generate-stocks-csv.ts [chemin-de-sortie]
 * Par défaut : stocks.csv dans le répertoire courant
 */

import fs from 'node:fs'
import path from 'node:path'

import { getStocks, type Stocks } from '../calculations/stocks/index.ts'
import {
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest,
  getFranceStocksWoodProducts
} from '../data/stocks.ts'
import { getPopulationTotal } from '../data/index.ts'
import { communeMeta, communesToExport, csvValue, errorMessage, type CsvCell } from './shared.ts'
import { LEAF_GROUND_TYPES, has, type StocksId } from '../calculations/constants.ts'
import { FOREST_SUBTYPES } from '../data/shared.ts'

// Constantes produits bois
const FRANCE_HARVEST = getAnnualFranceWoodProductsHarvest()
const FRANCE_WOOD_STOCKS = getFranceStocksWoodProducts()
const FRANCE_POPULATION = getPopulationTotal()

// ---------------------------------------------------------------------------
// Structures de colonnes
// ---------------------------------------------------------------------------
export const NON_FOREST_TYPES = LEAF_GROUND_TYPES.map((gt) => gt.stocksId).filter((id) => !has(FOREST_SUBTYPES, id))
export const FOREST_TYPES = FOREST_SUBTYPES

export const HAIES_GT_KEYS: [StocksId, string][] = [
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
export function buildStocksHeaders () {
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

// Colonnes de stocks par occupation, haies et produits bois (après les métadonnées)
export function stocksColumns (stocks: Stocks, woodHarvest: { bo: number, bi: number }, ratioPopFrance: number): CsvCell[] {
  const row: CsvCell[] = [ratioPopFrance, stocks.total ?? '']

  // Non-forest types
  // Les surfaces viennent de commune.citepa2021 via getStocks() → s.area.
  // Chaque type de sol artificiel a sa propre surface dans CITEPA 2021 :
  // plus besoin du découpage 80/20 (logique CLC18 obsolète).
  NON_FOREST_TYPES.forEach((gt) => {
    const s = stocks[gt]
    row.push(s.area ?? 0)
    row.push(s.groundDensity ?? 0)
    row.push(s.biomassDensity ?? 0)
    row.push(s.totalStock ?? 0)
  })

  // Forest types
  FOREST_TYPES.forEach((ft) => {
    const s = stocks[ft]
    row.push(s.area ?? 0)
    row.push(s.groundDensity ?? 0)
    row.push(s.liveBiomassDensity ?? 0)
    row.push(s.deadBiomassDensity ?? 0)
    row.push(s.forestLitterDensity ?? 0)
    row.push(s.totalStock ?? 0)
  })

  // Haies
  const haies = stocks.haies
  row.push(haies.biomassDensity ?? 0)
  row.push(haies.totalStock ?? 0)
  HAIES_GT_KEYS.forEach(([key]) => {
    row.push(haies.byGroundType?.[key] ?? 0)
  })

  // Produits bois
  const boRatio = woodHarvest.bo / FRANCE_HARVEST.bo
  const biRatio = woodHarvest.bi / FRANCE_HARVEST.bi
  const boRecolte = boRatio * FRANCE_WOOD_STOCKS.bo
  const biRecolte = biRatio * FRANCE_WOOD_STOCKS.bi
  const boConsom = ratioPopFrance * FRANCE_WOOD_STOCKS.bo
  const biConsom = ratioPopFrance * FRANCE_WOOD_STOCKS.bi
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
  return row
}

// ---------------------------------------------------------------------------
// Génération principale
// ---------------------------------------------------------------------------
function generate (outputPath: string) {
  const headers = buildStocksHeaders()
  const communes = communesToExport()
  const total = communes.length

  console.log(`Traitement de ${total} communes…`)
  const lines = [headers.join(',')]

  communes.forEach((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }

    // inseeCode padded pour les lookups internes ; inseeOutput non-paddé pour le CSV
    // (le fichier de référence DATA ADEME stocke les codes comme entiers : 01001 → 1001 ;
    // les codes corses 2A/2B restent tels quels)
    const inseeCode = String(commune.insee).padStart(5, '0')
    const inseeOutput = /^\d+$/.test(commune.insee) ? String(Number(commune.insee)) : commune.insee
    const population = commune.population || 0
    const ratioPopFrance = population / FRANCE_POPULATION

    // --- Stocks via le moteur de calcul ---
    let stocks
    try {
      stocks = getStocks([commune], {})
    } catch (err) {
      console.warn(`\nErreur stocks pour ${inseeCode}: ${errorMessage(err)}`)
      throw err
    }

    // --- Produits bois récolte ---
    let woodHarvest
    try {
      woodHarvest = getAnnualWoodProductsHarvest({ commune })
    } catch (err) {
      console.warn(`\nErreur wood harvest pour ${inseeCode}: ${errorMessage(err)}`)
      throw err
    }

    const row = [
      ...communeMeta(commune, inseeOutput),
      ...stocksColumns(stocks, woodHarvest, ratioPopFrance)
    ]
    lines.push(row.map((v) => csvValue(v)).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} communes  |  Colonnes : ${headers.length}`)
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
if (process.argv[1] === import.meta.filename) {
  generate(process.argv[2] || path.join(process.cwd(), 'stocks.csv'))
}
