const { epciList } = require('../data')
const epcis = require('@etalab/decoupage-administratif/data/epci.json')

function getEpci (name, bySiren = false) {
  const aldoList = epciList()
  const epci = aldoList.find(epci => bySiren ? epci.code === name : epci.nom === name)
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
