// Accès aux données de référence utilisées par la version « light » de l'outil
// CAT'ENR : stocks et flux ALDO de la commune, cinétiques CAT'ENR.
const {
  getCarbonDensity,
  getBiomassCarbonDensity,
  getForestBiomassCarbonDensities,
  getForestLitterCarbonDensity
} = require('./stocks')
const {
  getAnnualGroundCarbonFlux,
  getBiomassFlux,
  getForestLitterFlux,
  getForestBiomassFluxesByCommune,
  yearMultiplier,
  cToCo2e
} = require('./flux')
const { Occupations, SolNames, StocksColumns } = require('../calculations/catenr/constants')

const CINETIQUES = require('./catenr/cinetiques.json')
const DUREE_STOCK_BIOMASSE = require('./catenr/duree-stock-biomasse.json')

// Occupation CAT'ENR -> stocksId ALDO
function toAldo (occupation) {
  return Occupations.find((o) => o.id === occupation)?.aldo
}

function isForest (occupation) {
  return !!occupation && occupation.startsWith('forêt')
}

// Nom mutualisé utilisé par les stocks dans les sols et la litière
function solName (aldoOccupation) {
  return SolNames[aldoOccupation] || aldoOccupation
}

// Stock de référence dans les sols, en tC/ha
function getSoilStock (commune, occupation) {
  const column = StocksColumns[solName(toAldo(occupation))]
  if (!column) return 0
  return getCarbonDensity(commune, column) || 0
}

// Stock de référence dans la litière, en tC/ha. Seules les forêts en ont.
function getLitterStock (occupation) {
  const aldo = toAldo(occupation)
  if (!isForest(aldo)) return 0
  return getForestLitterCarbonDensity(aldo.replace('forêt ', ''))
}

// Stock de référence dans la biomasse, en tC/ha
function getBiomassStock (location, occupation) {
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
function getSoilFluxReference (location, from, to) {
  const aldoFrom = toAldo(from)
  const aldoTo = toAldo(to)
  if (!aldoFrom || !aldoTo || solName(aldoFrom) === solName(aldoTo)) return 0
  const annualFlux = getAnnualGroundCarbonFlux(location, aldoFrom, aldoTo)
  if (!annualFlux) return 0
  return cToCo2e(annualFlux * yearMultiplier('sol', aldoFrom, aldoTo))
}

// Flux de référence dans la litière, en tCO2/ha
function getLitterFluxReference (from, to) {
  const aldoFrom = toAldo(from)
  const aldoTo = toAldo(to)
  if (!aldoFrom || !aldoTo) return 0
  return cToCo2e(getForestLitterFlux(aldoFrom, aldoTo) || 0)
}

// Flux de référence dans la biomasse, en tCO2/ha.
// Le boisement (occupation finale forestière) n'utilise pas cette valeur mais
// l'accroissement biologique renvoyé par getForestBiomassGrowth.
function getBiomassFluxReference (location, from, to) {
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
function getForestBiomassGrowth (location, forestSubtype) {
  const aldo = toAldo(forestSubtype)
  if (!isForest(aldo)) return 0
  const fluxes = getForestBiomassFluxesByCommune(location).filter((flux) => flux.to === aldo)
  if (!fluxes.length) return 0
  const totalArea = fluxes.reduce((sum, flux) => sum + (flux.area || 0), 0)
  if (!totalArea) {
    return fluxes.reduce((sum, flux) => sum + flux.annualFluxEquivalent, 0) / fluxes.length
  }
  return fluxes.reduce((sum, flux) => sum + flux.annualFluxEquivalent * flux.area, 0) / totalArea
}

// Cinétique CAT'ENR du changement d'occupation, en années. 0 = flux immédiat.
function getKinetics (from, to, reservoir) {
  const aldoFrom = toAldo(from)
  const aldoTo = toAldo(to)
  if (!aldoFrom || !aldoTo) return 0
  return CINETIQUES[`${aldoFrom}_vers_${aldoTo}_${reservoir}`] || 0
}

// Durée de référence du stockage dans la biomasse, en années.
// Renvoie undefined pour les occupations sans biomasse pérenne (cultures, vignes...).
function getBiomassStockDuration (occupation) {
  const aldo = toAldo(occupation)
  return DUREE_STOCK_BIOMASSE[aldo] ?? DUREE_STOCK_BIOMASSE[solName(aldo)]
}

module.exports = {
  toAldo,
  isForest,
  solName,
  getSoilStock,
  getLitterStock,
  getBiomassStock,
  getSoilFluxReference,
  getLitterFluxReference,
  getBiomassFluxReference,
  getForestBiomassGrowth,
  getKinetics,
  getBiomassStockDuration
}
