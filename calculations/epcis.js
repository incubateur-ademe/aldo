const franceData = require('../data/dataByEpci/france.json')

function getEpci (name, bySiren = false) {
  if (bySiren) {
    return franceData.epcis[name]
  }
  const epci = Object.values(franceData.epcis).find(epci => epci.nom === name)
  return epci
}

module.exports = {
  getEpci
}
