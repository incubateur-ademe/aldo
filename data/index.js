const franceData = require('./dataByEpci/france.json')

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

module.exports = {
  epciList,
  getPopulationTotal
}
