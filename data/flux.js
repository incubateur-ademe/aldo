// TODO: move this file to a folder that both layers can rely on to not completely break
// dependency tree
const { GroundTypes } = require('../calculations/constants')
const { getBiomassCarbonDensity } = require('./stocks')

function getGroundCarbonFluxKey (from, to) {
  const fromDetails = GroundTypes.find(groundType => groundType.stocksId === from)
  const toDetails = GroundTypes.find(groundType => groundType.stocksId === to)
  return `f_${fromDetails.fluxId}_${toDetails.fluxId}_%zpc`
}

function getAnnualGroundCarbonFlux (location, from, to) {
  // to start, deal with some exceptions in flux lookups
  if (from === 'sols artificiels arbustifs') {
    if (to === 'zones humides') return
    // could've chosen any prairie type, they have the same flux
    return getAnnualGroundCarbonFlux(location, 'prairies zones arborées', to)
  } else if (from === 'sols artificiels arborés et buissonants') {
    if (to === 'zones humides' || to === 'forêts') return
    return getAnnualGroundCarbonFlux(location, 'forêts', to)
  }
  // all vergers/vignes -> sols artificiels X use the flux for vergers/vignes -> cultures instead
  if (to.startsWith('sols')) {
    if (from === 'vergers' || from === 'vignes') {
      return getAnnualGroundCarbonFlux(location, 'cultures', to)
    }
  }
  if (to === 'sols artificiels imperméabilisés') {
    if (from === 'zones humides') {
      return getAnnualGroundCarbonFlux(location, from, 'cultures') + getAnnualGroundCarbonFlux(location, 'cultures', to)
    }
  } else if (to === 'sols artificiels arbustifs') {
    if (from.startsWith('prairies')) {
      return
    } else if (from === 'zones humides') {
      // could've chosen any prairie type, they have the same flux
      return getAnnualGroundCarbonFlux(location, from, 'prairies zones arborées')
    }
  } else if (to === 'sols artificiels arborés et buissonants') {
    if (from.startsWith('forêts')) {
      return
    } else if (from === 'zones humides') {
      return getAnnualGroundCarbonFlux(location, from, 'forêts')
    }
  }
  // normal flux value lookup
  const csvFilePath = './dataByEpci/ground.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  const dataValue = data[getGroundCarbonFluxKey(from, to)]
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

function getForestLitterFlux (from, to) {
  const fromTypes = ['forêts', 'sols artificiels arborés et buissonants', 'sols artificiels imperméabilisés']
  const toTypes = ['forêts', 'sols artificiels arborés et buissonants']
  if (from === 'forêts' && !toTypes.includes(to)) {
    return -9
  } else if (!fromTypes.includes(from) && toTypes.includes(to)) {
    return 9
  }
}

function getBiomassFlux (location, from, to) {
  const csvFilePath = './dataByEpci/biomass-hors-forets.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  let key = `${from} vers ${to}`
  // TODO: why is this done ? esp herbacés to imperméables
  const keyReplacements = {
    'prairies zones arbustives vers prairies zones arborées': 'prairies zones arbustives vers sols artificiels arborés et buissonants',
    'prairies zones herbacées vers prairies zones arborées': 'prairies zones herbacées vers sols artificiels arborés et buissonants',
    'prairies zones arborées vers prairies zones arbustives': 'prairies zones arborées vers sols artificiels arbustifs',
    'prairies zones herbacées vers prairies zones arbustives': 'prairies zones herbacées vers sols artificiels arbustifs',
    'prairies zones arborées vers prairies zones herbacées': 'prairies zones arborées vers sols artificiels imperméabilisés',
    'prairies zones arbustives vers prairies zones herbacées': 'prairies zones arbustives vers sols artificiels imperméabilisés',
    'sols artificiels arborés et buissonants vers sols artificiels arbustifs': 'sols artificiels arborés et buissonants vers prairies zones arbustives',
    'sols artificiels arborés et buissonants vers sols artificiels imperméabilisés': 'sols artificiels arborés et buissonants vers prairies zones herbacées',
    'sols artificiels arbustifs vers sols artificiels arborés et buissonants': 'zones humides vers prairies zones arborées',
    'sols artificiels arbustifs vers sols artificiels imperméabilisés': 'zones humides vers prairies zones herbacées',
    'sols artificiels imperméabilisés vers sols artificiels arborés et buissonants': 'sols artificiels imperméabilisés vers prairies zones arborées',
    'sols artificiels imperméabilisés vers sols artificiels arbustifs': 'sols artificiels imperméabilisés vers prairies zones arbustives'
  }
  key = keyReplacements[key] || key
  const dataValue = data[key]
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

function getForestBiomassDetail (location, to) {
  let data
  if (to === 'forêt peupleraie') {
    const csvFilePath = './dataByEpci/biomasse-forets-peupleraies.csv'
    const dataByEpci = require(csvFilePath + '.json')
    data = dataByEpci.find(data => data.siren === location.epci)
  } else {
    const csvFilePath = './dataByEpci/biomass-forets.csv'
    const dataByEpci = require(csvFilePath + '.json')
    const forestType = to.split(' ')[1]
    data = dataByEpci.find(data => data.siren === location.epci && data.type.toLowerCase() === forestType)
  }
  if (!data) {
    console.log(`No biomass data found for forest type '${to}' and epci '${location.epci}'`)
    return
  }
  const dataValue = data['BILAN_CARB (tC∙ha-1∙an-1)']
  if (dataValue) {
    return {
      flux: parseFloat(dataValue),
      // all but peupleraie use m3/ha
      growth: parseFloat(data['PRODUCTION (m3∙ha-1)'] || data['PRODUCTION (m3∙ha-1∙an-1)']),
      mortality: parseFloat(data['MORTALITE (m3∙ha-1∙an-1)']),
      timberExtraction: parseFloat(data['PRELEVEMENT (m3∙ha-1∙an-1)']),
      fluxMeterCubed: parseFloat(data['BILAN_M3 (m3∙ha-1∙an-1)']),
      conversionFactor: parseFloat(data['Fexp (VOL -> CARB)'])
    }
  }
}

function getFromForestBiomassFlux (location, from, to) {
  // get to stock and - from stock
  if (to === 'produits bois') return
  return getBiomassCarbonDensity(location, to) - getBiomassCarbonDensity(location, from)
}

// some flux data is annual, some is for the 20 year period. This function returns 1 or 20
// depending on what is required to normalise the fluxs to the same tCO2e/ha.
function yearMultiplier (reservoir, from, to) {
  const multiplier = 20
  if (reservoir === 'sol') {
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
  } else if (reservoir === 'biomasse') {
    // not relevant for certain types
    const ignore = ['produits bois', 'sols artificiels']
    if (from.startsWith('forêt ') || to.startsWith('forêt ') || ignore.includes(from) || ignore.includes(to)) {
      return
    }
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
  }
  console.log('ERROR: multiplier not found for combination of reservoir: ' + reservoir + ' from: ' + from + ' to: ' + to)
  return 1
}

// returns all known fluxes for from - to combinations
// TODO: could make more efficient by opening all the files and finding the location data once
function getAllAnnualFluxes (location, options) {
  const fluxes = []
  for (const fromGt of GroundTypes) {
    const from = fromGt.stocksId
    for (const toGt of GroundTypes) {
      const to = toGt.stocksId
      if (from === to) {
        continue
      }
      if (fromGt.fluxId && toGt.fluxId) {
        const annualFlux = getAnnualGroundCarbonFlux(location, from, to)
        const yearsForFlux = yearMultiplier('sol', from, to)
        if (annualFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux,
            annualFluxEquivalent: cToCo2e(annualFlux),
            yearsForFlux,
            reservoir: 'sol',
            gas: 'C'
          })
        }
        const litterFlux = getForestLitterFlux(from, to)
        if (litterFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux: litterFlux,
            annualFluxEquivalent: cToCo2e(litterFlux),
            reservoir: 'litière',
            gas: 'C'
          })
        }
      }
      const ignoreBiomass = ['prairies', 'haies', 'forêts']
      if (!ignoreBiomass.includes(from) && !ignoreBiomass.includes(to)) {
        const biomassFlux = getBiomassFlux(location, from, to)
        const yearsForFlux = yearMultiplier('biomasse', from, to)
        if (biomassFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux: biomassFlux,
            annualFluxEquivalent: cToCo2e(biomassFlux),
            yearsForFlux,
            reservoir: 'biomasse',
            gas: 'C'
          })
        }
      }
      const forestBiomassFrom = ['forêt mixte', 'forêt conifere', 'forêt feuillu']
      // to: forests won't happen because of the toGt.children check
      if (forestBiomassFrom.includes(from) && !forestBiomassFrom.includes(to) && to !== 'forêt peupleraie' && !toGt.children) {
        const biomassFlux = getFromForestBiomassFlux(location, from, to)
        if (biomassFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux: biomassFlux,
            annualFluxEquivalent: cToCo2e(biomassFlux),
            reservoir: 'biomasse',
            gas: 'C'
          })
        }
      }
    }
  }
  const forestTypes = GroundTypes.filter(gt => gt.stocksId.startsWith('forêt '))
  for (const fType of forestTypes) {
    const biomassInfo = getForestBiomassDetail(location, fType.stocksId)
    const biomassFlux = biomassInfo.flux
    if (biomassFlux !== undefined) {
      fluxes.push({
        to: fType.stocksId,
        annualFlux: biomassFlux,
        annualFluxEquivalent: cToCo2e(biomassFlux),
        reservoir: 'biomasse',
        gas: 'C',
        growth: biomassInfo.growth,
        mortality: biomassInfo.mortality,
        timberExtraction: biomassInfo.timberExtraction,
        fluxMeterCubed: biomassInfo.fluxMeterCubed,
        conversionFactor: biomassInfo.conversionFactor
      })
    }
  }
  return fluxes
}

