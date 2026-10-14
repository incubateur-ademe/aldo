/**
 * Génère le fichier flux2 (flux unitaires par commune)
 * correspondant au fichier DATA ADEME : aldo-flux-unitaire
 *
 * Les colonnes contiennent les flux de référence unitaires (tCO2e/ha) pour chaque
 * changement d'occupation du sol selon le réservoir (sol, biomasse, litière).
 *
 * Sources :
 *  - Sol        : data/dataByCommune/flux-zpc.csv (par ZPC)
 *  - Biomasse   : data/dataByCommune/biomass-hors-forets.csv (par inter-région)
 *                 + données IGN pour la déforestation (forêt → non-forêt)
 *  - Litière    : ±9 tC/ha × 44/12 = ±33 tCO2e/ha (paires impliquant une forêt, via getFluxReferenceValues)
 *
 * Usage : node scripts/generate-flux2-csv.ts [chemin-de-sortie]
 * Par défaut : flux2.csv dans le répertoire courant
 */

import fs from 'node:fs'
import path from 'node:path'

import { GroundTypes, has, type StocksId } from '../calculations/constants.ts'
import { getFluxReferenceValues, cToCo2e } from '../data/flux.ts'
import {
  getBiomassCarbonDensity,
  getForestBiomassCarbonDensities,
  getForestAreaData
} from '../data/stocks.ts'
import { FOREST_SUBTYPES } from '../data/shared.ts'
import type { Location } from '../data/types.ts'
import { communeMeta, communesToExport, csvValue, errorMessage, type CsvCell } from './shared.ts'

// ---------------------------------------------------------------------------
// Types de sol utilisés pour les flux
// ---------------------------------------------------------------------------
const fluxGroundTypes = GroundTypes.filter((gt) => gt.altFluxId || gt.fluxId)

// ---------------------------------------------------------------------------
// Construction des en-têtes (même structure que le fichier de référence DATA ADEME)
//
// Pour chaque paire (from, to) hors forêt->forêt :
//   - toujours : _sol_tCO2e_ha-1 et _biomasse_tCO2e_ha-1
//   - si la paire implique une forêt : _litiere_tCO2e_ha-1
//
// Les paires suivantes ont une colonne litière dans la référence DATA ADEME
// (légèrement différent de getForestLitterFlux actuel) :
//   - non-forêt → forêt (y compris sols_arborés et sols_imperméabilisés en from)
//   - forêt → non-forêt (y compris forêt → sols_arborés)
// ---------------------------------------------------------------------------
function hasLitiere (fromId: StocksId, toId: StocksId) {
  const fromIsForet = has(FOREST_SUBTYPES, fromId)
  const toIsForet = has(FOREST_SUBTYPES, toId)
  return fromIsForet !== toIsForet
}

export function flux2Pairs (): [StocksId, StocksId][] {
  const pairs: [StocksId, StocksId][] = []
  fluxGroundTypes.forEach((fromGt) => {
    fluxGroundTypes.forEach((toGt) => {
      const fromId = fromGt.stocksId
      const toId = toGt.stocksId
      if (fromId === toId) return
      if (has(FOREST_SUBTYPES, fromId) && has(FOREST_SUBTYPES, toId)) return
      pairs.push([fromId, toId])
    })
  })
  return pairs
}

export const FLUX2_META_COLS = 12 // colonnes de métadonnées toujours conservées

export function buildFlux2Headers () {
  const headers = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole', 'population'
  ]
  flux2Pairs().forEach(([fromId, toId]) => {
    const pairKey = `${fromId}_vers_${toId}`
    headers.push(`${pairKey}_sol_tCO2e_ha-1`)
    headers.push(`${pairKey}_biomasse_tCO2e_ha-1`)
    if (hasLitiere(fromId, toId)) {
      headers.push(`${pairKey}_litiere_tCO2e_ha-1`)
    }
  })
  return headers
}

