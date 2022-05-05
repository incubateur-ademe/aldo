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

function convertN2O (flux) {
  return flux < 0 ? -flux / 15 * 0.01 * 44 / 25 - flux / 15 * 0.3 * 0.0075 * 44 / 28 : undefined
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
    if (flux.gas === 'C') {
      flux.co2e = convertToCo2e(flux.value)
    } else {
      flux.co2e = flux.value
    }
  })
  // need to do a second pass because N2O calculation requires the sum of ground and litter values
  const groundFluxes = allFluxes.filter(flux => flux.reservoir === 'ground')
  groundFluxes.forEach((groundFlux) => {
    const litterFlux = allFluxes.find(flux => flux.reservoir === 'litter' && flux.from === groundFlux.from && flux.to === groundFlux.to) || {}
    const groundFluxValue = groundFlux.value || 0
    const litterFluxValue = litterFlux.value || 0
    if (groundFluxValue + litterFluxValue < 0) {
      // decided to keep this grouping because N2O only tracked if emitted
      allFluxes.push({
        from: groundFlux.from,
        to: groundFlux.to,
        value: convertN2O(groundFluxValue + litterFluxValue),
        gas: 'N2O'
        // flux and reservoir don't make much sense here
      })
    }
  })
  return allFluxes
}

module.exports = {
  getAnnualFluxes
}