function cToCo2e (valueC) {
  return valueC * 44 / 12
}

function getAnnualSurfaceChange (location, options, from, to) {
  if (to.startsWith('forêt ')) {
    return getAnnualForestSurfaceChange(location, to)
  }
  const csvFilePath = './dataByEpci/clc18-change.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  const fromClcCodes = GroundTypes.find(groundType => groundType.stocksId === from).clcCodes
  const toClcCodes = GroundTypes.find(groundType => groundType.stocksId === to).clcCodes
  let totalAreaChange = 0
  if (!fromClcCodes || !toClcCodes) {
    return 0
  }
  for (const fromCode of fromClcCodes) {
    for (const toCode of toClcCodes) {
      const key = `${fromCode}-${toCode}`
      if (data[key]) {
        totalAreaChange += parseFloat(data[key])
      }
    }
  }
  const yearsBetweenStudies = 6
  const yearlyAreaChange = totalAreaChange / yearsBetweenStudies
  const solsArtificielsException = getSolsArtificielsException(location, options, from, to, yearlyAreaChange)
  if (solsArtificielsException !== undefined) {
    return solsArtificielsException
  }
  return yearlyAreaChange
}

function getAnnualForestSurfaceChange (location, to) {
  const csvFilePath = './dataByEpci/ign19.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  return parseFloat(data[to.split(' ')[1] + 's'])
}

