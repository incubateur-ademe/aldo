const { epciList } = require('../data')

function getEpci (name, bySiren = false) {
  const aldoList = epciList()
  const epci = aldoList.find(epci => bySiren ? epci.code === name : epci.nom === name)
  if (!epci) {
    return
  }
  return epci
}

module.exports = {
  getEpci,
  epciList
}
