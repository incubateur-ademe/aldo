const {
  getFluxReferenceValues,
  getAnnualSurfaceChange
} = require('../../data/flux')
const { GroundTypes } = require('../constants')
const { getFluxWoodProducts } = require('./woodProducts')
const { getFluxAgriculturalPractices } = require('./agriculturalPractices')
const { getBiomassCarbonDensity, getForestBiomassCarbonDensities, getForestAreaData } = require('../../data/stocks')

function convertCToCo2e (valueC) {
  return valueC * 44 / 12
}

function convertN2oToCo2e (valueC) {
  return valueC * 298
}

function convertN2O (flux) {
  return flux < 0 ? flux / 15 * 0.01 * 44 / 25 + flux / 15 * 0.3 * 0.0075 * 44 / 28 : undefined
}

function getAnnualFluxes (communes, options) {
  options = options || {}
  let fluxes = []

  communes.forEach((commune) => {
    fluxes.push(...getFluxesForCommune({ commune }, options))
  })
  const { areas, changePairs } = areaChangesByGroundType(communes, options)
  Object.values(changePairs).forEach((changePair) => {
    const from = changePair.from
    const to = changePair.to
    fluxes = replaceWithOverride(fluxes, areas, from, to, 'sol')
    fluxes = replaceWithOverride(fluxes, areas, from, to, 'biomasse')
    fluxes = replaceWithOverride(fluxes, areas, from, to, 'litière')
  })

  fluxes = fluxes.filter((f) => !!f.co2e)
  fluxes.push(...getNitrousOxideEmissions(fluxes))
  // TODO: aggregations for display
  //  - produits bois details

  fluxes.push(...getFluxAgriculturalPractices(options?.agriculturalPracticesEstablishedAreas))

  const { summary, biomassSummary, fluxCo2eByGroundType, woodSummary, total } = fluxSummary(fluxes, options)

  return {
    allFlux: fluxes,
    summary,
    biomassSummary,
    areas,
    fluxCo2eByGroundType,
    total,
    woodSummary
  }
}

function getFluxesForCommune (location, options) {
  const locationFluxes = getFluxReferenceValues(location)
  locationFluxes.forEach(fetchAreaAndCalculateValue(location, options))
  locationFluxes.push(...deforestationFlux(location, options))

  locationFluxes.push(...getFluxWoodProducts(location, options?.woodCalculation, options))
  return locationFluxes
}

function fetchAreaAndCalculateValue (location, options) {
  return (flux) => {
    fetchArea(location, options)(flux)
    calculateValue(flux)
  }
}

function fetchArea (location, options) {
  return (flux) => {
    if (!flux.area && flux.area !== 0) {
      const area = getAnnualSurfaceChange(location, options, flux.from, flux.to)
      flux.area = area
      flux.originalArea = area
    }
  }
}

function calculateValue (flux) {
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
}

function replaceWithOverride (fluxes, areas, from, to, reservoir) {
  const reservoirFluxes = fluxes.filter((f) => f.to === to && f.from === from && f.reservoir === reservoir)
  // fallback to using average in the case where no original area changes are registered for this pair
  const annualFlux = weightedAverage(reservoirFluxes, 'annualFlux', 'area') || average(reservoirFluxes, 'annualFlux')
  const newGroundFlux = {
    from,
    to,
    reservoir,
    gas: 'C',
    area: areas[from][to].area,
    originalArea: areas[from][to].originalArea,
    areaModified: true,
    yearsForFlux: reservoirFluxes[0]?.yearsForFlux,
    annualFlux,
    annualFluxEquivalent: convertCToCo2e(annualFlux)
  }
  const newFluxes = fluxes.filter((f) => !(f.to === to && f.from === from && f.reservoir === reservoir))
  calculateValue(newGroundFlux)
  newFluxes.push(newGroundFlux)
  return newFluxes
}

