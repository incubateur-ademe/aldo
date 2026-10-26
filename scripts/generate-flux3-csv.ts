/**
 * Génère le fichier flux3 (accroissement biomasse forêt + produits bois)
 * correspondant au fichier DATA ADEME :
 *   aldo-flux-annuels-lies-a-laccroissement-net-de-la-biomasse-en-forets
 *
 * Pour chaque commune, par type forestier (mixte, feuillu, conifère, peupleraie) :
 *   - surface (ha)
 *   - accroissement biologique unitaire (m3 BFT/ha/an)
 *   - mortalité biologique unitaire (m3 BFT/ha/an)
 *   - prélèvements de bois unitaires (m3 BFT/ha/an)
 *   - bilan total unitaire (m3 BFT/ha/an)
 *   - facteur de conversion (tC/m3 BFT)
 *   - flux unitaire d'accroissement (tCO2e/ha/an)
 *   - flux d'accroissement (tCO2e/an)
 * Puis les flux annuels de produits bois récolte & consommation (tCO2e/an).
 *
 * Sources :
 *  - Biomasse forêt  : data/dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv
 *  - Surfaces forêt  : data/dataByCommune/surface-foret.csv
 *  - Produits bois   : calculations/flux/woodProducts.ts
 *
 * Usage : node scripts/generate-flux3-csv.ts [chemin-de-sortie]
 * Par défaut : flux3.csv dans le répertoire courant
 */

import fs from 'node:fs'
import path from 'node:path'

import { getForestBiomassFluxesByCommune, cToCo2e } from '../data/flux.ts'
import { getFluxWoodProducts } from '../calculations/flux/woodProducts.ts'
import { FOREST_SUBTYPES } from '../data/shared.ts'
import type { ForestSubtype } from '../calculations/constants.ts'
import type { Location } from '../data/types.ts'
import { communeMeta, communesToExport, csvValue, errorMessage, type CsvCell } from './shared.ts'

// ---------------------------------------------------------------------------
// Construction des en-têtes (structure identique à la référence)
// ---------------------------------------------------------------------------
export function buildFlux3Headers () {
  const headers = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole', 'population'
  ]
  FOREST_SUBTYPES.forEach((ft) => {
    headers.push(`${ft}_surface_ha`)
    headers.push(`${ft}_accroissement_biologique_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_mortalite_biologique_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_prelevements_de_bois_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_bilan_total_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_facteur_de_conversion_tC_m3_BFT-1`)
    if (ft === 'forêt peupleraie') {
      headers.push(`${ft}_aflux_total_unitaire_tCO2e_ha-1_an-1`)
    } else {
      headers.push(`${ft}_flux_total_unitaire_tCO2e_ha-1_an-1`)
    }
    headers.push(`${ft}_flux_tCO2e_an-1`)
  })
  headers.push('bo_recolte_flux_tCO2e_an-1')
  headers.push('bi_recolte_flux_tCO2e_an-1')
  headers.push('total_recolte_flux_tCO2e_an-1')
  headers.push('bo_consommation_flux_tCO2e_an-1')
  headers.push('bi_consommation_flux_tCO2e_an-1')
  headers.push('total_consommation_flux_tCO2e_an-1')
  return headers
}

interface ForestBiomass {
  surface: number
  growth: number
  mortality: number
  timber: number
  bilan: number
  conv: number
  fluxUnitaireTCO2e: number
  fluxTotalTCO2e: number
}

const EMPTY_FOREST_BIOMASS: ForestBiomass = {
  surface: 0, growth: 0, mortality: 0, timber: 0, bilan: 0, conv: 0, fluxUnitaireTCO2e: 0, fluxTotalTCO2e: 0
}

