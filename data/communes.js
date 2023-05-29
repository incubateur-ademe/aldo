const communes = require('./dataByCommune/communes_17122018.csv.json')

function getCommunes (location) {
  let epcis = location.epcis || []
  if (location.epci) epcis.push(location.epci)
  epcis = epcis.map((epci) => epci.code)

  const allCommunes = communes.filter((c) => epcis.includes(c.epci))
  const remainingCommunes = location.communes || []
  if (location.commune) remainingCommunes.push(location.commune)
  remainingCommunes.forEach((commune) => {
    const alreadyIncluded = allCommunes.find((c) => c.insee === commune.insee)
    if (!alreadyIncluded) allCommunes.push(commune)
  })
  return allCommunes
}

module.exports = {
  getCommunes
}
