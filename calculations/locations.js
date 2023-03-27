const franceData = require('../data/dataByEpci/france.json')
const communeData = require('../data/dataByCommune/communes_17122018.csv.json')

function getEpci (searchTerm, bySiren = false) {
  if (bySiren) {
    return franceData.epcis[searchTerm]
  }
  const epci = Object.values(franceData.epcis).find(epci => epci.nom === searchTerm)
  return epci
}

function getCommune (searchTerm, byCode = false) {
  if (byCode) {
    return communeData.find((data) => data.insee === searchTerm)
  } else {
    return communeData.find((data) => data.nom === searchTerm)
  }
}

module.exports = {
  getEpci,
  getCommune
}
