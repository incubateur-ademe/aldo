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
  if (dataValue || dataValue === 0) {
    return parseFloat(dataValue)
  }
}

// returns all known fluxes for from - to combinations
function getAnnualGroundCarbonFluxes (location, options) {
  const allTypesWithFluxId = GroundTypes.filter(gt => !!gt.fluxId).map(gt => gt.stocksId)
  const fluxes = []
  for (const from of allTypesWithFluxId) {
    for (const to of allTypesWithFluxId) {
      const value = getAnnualGroundCarbonFlux(location, from, to)
      if (value !== undefined) {
        fluxes.push({
          from,
          to,
          value
        })
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
  getAnnualGroundCarbonFluxes,
  getAnnualSurfaceChange
}
