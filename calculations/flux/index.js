const {
  getAllAnnualFluxes,
  getAnnualSurfaceChange
} = require('../../data/flux')
const { GroundTypes } = require('../constants')

function convertCToCo2e (valueC) {
  return valueC * 44 / 12
}

function convertN2oToCo2e (valueC) {
  return valueC * 298
}

function multiplier (reservoir, from, to) {
  const multiplier = 20
  if (reservoir === 'ground') {
    // order of statements is important (see below)
    if (from === 'sols artificiels imperméabilisés') {
      return multiplier
    } else if (to === 'sols artificiels imperméabilisés') {
      return 1
    } else if (from === 'zones humides' || to === 'zones humides') {
      return 1
    } else if (to === 'sols artificiels arborés et buissonants') {
      return 1
    } else if (from === 'sols artificiels arbustifs') {
      return multiplier
    } else if (to === 'sols artificiels arbustifs') {
      return 1
    } else if (from === 'sols artificiels arborés et buissonants') {
      return multiplier
    } else if (from === 'forêts' || to === 'forêts') {
      return multiplier
    } else if (from.startsWith('prairies') || to.startsWith('prairies')) {
      return multiplier
    } else if (from === 'cultures') {
      return multiplier
    } else if (to === 'cultures' || to === 'vergers' || to === 'vignes') {
      return 1
    }
  } else if (reservoir === 'biomass') {
    // NB: the order here is very important, for example zones humides
    // always gives 20 except when going to sols imperméabilisés
    if (from === 'sols artificiels imperméabilisés') {
      return multiplier
    } else if (to === 'sols artificiels imperméabilisés') {
      return 1
    } else if (to === 'prairies zones arborées') {
      return multiplier
    } else if (from === 'prairies zones arborées') {
      return 1
    } else if (from === 'zones humides') {
      return multiplier
    } else if (to === 'zones humides') {
      return 1
    } else if (from === 'cultures') {
      return multiplier
    } else if (to === 'cultures') {
      return 1
    } else if (from === 'sols artificiels arborés et buissonants') {
      return 1
    } else if (to === 'sols artificiels arborés et buissonants') {
      return multiplier
    } else if (from === 'prairies zones herbacées') {
      return multiplier
    } else if (to === 'prairies zones herbacées') {
      return 1
    } else if (from === 'vergers') {
      return 1
    } else if (to === 'vergers') {
      return multiplier
    } else if (from === 'vignes') {
      return multiplier
    } else if (to === 'vignes') {
      return 1
    } else if (from === 'prairies zones arbustives') {
      return 1
    } else if (to === 'prairies zones arbustives') {
      return multiplier
    }
    // the remaining type is sols artificiels arbustifs, but any from/to combo has already
    // been covered by the above
  } else if (reservoir === 'litter') {
    return 1
  }
  console.log('ERROR: multiplier not found for combination of reservoir: ' + reservoir + ' from: ' + from + ' to: ' + to)
  return 1
}

function convertN2O (flux) {
  return flux < 0 ? flux / 15 * 0.01 * 44 / 25 + flux / 15 * 0.3 * 0.0075 * 44 / 28 : undefined
}

function getAnnualFluxes (location, options) {
  const allFluxes = getAllAnnualFluxes(location, options)
  allFluxes.forEach((flux) => {
    const area = getAnnualSurfaceChange(location, flux.from, flux.to)
    flux.area = area
    if (flux.to.startsWith('forêt ')) {
      flux.value = flux.flux * flux.area
    } else if (flux.reservoir === 'ground') {
      const annualtC = flux.flux * area * multiplier(flux.reservoir, flux.from, flux.to)
      flux.value = annualtC
    } else {
      const annualtC = flux.flux * area * multiplier(flux.reservoir, flux.from, flux.to)
      flux.value = annualtC
    }
    flux.co2e = convertCToCo2e(flux.value)
  })
  // need to do a second pass because N2O calculation requires the sum of ground and litter values
  const groundFluxes = allFluxes.filter(flux => flux.reservoir === 'ground')
  groundFluxes.forEach((groundFlux) => {
    const litterFlux = allFluxes.find(flux => flux.reservoir === 'litter' && flux.from === groundFlux.from && flux.to === groundFlux.to) || {}
    const groundFluxValue = groundFlux.value || 0
    const litterFluxValue = litterFlux.value || 0
    if (groundFluxValue + litterFluxValue < 0) {
      // decided to keep this grouping because N2O only tracked if emitted
      const annualN2O = convertN2O(groundFluxValue + litterFluxValue)
      allFluxes.push({
        from: groundFlux.from,
        to: groundFlux.to,
        value: annualN2O,
        gas: 'N2O',
        co2e: convertN2oToCo2e(annualN2O)
        // flux and reservoir don't make much sense here
      })
    }
  })
  const summary = {}
  GroundTypes.filter(gt => !gt.parentType).forEach((gt) => {
    summary[gt.stocksId] = {
      totalCarbonSequestration: 0,
      totalSequestration: 0
    }
  })
  allFluxes.forEach((flux) => {
    let to = flux.to
    const typeInfo = GroundTypes.find(gt => gt.stocksId === to)
    if (typeInfo.parentType) {
      to = typeInfo.parentType
    }
    if (flux.gas === 'C') {
      summary[to].totalCarbonSequestration += flux.value
      summary[to].totalSequestration += flux.co2e
    } else {
      summary[to].totalSequestration += flux.co2e
    }
  })
  return {
    allFlux: allFluxes,
    summary
  }
}

module.exports = {
  getAnnualFluxes
}
