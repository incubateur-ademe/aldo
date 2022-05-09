// TODO: move this file to a folder that both layers can rely on to not completely break
// dependency tree
const { GroundTypes } = require('../calculations/constants')

function getGroundCarbonFluxKey (from, to) {
  const fromDetails = GroundTypes.find(groundType => groundType.stocksId === from)
  const toDetails = GroundTypes.find(groundType => groundType.stocksId === to)
  return `f_${fromDetails.fluxId}_${toDetails.fluxId}_%zpc`
}

function getAnnualGroundCarbonFlux (location, from, to) {
  const csvFilePath = './dataByEpci/ground.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  const dataValue = data[getGroundCarbonFluxKey(from, to)]
  if (dataValue || dataValue === '0') {
    return parseFloat(dataValue)
  }
}

function getForestLitterFlux (from, to) {
  const relevantTypes = ['forêts', 'sols artificiels arborés et buissonants']
  if (relevantTypes.includes(from) && !relevantTypes.includes(to)) {
    return -9
  } else if (!relevantTypes.includes(from) && relevantTypes.includes(to)) {
    return 9
  }
}

function getBiomassFlux (location, from, to) {
  const csvFilePath = './dataByEpci/biomass-hors-forets.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  const key = `${from} vers ${to}`
  const dataValue = data[key]
  if (dataValue || dataValue === '0') {
    return parseFloat(dataValue)
  }
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
            reservoir: 'ground',
            gas: 'C'
          })
        }
        const litterFlux = getForestLitterFlux(from, to)
        if (litterFlux !== undefined) {
          fluxes.push({
            from,
            to,
            flux: litterFlux,
            reservoir: 'litter',
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
            reservoir: 'biomass',
            gas: 'C'
          })
        }
      }
    }
  }
  return fluxes
}

function getAnnualSurfaceChange (location, from, to) {
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
  return totalAreaChange / yearsBetweenStudies
}

module.exports = {
  getAnnualGroundCarbonFlux,
  getAllAnnualFluxes,
  getForestLitterFlux,
  getAnnualSurfaceChange
}
