const {
  getAllAnnualFluxes,
  getAnnualSurfaceChange: getAnnualSurfaceChangeData
} = require('../../data/flux')
const { GroundTypes } = require('../constants')
const { getFluxWoodProducts } = require('./woodProducts')
const { getFluxAgriculturalPractices } = require('./agriculturalPractices')

function convertCToCo2e (valueC) {
  return valueC * 44 / 12
}

function convertN2oToCo2e (valueC) {
  return valueC * 298
}

function getAnnualSurfaceChange (location, options, from, to) {
  const overrides = options.areaChanges || {}
  let area
  let areaModified = false
  if (from && overrides) {
    // sometimes from isn't defined because of the special cases of forest biomass
    const fromDetail = GroundTypes.find(ground => ground.stocksId === from)
    const toDetail = GroundTypes.find(ground => ground.stocksId === to)
    const key = `${fromDetail.altFluxId || fromDetail.fluxId}_${toDetail.altFluxId || toDetail.fluxId}`
    if (overrides[key] || overrides[key] === 0) {
      area = overrides[key]
    }
  }
  const originalArea = getAnnualSurfaceChangeData(location, options, from, to)
  if (!area) {
    area = originalArea
  } else {
    areaModified = true
  }
  return {
    area,
    originalArea,
    areaModified
  }
}

function convertN2O (flux) {
  return flux < 0 ? flux / 15 * 0.01 * 44 / 25 + flux / 15 * 0.3 * 0.0075 * 44 / 28 : undefined
}

function getAnnualFluxes (location, options) {
  const originalLocation = location
  location = { epci: location.epci.code } // TODO: change the other APIs to use whole EPCI object like stocks wood products?
  options = options || {}
  const allFluxes = getAllAnnualFluxes(location, options)
  allFluxes.forEach((flux) => {
    const { area, areaModified, originalArea } = getAnnualSurfaceChange(location, options, flux.from, flux.to)
    flux.area = area
    flux.areaModified = areaModified
    flux.originalArea = originalArea
    if (flux.to.startsWith('forêt ')) {
      flux.value = flux.flux * flux.area
    } else if (flux.reservoir === 'sol') {
      const annualtC = flux.flux * area
      flux.value = annualtC
    } else {
      const annualtC = flux.flux * area
      flux.value = annualtC
    }
    flux.co2e = convertCToCo2e(flux.value)
  })
  // need to do a second pass because N2O calculation requires the sum of ground and litter values
  const groundFluxes = allFluxes.filter(flux => flux.reservoir === 'sol')
  groundFluxes.forEach((groundFlux) => {
    const litterFlux = allFluxes.find(flux => flux.reservoir === 'litière' && flux.from === groundFlux.from && flux.to === groundFlux.to) || {}
    const groundFluxValue = groundFlux.value || 0
    const litterFluxValue = litterFlux.value || 0
    if (groundFluxValue + litterFluxValue < 0) {
      // decided to keep this grouping because N2O only tracked if emitted
      const annualN2O = convertN2O(groundFluxValue + litterFluxValue)
      allFluxes.push({
        from: groundFlux.from,
        to: groundFlux.to,
        value: annualN2O,
        reservoir: 'sol et litière',
        gas: 'N2O',
        co2e: convertN2oToCo2e(annualN2O)
        // flux and reservoir don't make much sense here
      })
    }
  })
  const woodFluxes = getFluxWoodProducts(originalLocation, options?.woodCalculation, options)
  allFluxes.push(...woodFluxes)
  const agriculturalPracticesFlux = getFluxAgriculturalPractices(options?.agriculturalPracticesEstablishedAreas)
  allFluxes.push(...agriculturalPracticesFlux)

  const summary = {}
  let total = 0
  allFluxes.forEach((flux) => {
    total += flux.co2e
    const to = flux.to
    if (!summary[to]) {
      summary[to] = {
        totalCarbonSequestration: 0,
        totalSequestration: 0
      }
    }
    if (flux.gas === 'C') {
      summary[to].totalCarbonSequestration += flux.value
      summary[to].totalSequestration += flux.co2e
    } else {
      summary[to].totalSequestration += flux.co2e
    }
    if (flux.areaModified) {
      summary[to].areaModified = flux.areaModified
      summary[to].hasModifications = flux.areaModified
    }
    const typeInfo = GroundTypes.find(gt => gt.stocksId === to)
    if (typeInfo.parentType) {
      const parent = typeInfo.parentType
      if (!summary[parent]) {
        summary[parent] = {
          totalCarbonSequestration: 0,
          totalSequestration: 0
        }
      }
      if (flux.gas === 'C') {
        summary[parent].totalCarbonSequestration += flux.value
        summary[parent].totalSequestration += flux.co2e
      } else {
        summary[parent].totalSequestration += flux.co2e
      }
      if (flux.areaModified) {
        summary[parent].areaModified = flux.areaModified
        summary[parent].hasModifications = flux.areaModified
      }
    }
  })
  return {
    allFlux: allFluxes,
    summary,
    total
  }
}

module.exports = {
  getAnnualFluxes
}
