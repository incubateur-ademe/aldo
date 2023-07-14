// This script fetches data per-commune and saves it in order to avoid re-fetching data that doesn't change.
// This is done once in advance rather than per-request since this data does not change per-request.
// The JSON versions of the files must be generated before this script is run using the csvtojson.sh script.
// To run, enter the scripts directory and call `node communes-calculations`
// TODO: write tests for this script

const fs = require('fs')
const communes = require('../data/dataByCommune/communes_17122018.csv.json')
const epcis = require('../data/dataByEpci/epci.csv.json')
const { completeData } = require('../data/communes')

const extendedCommunes = completeData(communes)
const communeDict = {}
const epciDict = {}
extendedCommunes.forEach((commune) => {
  commune.population = +commune.population
  communeDict[commune.insee] = commune
  if (commune.epci) {
    if (!epciDict[commune.epci]) {
      const nom = epcis.find((epci) => epci.code === commune.epci)?.nom
      epciDict[commune.epci] = {
        code: commune.epci,
        nom,
        population: commune.population,
        communes: [commune.insee]
      }
    } else {
      epciDict[commune.epci].population += commune.population || 0 // don't have population for arrondissements
      epciDict[commune.epci].communes.push(commune.insee)
    }
  }
})
const stringifiedCommuneData = JSON.stringify(communeDict, null, 2)
const stringifiedEpciData = JSON.stringify(epciDict, null, 2)

try {
  // write file to disk
  fs.writeFileSync('../data/dataByCommune/communes.json', stringifiedCommuneData, 'utf8')
  fs.writeFileSync('../data/dataByEpci/epcis.json', stringifiedEpciData, 'utf8')

  console.log('commune file successfully generated')
} catch (err) {
  console.log(`Error writing EPCI file: ${err}`)
}
