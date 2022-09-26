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
  let differencesCommuneCount = 0
  console.log('difference de nombre de communes attendues et trouvées:')
  epcis.forEach(epci => {
    epci.populationTotale = parseInt(epci.populationTotale, 10)
    epci.nombreCommunes = parseInt(epci.nombreCommunes, 10)
    epciLookup.epcis[epci.code] = epci
    epciLookup.epcis[epci.code].membres = communes.filter((c) => c.epci === epci.code).map((c) => c.commune)
    if (epciLookup.epcis[epci.code].membres.length !== epci.nombreCommunes) {
      console.log(epci.nom, epci.code)
      console.log('attendu', epci.nombreCommunes)
      console.log('trouvé', epciLookup.epcis[epci.code].membres.length)
      differencesCommuneCount++
    }
    epciLookup.totalPopulation += epci.populationTotale
  })
  console.log(differencesCommuneCount, 'EPCIs with commune count differences')
  console.log(Object.keys(epcis).length, 'EPCIs in total')

  // convert JSON object to a string
  const data = JSON.stringify(epciLookup, null, 2)

  // write file to disk
  fs.writeFileSync('france.json', data, 'utf8')

  console.log('EPCI file successfully generated')
} catch (err) {
  console.log(`Error writing EPCI file: ${err}`)
}
