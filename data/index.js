const franceData = require('./dataByEpci/france.json')
const communes = require('./dataByCommune/communes_17122018.csv.json')

function epciList () {
  return Object.values(franceData.epcis).map((epci) => {
    return {
      code: epci.code,
      nom: epci.nom
    }
  })
}

function getPopulationTotal () {
  return franceData.totalPopulation
}

function communeList () {
  return communes.map((c) => ({ nom: c.nom, code: c.insee }))
}

module.exports = {
  epciList,
  communeList,
  getPopulationTotal
}