function getSolsArtificielsException (location, options, from, to, clcAnnualChange) {
  const estimatedPortionImpermeable = options.proportionSolsImpermeables || 0.8
  const estimatedPortionGreen = 1 - estimatedPortionImpermeable
  if (to === 'sols artificiels imperméabilisés') {
    if (from === 'sols artificiels arbustifs') {
      return 0
    }
    const changeSolsArbores = getAnnualSurfaceChange(location, options, from, 'sols artificiels arborés et buissonants')
    const changeArboresAndImpermeables = clcAnnualChange + changeSolsArbores
    if (changeSolsArbores < estimatedPortionGreen * changeArboresAndImpermeables) {
      return changeArboresAndImpermeables * estimatedPortionImpermeable
    } else {
      return clcAnnualChange
    }
  } else if (to === 'sols artificiels arbustifs') {
    if (from === 'sols artificiels imperméabilisés') {
      return 0
    }
    if (from.startsWith('forêt ')) {
      const changeSolsArbores = 0
      if (changeSolsArbores < clcAnnualChange * estimatedPortionGreen) {
        return clcAnnualChange * estimatedPortionGreen
      } else {
        return 0
      }
    }
    const changeSolsArbores = getAnnualSurfaceChange(location, options, from, 'sols artificiels arborés et buissonants')
    const changeArboresAndImpermeables = clcAnnualChange + changeSolsArbores
    if (changeSolsArbores < estimatedPortionGreen * changeArboresAndImpermeables) {
      return changeArboresAndImpermeables * estimatedPortionGreen - changeSolsArbores
    } else {
      return 0
    }
  } else if (to === 'sols artificiels arborés et buissonants') {
    const none = ['sols artificiels arbustifs', 'prairies zones arborées', 'prairies zones arbustives', 'vergers', 'vignes', 'zones humides']
    if (none.indexOf(from) > -1) {
      return 0
    }
  }
  // arborés uses CLC change area
}

// source: TODO. In tCO2/an
function getFranceFluxWoodProducts () {
  return {
    bo: 812000,
    bi: 751000
  }
}

module.exports = {
  getAnnualGroundCarbonFlux,
  getAllAnnualFluxes,
  getForestLitterFlux,
  getAnnualSurfaceChange,
  getFranceFluxWoodProducts,
  cToCo2e
}
