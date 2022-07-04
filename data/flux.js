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
    return parseFloat(dataValue) * multiplier('sol', from, to)
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
    return parseFloat(dataValue) * multiplier('biomasse', from, to)
  }
}

function getToForestBiomassFlux (location, to) {
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
    return parseFloat(dataValue)
  }
}

function getFromForestBiomassFlux (location, from, to) {
  // get to stock and - from stock
  if (to === 'produits bois') return
  return getBiomassCarbonDensity(location, to) - getBiomassCarbonDensity(location, from)
}

// TODO: explainer for this
function multiplier (reservoir, from, to) {
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
        const groundFlux = getAnnualGroundCarbonFlux(location, from, to)
        if (groundFlux !== undefined) {
          fluxes.push({
            from,
            to,
            flux: groundFlux,
            fluxEquivalent: cToCo2e(groundFlux),
            reservoir: 'sol',
            gas: 'C'
          })
        }
        const litterFlux = getForestLitterFlux(from, to)
        if (litterFlux !== undefined) {
          fluxes.push({
            from,
            to,
            flux: litterFlux,
            fluxEquivalent: cToCo2e(litterFlux),
            reservoir: 'litière',
            gas: 'C'
          })
        }
      }
      const ignoreBiomass = ['prairies', 'haies', 'forêts']
      if (!ignoreBiomass.includes(from) && !ignoreBiomass.includes(to)) {
        const biomassFlux = getBiomassFlux(location, from, to)
        if (biomassFlux !== undefined) {
          fluxes.push({
            from,
            to,
            flux: biomassFlux,
            fluxEquivalent: cToCo2e(biomassFlux),
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
            flux: biomassFlux,
            fluxEquivalent: cToCo2e(biomassFlux),
            reservoir: 'biomasse',
            gas: 'C'
          })
        }
      }
    }
  }
  const forestTypes = GroundTypes.filter(gt => gt.stocksId.startsWith('forêt '))
  for (const fType of forestTypes) {
    const biomassFlux = getToForestBiomassFlux(location, fType.stocksId)
    if (biomassFlux !== undefined) {
      fluxes.push({
        to: fType.stocksId,
        flux: biomassFlux,
        fluxEquivalent: cToCo2e(biomassFlux),
        reservoir: 'biomasse',
        gas: 'C'
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
  const solsArtificielsExceptions = getSolsArtificielsExceptions(location, options, from, to, yearlyAreaChange)
  if (solsArtificielsExceptions !== undefined) {
    return solsArtificielsExceptions
  }
  return yearlyAreaChange
}

function getAnnualForestSurfaceChange (location, to) {
  const csvFilePath = './dataByEpci/ign19.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  return parseFloat(data[to.split(' ')[1] + 's'])
}

function getSolsArtificielsExceptions (location, options, from, to, clcAnnualChange) {
  const estimatedPortionImpermeable = options.proportionSolsImpermeables || 0.8
  const estimatedPortionGreen = 1 - estimatedPortionImpermeable
  if (to === 'sols artificiels imperméabilisés') {
    if (from === 'sols artificiels arbustifs') {
      return 0
    }
    const changeSolsArbores = getAnnualSurfaceChange(location, options, from, 'sols artificiels arborés et buissonants')
    const changeArboresAndImpermeables = clcAnnualChange + changeSolsArbores
    if (changeSolsArbores < 0.2 * (changeSolsArbores + changeArboresAndImpermeables * estimatedPortionImpermeable)) {
      return changeArboresAndImpermeables * estimatedPortionImpermeable
    } else {
      return clcAnnualChange
    }
  } else if (to === 'sols artificiels arbustifs') {
    const changeSolsArbores = getAnnualSurfaceChange(location, options, from, 'sols artificiels arborés et buissonants')
    const changeSolsImpermeables = getAnnualSurfaceChange(location, options, from, 'sols artificiels imperméabilisés')
    if (changeSolsArbores < 0.2 * (changeSolsImpermeables + changeSolsArbores)) {
      return (clcAnnualChange + changeSolsArbores) * estimatedPortionGreen - changeSolsArbores
    } else {
      return 0
    }
  }
  // arborés follows logic of other ground types
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