function getNitrousOxideEmissions (allFluxes) {
  // need to do a second pass because N2O calculation requires the sum of ground and litter values
  const n2oEmissions = []
  // assumes that all litter fluxes will be accompanied by a ground flux
  // also assumes that all communes will only have one ground x litter pair
  const groundFluxes = allFluxes.filter(flux => flux.reservoir === 'sol')
  const litterFluxes = allFluxes.filter(flux => flux.reservoir === 'litière')
  groundFluxes.forEach((groundFlux) => {
    const litterFlux = litterFluxes.find(flux => flux.from === groundFlux.from && flux.to === groundFlux.to && flux.commune === groundFlux.commune) || {}
    const groundFluxValue = groundFlux.value || 0
    const litterFluxValue = litterFlux.value || 0
    if (groundFluxValue + litterFluxValue < 0) {
      // decided to keep this grouping because N2O only tracked if emitted
      const annualN2O = convertN2O(groundFluxValue + litterFluxValue)
      n2oEmissions.push({
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
  return n2oEmissions
}

function fluxSummary (allFluxes, options) {
  const summary = {}
  const fluxCo2eByGroundType = {}
  const woodSummary = {
    localPopulation: 0,
    francePopulation: 0,
    populationPortion: 0,
    bo: {
      co2e: 0,
      localHarvest: 0,
      franceHarvest: 0,
      harvestPortion: 0,
      franceSequestration: 0
    },
    bi: {
      co2e: 0,
      localHarvest: 0,
      franceHarvest: 0,
      harvestPortion: 0,
      franceSequestration: 0
    }
  }
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
    // this won't take into account flux from biomass growth
    const from = flux.from
    if (from && to) {
      if (!fluxCo2eByGroundType[from]) {
        fluxCo2eByGroundType[from] = {}
      }
      if (!fluxCo2eByGroundType[from][to]) {
        fluxCo2eByGroundType[from][to] = 0
      }
      fluxCo2eByGroundType[from][to] += flux.co2e
    }
    // wood products - NB handling both calculation methods at once
    // despite the fluxes for the other type being NaN
    if (to === 'produits bois') {
      const category = flux.category
      woodSummary[category].co2e += flux.co2e
      woodSummary[category].localHarvest += flux.localHarvest
      woodSummary[category].harvestPortion += flux.localPortion
      // France details only need to be set once really
      woodSummary.francePopulation = flux.francePopulation
      woodSummary[category].franceSequestration = flux.franceSequestration
      woodSummary[category].franceHarvest = flux.franceHarvest
      if (category === 'bo') {
        // randomly taking bo category - just want to not double the
        // localPopulation since we have fluxes for 2 categories
        woodSummary.localPopulation += flux.localPopulation
        woodSummary.populationPortion += flux.localPortion
      }
    }
  })
  const biomassSummary = forestBiomassGrowthSummary(allFluxes, options)
  // update change flag for forests based on if the area used in biomass growth
  // calculations is defined by the user.
  const biomassGrowthAreaModified = biomassSummary.some((subtype) => subtype.areaModified)
  summary.forêts.areaModified = summary.forêts.areaModified || biomassGrowthAreaModified
  summary.forêts.hasModifications = summary.forêts.hasModifications || biomassGrowthAreaModified
  return { summary, biomassSummary, fluxCo2eByGroundType, woodSummary, total }
}

function forestBiomassGrowthSummary (allFlux, options) {
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

function areaChangesByGroundType (communes, options) {
  const areas = {}
  const changePairs = {}
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes
    .filter((gt) => !gt.children && !excludeIds.includes(gt.stocksId))
  communes.forEach((commune) => {
    childGroundTypes.forEach((from) => {
      const fromGt = from.stocksId
      if (!areas[fromGt]) areas[fromGt] = {}
      childGroundTypes.forEach((to) => {
        const toGt = to.stocksId
        if (fromGt === toGt) return

        if (!areas[fromGt][toGt]) areas[fromGt][toGt] = { originalArea: 0 }

        areas[fromGt][toGt].originalArea += getAnnualSurfaceChange({ commune }, options, fromGt, toGt)
        areas[fromGt][toGt].area = areas[fromGt][toGt].originalArea

        if (options.areaChanges) {
          // sometimes from isn't defined because of the special cases of forest biomass
          const key = `${from.altFluxId || from.fluxId}_${to.altFluxId || to.fluxId}`
          if (options.areaChanges[key] >= 0) {
            // this area is not summed.
            areas[fromGt][toGt].area = options.areaChanges[key]
            areas[fromGt][toGt].areaModified = true
            changePairs[key] = { from: fromGt, to: toGt }
          }
        }
      })
    })
  })
  return { areas, changePairs }
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

function average (objArray, key) {
  const count = objArray.length
  if (!count) return 0
  return sumByProperty(objArray, key) / count
}

function deforestationFlux (location, options) {
  const deforestationFluxes = []
  const forestSubtypes = GroundTypes.find((gt) => gt.stocksId === 'forêts').children
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes
    .filter((gt) => !gt.children && !excludeIds.includes(gt.stocksId))
  const areaData = getForestAreaData(location)
  for (const from of forestSubtypes) {
    const forestBiomassDensities = getForestBiomassCarbonDensities(location, from, areaData)
    const initialBiomassDensity = forestBiomassDensities.live + forestBiomassDensities.dead

    for (const toGt of childGroundTypes) {
      const to = toGt.stocksId
      if (from === to) {
        continue
      } else if (forestSubtypes.includes(to)) {
        // ignore reforestation and changes between forest subtypes since that biomass should
        // be taken into account by the growth of biomass based on area used by stocks
        continue
      }

      const annualFlux = getBiomassCarbonDensity(location, to) - initialBiomassDensity

      const annualFluxEquivalent = convertCToCo2e(annualFlux)
      const area = getAnnualSurfaceChange(location, options, from, to)
      if (annualFlux) {
        const value = annualFlux * area || 0
        deforestationFluxes.push({
          from,
          to,
          area,
          originalArea: area,
          annualFlux,
          annualFluxEquivalent,
          yearsForFlux: 1,
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
