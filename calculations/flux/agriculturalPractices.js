const { AgriculturalPractices } = require('../constants')
const { cToCo2e } = require('../../data/flux')

// if the flux data changes to be area-specific or fetched from an API in the future, move to /data
function getPracticeFlux (practice, reservoir) {
  // in tC/ha.an
  if (reservoir === 'sol') {
    // ground flux unitaires
    return {
      vineyardsInterCoverCropping: 0.32
    }[practice]
  } else if (reservoir === 'biomasse') {
    // biomass flux unitaires
    return {
    }[practice]
  }
}

function getFluxAgriculturalPractices (areas) {
  const fluxes = []
  if (!areas) return fluxes
  Object.keys(areas).forEach(practice => {
    const area = areas[practice]
    const practiceDetail = AgriculturalPractices.find(ap => ap.id === practice)
    const reservoirs = ['sol', 'biomasse']
    reservoirs.forEach(reservoir => {
      const flux = getPracticeFlux(practice, reservoir)
      const value = flux * area
      if (value) {
        fluxes.push({
          practice,
          to: practiceDetail.groundType,
          area,
          areaModified: area !== 0,
          reservoir,
          gas: 'C',
          flux,
          fluxEquivalent: cToCo2e(flux),
          value,
          co2e: cToCo2e(value)
        })
      }
    })
  })
  return fluxes
}

module.exports = {
  getFluxAgriculturalPractices
}
