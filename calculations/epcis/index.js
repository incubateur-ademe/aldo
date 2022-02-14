const epcis = require('@etalab/decoupage-administratif/data/epci.json')

function getEpci(name) {
  return epcis.find(e => e.nom === name)
}

module.exports = {
  getEpci,
  epcisList: epcis,
}