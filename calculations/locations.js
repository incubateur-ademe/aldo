const epciData = require('../data/dataByEpci/epcis.json')
const communeData = require('../data/dataByCommune/communes.json')

function getEpci (searchTerm, bySiren = false) {
  if (bySiren) {
    return epciData[searchTerm]
  }
  const epci = Object.values(epciData).find(epci => epci.nom === searchTerm)
  return epci
}

function getCommune (searchTerm, byCode = false) {
  if (byCode) {
    return communeData[searchTerm]
  } else {
    return Object.values(communeData).find((data) => data.nom === searchTerm)
  }
}

module.exports = {
  getEpci,
  getCommune
}
