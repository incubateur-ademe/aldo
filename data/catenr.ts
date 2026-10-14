// Accès aux données de référence utilisées par la version « light » de l'outil
// CAT'ENR : stocks et flux ALDO de la commune, cinétiques CAT'ENR.
import {
  getCarbonDensity,
  getBiomassCarbonDensity,
  getForestBiomassCarbonDensities,
  getForestLitterCarbonDensity
} from './stocks.ts'
import {
  getAnnualGroundCarbonFlux,
  getBiomassFlux,
  getForestLitterFlux,
  getForestBiomassFluxesByCommune,
  yearMultiplier,
  cToCo2e
} from './flux.ts'
import { Occupations, SolNames, StocksColumns, type Occupation, type SolName } from '../calculations/catenr/constants.ts'
import { has, type ForestSubtype, type StocksId } from '../calculations/constants.ts'
import { FOREST_SUBTYPES } from './shared.ts'
import CINETIQUES from './catenr/cinetiques.json' with { type: 'json' }
import DUREE_STOCK_BIOMASSE from './catenr/duree-stock-biomasse.json' with { type: 'json' }
import type { Commune, Location } from './types.ts'

// Occupation CAT'ENR -> stocksId ALDO
export function toAldo (occupation: Occupation | undefined): StocksId | undefined {
  return Occupations.find((o) => o.id === occupation)?.aldo
}

export function isForest (occupation: string | undefined): occupation is ForestSubtype {
  return has(FOREST_SUBTYPES, occupation)
}

// Nom mutualisé utilisé par les stocks dans les sols et la litière
export function solName (aldoOccupation: StocksId | undefined): SolName | undefined {
  if (!aldoOccupation) return undefined
  return SolNames[aldoOccupation] || aldoOccupation
}

// Stock de référence dans les sols, en tC/ha
export function getSoilStock (commune: Commune, occupation: Occupation) {
  const name = solName(toAldo(occupation))
  const column = name && StocksColumns[name]
  if (!column) return 0
  return getCarbonDensity(commune, column) || 0
}

// Stock de référence dans la litière, en tC/ha. Seules les forêts en ont.
export function getLitterStock (occupation: Occupation) {
  const aldo = toAldo(occupation)
  if (!isForest(aldo)) return 0
  return getForestLitterCarbonDensity(aldo.replace('forêt ', ''))
}

// Stock de référence dans la biomasse, en tC/ha
export function getBiomassStock (location: Location, occupation: Occupation) {
  const aldo = toAldo(occupation)
  if (!aldo) return 0
  if (isForest(aldo)) {
    const densities = getForestBiomassCarbonDensities(location, aldo)
    return densities.live + densities.dead
  }
  return getBiomassCarbonDensity(location, aldo) || 0
}

// Flux de référence dans les sols pour un changement d'occupation, en tCO2/ha.
// Correspond à la table Aldo_Flux de CAT'ENR (flux annuel ALDO x durée ALDO x 44/12).
export function getSoilFluxReference (location: Location, from: Occupation, to: Occupation) {
  const aldoFrom = toAldo(from)
  const aldoTo = toAldo(to)
  if (!aldoFrom || !aldoTo || solName(aldoFrom) === solName(aldoTo)) return 0
  const annualFlux = getAnnualGroundCarbonFlux(location, aldoFrom, aldoTo)
  if (!annualFlux) return 0
  return cToCo2e(annualFlux * (yearMultiplier('sol', aldoFrom, aldoTo) ?? 1))
}

// Flux de référence dans la litière, en tCO2/ha
export function getLitterFluxReference (from: Occupation, to: Occupation) {
  const aldoFrom = toAldo(from)
  const aldoTo = toAldo(to)
  if (!aldoFrom || !aldoTo) return 0
  return cToCo2e(getForestLitterFlux(aldoFrom, aldoTo) || 0)
}

// Flux de référence dans la biomasse, en tCO2/ha.
// Le boisement (occupation finale forestière) n'utilise pas cette valeur mais
// l'accroissement biologique renvoyé par getForestBiomassGrowth.
export function getBiomassFluxReference (location: Location, from: Occupation, to: Occupation) {
  const aldoFrom = toAldo(from)
  const aldoTo = toAldo(to)
  if (!aldoFrom || !aldoTo || aldoFrom === aldoTo) return 0
  if (isForest(aldoFrom)) {
    // déboisement : la biomasse forestière est perdue immédiatement
    const densities = getForestBiomassCarbonDensities(location, aldoFrom)
    const initialDensity = densities.live + densities.dead
    return cToCo2e((getBiomassCarbonDensity(location, aldoTo) || 0) - initialDensity)
  }
  const annualFlux = getBiomassFlux(location, aldoFrom, aldoTo)
  if (!annualFlux) return 0
  return cToCo2e(annualFlux * (yearMultiplier('biomasse', aldoFrom, aldoTo) || 1))
}

// Accroissement biologique de la biomasse forestière, en tCO2/ha/an,
// moyenné sur les surfaces forestières de la localisation.
export function getForestBiomassGrowth (location: Location, forestSubtype: Occupation) {
  const aldo = toAldo(forestSubtype)
  if (!isForest(aldo)) return 0
  const fluxes = getForestBiomassFluxesByCommune(location).filter((flux) => flux.to === aldo)
  if (!fluxes.length) return 0
  const totalArea = fluxes.reduce((sum, flux) => sum + (flux.area || 0), 0)
  if (!totalArea) {
    return fluxes.reduce((sum, flux) => sum + (flux.annualFluxEquivalent ?? 0), 0) / fluxes.length
  }
  return fluxes.reduce((sum, flux) => sum + (flux.annualFluxEquivalent ?? 0) * (flux.area ?? 0), 0) / totalArea
}

// Cinétique CAT'ENR du changement d'occupation, en années. 0 = flux immédiat.
export function getKinetics (from: Occupation, to: Occupation, reservoir: 'Sol' | 'Litière') {
  const aldoFrom = toAldo(from)
  const aldoTo = toAldo(to)
  if (!aldoFrom || !aldoTo) return 0
  return CINETIQUES[`${aldoFrom}_vers_${aldoTo}_${reservoir}`] || 0
}

// Durée de référence du stockage dans la biomasse, en années.
// Renvoie undefined pour les occupations sans biomasse pérenne (cultures, vignes...).
export function getBiomassStockDuration (occupation: Occupation): number | undefined {
  const aldo = toAldo(occupation)
  if (!aldo) return undefined
  return DUREE_STOCK_BIOMASSE[aldo] ?? DUREE_STOCK_BIOMASSE[solName(aldo) ?? '']
}
