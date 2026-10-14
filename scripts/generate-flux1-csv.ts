/**
 * Génère le fichier flux1 (changements de surfaces et flux de carbone par commune)
 * correspondant au fichier DATA ADEME : aldo-flux-total-et-surfaces-converties.csv
 *
 * Usage : node scripts/generate-flux1-csv.ts [chemin-de-sortie]
 * Par défaut le fichier est écrit dans le répertoire courant : flux1.csv
 */

import fs from 'node:fs'
import path from 'node:path'
import { getAnnualFluxes, type AnnualFluxes } from '../calculations/flux/index.ts'
import { GroundTypes, has, type StocksId } from '../calculations/constants.ts'
import { FOREST_SUBTYPES } from '../data/shared.ts'
import { INDICATEUR_HEADERS, getIndicateursSequestration } from './flux1-indicateurs.ts'
import { communeMeta, communesToExport, csvValue, errorMessage, type CsvCell } from './shared.ts'

// ---------------------------------------------------------------------------
// Types de sol utilisés pour les flux (même logique que l'export Excel)
// Ordre identique à la référence DATA ADEME
// ---------------------------------------------------------------------------
const fluxGroundTypes = GroundTypes.filter((gt) => gt.altFluxId || gt.fluxId)

// Ce qu'on garde d'un calcul de flux pour écrire une ligne
// (allFlux n'est pas conservé pour limiter la mémoire).
export interface Flux1Result {
  fluxCo2eByGroundType: AnnualFluxes['fluxCo2eByGroundType']
  areas: AnnualFluxes['areas']
  total: AnnualFluxes['total']
  indicateurs: [number, number, number]
}

export const EMPTY_FLUX1_RESULT: Flux1Result = { fluxCo2eByGroundType: {}, areas: {}, total: 0, indicateurs: [0, 0, 0] }

// Réduit le résultat de getAnnualFluxes et collecte dans `pairsWithCo2e` les
// paires ayant un flux tCO2e non nul (elles seules ont une colonne tCO2e).
export function flux1Result ({ allFlux, fluxCo2eByGroundType, areas, total }: AnnualFluxes, pairsWithCo2e: Set<string>): Flux1Result {
  Object.entries(fluxCo2eByGroundType).forEach(([from, tos]) => {
    Object.entries(tos).forEach(([to, co2e]) => {
      if (co2e) pairsWithCo2e.add(`${from}_vers_${to}`)
    })
  })
  return { fluxCo2eByGroundType, areas, total, indicateurs: getIndicateursSequestration(allFlux) }
}

// Paires (from, to) exportées, hors forêt -> forêt
// (les 12 paires forêt-vers-forêt sont absentes car traitées via la biomasse)
export function fluxPairs (): [StocksId, StocksId][] {
  const pairs: [StocksId, StocksId][] = []
  fluxGroundTypes.forEach((fromGt) => {
    fluxGroundTypes.forEach((toGt) => {
      if (fromGt.stocksId === toGt.stocksId) return
      if (has(FOREST_SUBTYPES, fromGt.stocksId) && has(FOREST_SUBTYPES, toGt.stocksId)) return
      pairs.push([fromGt.stocksId, toGt.stocksId])
    })
  })
  return pairs
}

// ---------------------------------------------------------------------------
// Construction des en-têtes CSV
// ---------------------------------------------------------------------------
export function buildFlux1Headers (pairsWithCo2e: Set<string>) {
  const headers = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole',
    'population', 'flux_tCO2e_an-1'
  ]
  fluxPairs().forEach(([from, to]) => {
    const pairKey = `${from}_vers_${to}`
    headers.push(`${pairKey}_surface_ha_an-1`)
    if (pairsWithCo2e.has(pairKey)) {
      headers.push(`${pairKey}_tCO2e_an-1`)
    }
  })
  headers.push(...INDICATEUR_HEADERS)
  return headers
}

// Colonnes de flux (après les métadonnées)
export function flux1Columns ({ fluxCo2eByGroundType, areas, total, indicateurs }: Flux1Result, pairsWithCo2e: Set<string>): CsvCell[] {
  const row: CsvCell[] = [total ?? '']
  fluxPairs().forEach(([from, to]) => {
    const pairKey = `${from}_vers_${to}`
    row.push(areas[from]?.[to]?.area ?? 0)
    if (pairsWithCo2e.has(pairKey)) {
      row.push(fluxCo2eByGroundType[from]?.[to] ?? '')
    }
  })
  row.push(...indicateurs)
  return row
}

// ---------------------------------------------------------------------------
// Génération principale
// ---------------------------------------------------------------------------
function generate (outputPath: string) {
  const communes = communesToExport()
  const total = communes.length

  console.log(`Traitement de ${total} communes…`)

  // 1er passage : calcul des flux, et collecte des paires ayant un flux tCO2e
  // non nul pour au moins une commune (elles seules ont une colonne tCO2e).
  // Les 3 paires ci-dessous, toujours nulles, sont conservées pour rester
  // compatible avec le fichier de référence DATA ADEME.
  const pairsWithCo2e = new Set([
    'sols artificiels imperméabilisés_vers_sols artificiels arborés et buissonants',
    'sols artificiels arborés et buissonants_vers_sols artificiels arbustifs',
    'sols artificiels arborés et buissonants_vers_sols artificiels imperméabilisés'
  ])
  const results = communes.map((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }
    try {
      return flux1Result(getAnnualFluxes([commune]), pairsWithCo2e)
    } catch (err) {
      console.warn(`\nErreur pour commune ${commune.insee}: ${errorMessage(err)}`)
      return EMPTY_FLUX1_RESULT
    }
  })
  process.stdout.write(`\r  ${total}/${total}\n`)

  // 2e passage : écriture des lignes
  // Le fichier de référence DATA ADEME utilise le format QUOTE_ALL.
  const headers = buildFlux1Headers(pairsWithCo2e)
  const lines = [headers.map((h) => '"' + h + '"').join(',')]

  communes.forEach((commune, index) => {
    const inseeCode = String(commune.insee).padStart(5, '0')
    const row = [
      ...communeMeta(commune, inseeCode),
      ...flux1Columns(results[index]!, pairsWithCo2e)
    ]
    lines.push(row.map((v) => csvValue(v, true)).join(','))
  })

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} communes  |  Colonnes : ${headers.length}`)
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
if (process.argv[1] === import.meta.filename) {
  generate(process.argv[2] || path.join(process.cwd(), 'flux1.csv'))
}
