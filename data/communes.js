const communes = require('./dataByCommune/communes_17122018.csv.json')

function getCommunes (location) {
  if (location.epci) return communes.filter((c) => c.epci === location.epci.code)
  if (location.commune) return communes.filter((c) => c.insee === location.commune.insee)
}

module.exports = {
  getCommunes
}
