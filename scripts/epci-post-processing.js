// This script combines the data in two files containing EPCI data.
// This is done once in advance rather than per-request since this data does not change per-request.
// The JSON versions of the files must be generated before this script is run using the csvtojson.sh script.
// After generation, the france.json file must be moved manually to the data/dataByEpci folder.

const fs = require('fs')
const epcis = require('../data/dataByEpci/epci.csv.json')
const communes = require('../data/dataByEpci/communes_17122018.csv.json')

const epciLookup = {
  epcis: {},
  totalPopulation: 0
}

try {
  epcis.forEach(epci => {
    epci.populationTotale = parseInt(epci.populationTotale, 10)
    epciLookup.epcis[epci.code] = epci
    epciLookup.epcis[epci.code].membres = communes.filter((c) => c.epci === epci.code).map((c) => c.commune)
    epciLookup.totalPopulation += epci.populationTotale
  })

  // convert JSON object to a string
  const data = JSON.stringify(epciLookup, null, 2)

  // write file to disk
  fs.writeFileSync('france.json', data, 'utf8')

  console.log('EPCI file successfully generated')
} catch (err) {
  console.log(`Error writing EPCI file: ${err}`)
}
