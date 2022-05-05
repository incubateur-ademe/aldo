const {
  getAllAnnualFluxes,
  getAnnualSurfaceChange
} = require('../../data/flux')

function convertToCo2e (valueC) {
  return valueC * 44 / 12
}

function multiplier (from) {
  const noMultiplier = ['vergers', 'vignes', 'zones humides']
  if (noMultiplier.includes(from)) {
    return 1
  } else {
    return 20
  }
}

function getAnnualFluxes (location, options) {
  const allFluxes = getAllAnnualFluxes(location, options)
  allFluxes.forEach((flux) => {
    const area = getAnnualSurfaceChange(location, flux.from, flux.to)
    flux.area = area
    if (flux.reservoir === 'ground' && flux.gas === 'C') {
      const annualtC = flux.flux * area * multiplier(flux.from)
      flux.value = annualtC
    } else {
      const annualtC = flux.flux * area
      flux.value = annualtC
    }
    flux.co2e = convertToCo2e(flux.value)
  })
  return allFluxes
}

module.exports = {
  getAnnualFluxes
}