// ---------------------------------------------------------------------------
// Agrégation des données biomasse forêt pour une commune
//
// getForestBiomassFluxesByCommune peut retourner plusieurs lignes par
// type forestier (une par zone IGN d'appartenance). On effectue une
// moyenne pondérée par surface pour obtenir des valeurs unitaires.
// ---------------------------------------------------------------------------
export function aggregateForestBiomass (location: Location): Record<ForestSubtype, ForestBiomass> {
  const rows = getForestBiomassFluxesByCommune(location)
  const result = {} as Record<ForestSubtype, ForestBiomass>
  FOREST_SUBTYPES.forEach((ft) => {
    const typeRows = rows.filter((r) => r.to === ft)
    const totalArea = typeRows.reduce((s, r) => s + (r.area ?? 0), 0)
    if (totalArea === 0 || typeRows.length === 0) {
      result[ft] = { ...EMPTY_FOREST_BIOMASS }
      return
    }
    const w = (field: 'annualFlux' | 'growth' | 'mortality' | 'timberExtraction' | 'fluxMeterCubed' | 'conversionFactor') =>
      typeRows.reduce((s, r) => s + (r[field] ?? 0) * (r.area ?? 0), 0) / totalArea

    result[ft] = {
      surface: totalArea,
      growth: w('growth'),
      mortality: w('mortality'),
      timber: w('timberExtraction'),
      bilan: w('fluxMeterCubed'),
      conv: w('conversionFactor'),
      fluxUnitaireTCO2e: cToCo2e(w('annualFlux')),
      fluxTotalTCO2e: typeRows.reduce((s, r) => s + (r.annualFluxEquivalent ?? 0) * (r.area ?? 0), 0)
    }
  })
  return result
}

// Colonnes biomasse forêt (après les métadonnées)
export function forestColumns (forestBiomass: Record<ForestSubtype, ForestBiomass>): CsvCell[] {
  const row: CsvCell[] = []
  FOREST_SUBTYPES.forEach((ft) => {
    const d = forestBiomass[ft]
    row.push(d.surface, d.growth, d.mortality, d.timber, d.bilan, d.conv, d.fluxUnitaireTCO2e, d.fluxTotalTCO2e)
  })
  return row
}

// Colonnes produits bois : flux annuels récolte puis consommation (tCO2e/an)
export function woodColumns (location: Location): CsvCell[] {
  const recolte = getFluxWoodProducts(location)
  const consom = getFluxWoodProducts(location, 'consommation')
  const boRecolte = recolte.find((r) => r.category === 'bo')?.co2e ?? 0
  const biRecolte = recolte.find((r) => r.category === 'bi')?.co2e ?? 0
  const boConsom = consom.find((r) => r.category === 'bo')?.co2e ?? 0
  const biConsom = consom.find((r) => r.category === 'bi')?.co2e ?? 0
  return [boRecolte, biRecolte, boRecolte + biRecolte, boConsom, biConsom, boConsom + biConsom]
}

// ---------------------------------------------------------------------------
// Génération principale
// ---------------------------------------------------------------------------
function generate (outputPath: string) {
  const headers = buildFlux3Headers()
  const communes = communesToExport()
  const total = communes.length

  console.log(`Traitement de ${total} communes…`)
  const lines = [headers.join(',')]

  communes.forEach((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }

    const location = { commune }
    const inseeCode = String(commune.insee).padStart(5, '0')

    let forestBiomass
    try {
      forestBiomass = aggregateForestBiomass(location)
    } catch (err) {
      console.warn(`\nErreur biomasse pour ${inseeCode}: ${errorMessage(err)}`)
      throw err
    }

    let wood: CsvCell[]
    try {
      wood = woodColumns(location)
    } catch (err) {
      console.warn(`\nErreur produits bois pour ${inseeCode}: ${errorMessage(err)}`)
      throw err
    }

    lines.push([...communeMeta(commune, inseeCode), ...forestColumns(forestBiomass), ...wood].map((v) => csvValue(v)).join(','))
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
  generate(process.argv[2] || path.join(process.cwd(), 'flux3.csv'))
}
