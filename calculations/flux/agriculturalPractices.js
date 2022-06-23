const { AgriculturalPractices } = require('../constants')
const { cToCo2e } = require('../../data/flux')

// if the flux data changes to be area-specific or fetched from an API in the future, move to /data
function getPracticeFlux (practice, reservoir) {
  // in tC/ha.an
  if (reservoir === 'sol') {
    // ground flux unitaires
    return {
      prairieExtension: 0.14,
      // prairieIntensification: 0.39, // currently not used in excel format
      cropsAgroforestry: 0.3,
      prairiesAgroforestry: 0.3,
      catchCrops: 0.24,
      cropsHedges: 0.06,
      prairiesHedges: 0.1,
      grassyStrips: 0.49,
      vineyardsInterCoverCropping: 0.32,
      orchardsInterCoverCropping: 0.49,
      directSowingContinuous: 0.15,
      directSowingFiveYearWork: 0.1
    }[practice]
  } else if (reservoir === 'biomasse') {
    // biomass flux unitaires
    return {
      prairieExtension: 0,
      // prairieIntensification: 0,
      cropsAgroforestry: 0.7,
      prairiesAgroforestry: 0.7,
      catchCrops: 0,
      cropsHedges: 0.09,
      prairiesHedges: 0.15,
      grassyStrips: 0,
      vineyardsInterCoverCropping: 0,
      orchardsInterCoverCropping: 0,
      directSowingContinuous: 0,
      directSowingFiveYearWork: 0
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
