
function epciList () {
  const csvFilePath = './dataByEpci/epci.csv'
  const epcis = require(csvFilePath + '.json')
  epcis.forEach(epci => { epci.populationTotale = parseInt(epci.populationTotale) }, 10)
  return epcis
}

function getPopulationTotal (epcis) {
  return epcis.reduce((total, epci) => total + epci.populationTotale, 0)
}

module.exports = {
  epciList,
  getPopulationTotal
}
