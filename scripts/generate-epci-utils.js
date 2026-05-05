const epcisData = require('../data/dataByEpci/epcis.json')
const communesData = require('../data/dataByCommune/communes.json')
const regionToInterRegion = require('../data/dataByCommune/region-to-inter-region.json')

function getEpcis () {
  return Object.values(epcisData)
}

function getCommunesForEpci (epci) {
  return (epci.communes || [])
    .map((code) => communesData[String(code).padStart(5, '0')])
    .filter(Boolean)
}

function getDominantValueByPopulation (communes, key) {
  const totals = new Map()
  communes.forEach((commune) => {
    const value = commune?.[key]
    if (!value) return
    const population = commune.population || 0
    totals.set(value, (totals.get(value) || 0) + population)
  })
  let bestValue = ''
  let bestPopulation = -1
  totals.forEach((population, value) => {
    if (population > bestPopulation) {
      bestPopulation = population
      bestValue = value
    }
  })
  return bestValue
}

function getEPCIBaseMeta (epci) {
  const communes = getCommunesForEpci(epci)
  const region = getDominantValueByPopulation(communes, 'region')
  const meta = {
    insee: epci.code,
    nom: epci.nom || '',
    epci: epci.code,
    departement: getDominantValueByPopulation(communes, 'departement') || '',
    region: region || '',
    zpc: '',
    inter_region: regionToInterRegion[String(region)]?.interRegion || '',
    groupe_ser: '',
    greco: '',
    rad_13: '',
    bassin_populicole: '',
    population: epci.population || 0
  }
  return meta
}

module.exports = {
  getEpcis,
  getCommunesForEpci,
  getEPCIBaseMeta
}
