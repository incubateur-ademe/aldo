const {
  getAllAnnualFluxes,
  getAnnualSurfaceChange: getAnnualSurfaceChangeData
} = require('../../data/flux')
const { GroundTypes } = require('../constants')
const { getFluxWoodProducts } = require('./woodProducts')
const { getFluxAgriculturalPractices } = require('./agriculturalPractices')
const { getBiomassCarbonDensity, getLiveBiomassCarbonDensity, getDeadBiomassCarbonDensity } = require('../../data/stocks')

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
    if (overrides[key] >= 0) {
      area = overrides[key]
    }
  }
  const originalArea = getAnnualSurfaceChangeData(location, options, from, to)
  if (area === undefined) {
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
    if (!flux.area && flux.area !== 0) {
      const { area, areaModified, originalArea } = getAnnualSurfaceChange(location, options, flux.from, flux.to)
      flux.area = area
      flux.areaModified = areaModified
      flux.originalArea = originalArea
    }
    const area = flux.area
    flux.flux = flux.annualFlux
    if (flux.yearsForFlux) flux.flux *= flux.yearsForFlux
    // TODO: refactor the following so it is just flux.value = flux.flux * flux.area
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
  allFluxes.push(...deforestationFlux(location, options))

  const summary = {}
  let total = 0
  allFluxes.forEach((flux) => {
    if (!flux.co2e && flux.co2e !== 0) {
      console.log('WARNING: flux without a co2e found', flux)
      return
    }
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
  const biomassSummary = forestBiomassGrowthSummary(allFluxes, options)
  // update change flag for forests based on if the area used in biomass growth
  // calculations is defined by the user.
  const biomassGrowthAreaModified = biomassSummary.some((subtype) => subtype.areaModified)
  summary.forêts.areaModified = summary.forêts.areaModified || biomassGrowthAreaModified
  summary.forêts.hasModifications = summary.forêts.hasModifications || biomassGrowthAreaModified

  return {
    allFlux: allFluxes,
    summary,
    biomassSummary,
    total
  }
}

function forestBiomassGrowthSummary (allFlux, options) {
  // aggregate forest biomass data which is by commune, not EPCI
  const forestBiomassSummaryByType = []
  const forestSubtypes = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']
  for (const subtype of forestSubtypes) {
    const subtypeFluxes =
      allFlux.filter((flux) => !flux.from && flux.to === subtype && flux.reservoir === 'biomasse')
    const originalArea = sumByProperty(subtypeFluxes, 'area')
    const summary = {
      to: subtype,
      area: originalArea,
      co2e: sumByProperty(subtypeFluxes, 'co2e')
    }
    const fluxProperties = [
      'growth',
      'mortality',
      'timberExtraction',
      'fluxMeterCubed',
      'conversionFactor',
      'annualFlux',
      'annualFluxEquivalent'
    ]
    for (const property of fluxProperties) {
      // the property of interest can have quite different values for different geo locations
      // and the surface area within that location can be quite different
      // so use a weighted sum, not an average, to get closer to a reasonable 'average' value
      summary[property] = weightedAverage(subtypeFluxes, property, 'area')
    }
    forestBiomassSummaryByType.push(summary)
    if (options.areas && options.areas[subtype]) {
      summary.originalArea = originalArea
      summary.area = options.areas[subtype]
      summary.areaModified = true
      summary.co2e = summary.area * summary.annualFluxEquivalent
    }
  }
  return forestBiomassSummaryByType
}

function sumByProperty (objArray, key) {
  let sum = 0
  objArray.forEach((obj) => {
    sum += obj[key]
  })
  return sum
}

function weightedAverage (objArray, key, keyForWeighting) {
  let weightedSum = 0
  objArray.forEach((obj) => {
    weightedSum += obj[key] * obj[keyForWeighting]
  })
  const total = sumByProperty(objArray, keyForWeighting)
  return total ? weightedSum / total : 0
}

function deforestationFlux (location, options) {
  // can add flux from deforestation now that have weighted averages of biomass per forest subtype for EPCI
  const deforestationFluxes = []
  const forestSubtypes = GroundTypes.find((gt) => gt.stocksId === 'forêts').children
  for (const from of forestSubtypes) {
    for (const toGt of GroundTypes) {
      const to = toGt.stocksId
      if (from === to) {
        continue
      }
      const forestBiomassDensity = getLiveBiomassCarbonDensity(location, from) + getDeadBiomassCarbonDensity(location, from)
      let annualFlux
      if (forestSubtypes.includes(to)) {
        annualFlux = getLiveBiomassCarbonDensity(location, to) + getDeadBiomassCarbonDensity(location, to)
      } else {
        annualFlux = getBiomassCarbonDensity(location, to) - forestBiomassDensity
      }
      const annualFluxEquivalent = convertCToCo2e(annualFlux)
      const { area, areaModified, originalArea } = getAnnualSurfaceChange(location, options, from, to)
      if (area && annualFlux) {
        const value = annualFlux * area
        deforestationFluxes.push({
          from,
          to,
          area,
          originalArea,
          areaModified,
          annualFlux,
          annualFluxEquivalent,
          flux: annualFlux,
          value,
          co2e: convertCToCo2e(value),
          reservoir: 'biomasse',
          gas: 'C'
        })
      }
    }
  }
  return deforestationFluxes
}

module.exports = {
  getAnnualFluxes,
  forestBiomassGrowthSummary
}
