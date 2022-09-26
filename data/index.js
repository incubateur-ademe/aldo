
function epciList () {
  const epcis = require('./dataByEpci/epci.csv.json')
  const communes = require('./dataByEpci/communes_17122018.csv.json')
  epcis.forEach(epci => {
    epci.populationTotale = parseInt(epci.populationTotale, 10)
    epci.membres = communes.filter((c) => c.epci === epci.code).map((c) => c.commune)
  })
  return epcis
}

function getPopulationTotal (epcis) {
  return epcis.reduce((total, epci) => total + epci.populationTotale, 0)
}

module.exports = {
  epciList,
  getPopulationTotal
}