// ---------------------------------------------------------------------------
// Calcul des flux unitaires pour une commune
// Retourne un Map : "{from}||{to}||{reservoir}" → valeur tCO2e/ha
// ---------------------------------------------------------------------------
export function computeUnitFluxes (location: Location) {
  const unitFluxMap = new Map<string, number>()

  // --- Sol, biomasse (non-forêt), litière via getFluxReferenceValues ---
  const refFluxes = getFluxReferenceValues(location)
  refFluxes.forEach((f) => {
    if (!f.from || !f.to) return // forêt biomasse growth (pas de "from")
    const key = `${f.from}||${f.to}||${f.reservoir}`
    unitFluxMap.set(key, cToCo2e((f.annualFlux ?? 0) * (f.yearsForFlux || 1)))
  })

  // --- Biomasse déforestation (forêt → non-forêt) via données IGN ---
  const areaData = getForestAreaData(location)
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes.filter((gt) => !gt.children && !has(excludeIds, gt.stocksId))

  FOREST_SUBTYPES.forEach((fromId) => {
    const forestBiomassDensities = getForestBiomassCarbonDensities(location, fromId, areaData)
    const initialBiomassDensity = forestBiomassDensities.live + forestBiomassDensities.dead

    childGroundTypes.forEach((toGt) => {
      const toId = toGt.stocksId
      if (has(FOREST_SUBTYPES, toId)) return

      const biomassDensity = getBiomassCarbonDensity(location, toId)
      if (biomassDensity === undefined) return
      unitFluxMap.set(`${fromId}||${toId}||biomasse`, cToCo2e(biomassDensity - initialBiomassDensity))
    })
  })

  return unitFluxMap
}

// Colonnes de flux unitaires (après les métadonnées)
export function flux2Columns (unitFluxMap: Map<string, number>): CsvCell[] {
  const row: CsvCell[] = []
  flux2Pairs().forEach(([fromId, toId]) => {
    row.push(unitFluxMap.get(`${fromId}||${toId}||sol`) ?? '')
    row.push(unitFluxMap.get(`${fromId}||${toId}||biomasse`) ?? '')
    if (hasLitiere(fromId, toId)) {
      row.push(unitFluxMap.get(`${fromId}||${toId}||litière`) ?? '')
    }
  })
  return row
}

// Retire les colonnes entièrement vides (transitions impossibles) : le fichier de
// référence DATA ADEME ne contient que les colonnes avec au moins une valeur non vide.
export function writeWithoutEmptyColumns (outputPath: string, headers: string[], rows: CsvCell[][], label: string) {
  const colCount = headers.length
  const emptyCols = new Set<number>()

  for (let c = FLUX2_META_COLS; c < colCount; c++) {
    const allEmpty = rows.every((row) => row[c] === '' || row[c] === undefined || row[c] === null)
    if (allEmpty) emptyCols.add(c)
  }

  const keepIndices: number[] = []
  for (let c = 0; c < colCount; c++) {
    if (!emptyCols.has(c)) keepIndices.push(c)
  }

  if (emptyCols.size > 0) {
    console.log(`Colonnes vides retirées : ${emptyCols.size} (${colCount} → ${keepIndices.length})`)
  }

  const lines = [keepIndices.map((c) => headers[c]).join(',')]
  for (const row of rows) {
    lines.push(keepIndices.map((c) => csvValue(row[c] ?? '')).join(','))
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${rows.length} ${label}  |  Colonnes : ${keepIndices.length}`)
}

// ---------------------------------------------------------------------------
// Génération principale
// ---------------------------------------------------------------------------
function generate (outputPath: string) {
  const headers = buildFlux2Headers()
  const communes = communesToExport()
  const total = communes.length

  console.log(`Traitement de ${total} communes…`)
  const rows: CsvCell[][] = [] // tableau de tableaux (valeurs brutes)

  communes.forEach((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }

    const location = { commune }
    let unitFluxMap
    try {
      unitFluxMap = computeUnitFluxes(location)
    } catch (err) {
      console.warn(`\nErreur pour commune ${commune.insee}: ${errorMessage(err)}`)
      unitFluxMap = new Map<string, number>()
    }

    const inseeCode = String(commune.insee).padStart(5, '0')
    rows.push([
      ...communeMeta(commune, inseeCode),
      ...flux2Columns(unitFluxMap)
    ])
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  writeWithoutEmptyColumns(outputPath, headers, rows, 'communes')
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
if (process.argv[1] === import.meta.filename) {
  generate(process.argv[2] || path.join(process.cwd(), 'flux2.csv'))
}
