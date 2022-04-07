const { epciList } = require('../data/index')
const epcis = require('@etalab/decoupage-administratif/data/epci.json')

function getEpci (name) {
  const aldoList = epciList()
  const epci = aldoList.find(epci => epci.nom === name)
  if (!epci) {
    return
  }
  const officialEpci = epcis.find(e => e.code === epci.code)
  if (officialEpci && parseInt(epci.nombreCommunes, 10) === officialEpci.membres.length) {
    epci.membres = officialEpci.membres
  }
  return epci
}

module.exports = {
  getEpci,
  epciList
}
