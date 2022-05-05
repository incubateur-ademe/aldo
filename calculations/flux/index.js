const {
  getAnnualGroundCarbonFluxes,
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
  const allGroundFluxes = getAnnualGroundCarbonFluxes(location, options)
  const allFluxes = []
  for (const flux of allGroundFluxes) {
    const area = getAnnualSurfaceChange(location, flux.from, flux.to)
    const annualtC = flux.value * area * multiplier(flux.from)
    allFluxes.push({
      from: flux.from,
      to: flux.to,
      flux: flux.value,
      gas: 'C',
      reservoir: 'ground',
      area,
      value: annualtC,
      co2e: convertToCo2e(annualtC)
    })
  }
  return allFluxes
}

module.exports = {
  getAnnualFluxes
}
