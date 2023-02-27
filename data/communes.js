const communes = require('./dataByCommune/communes_17122018.csv.json')

function getCommunes (location) {
  const epciSiren = location.epci
  return communes.filter((c) => c.epci === epciSiren)
}

module.exports = {
  getCommunes
}
