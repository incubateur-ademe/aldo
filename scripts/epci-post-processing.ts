// This script combines the data in two files containing EPCI data.
// This is done once in advance rather than per-request since this data does not change per-request.
// The JSON versions of the files must be generated before this script is run using the csvtojson.sh script.
// To run, enter the scripts directory and call `node epci-post-processing.ts`

import fs from 'node:fs'
import epcis from '../data/dataByEpci/epci.csv.json' with { type: 'json' }
import communes from '../data/dataByCommune/communes_17122018.csv.json' with { type: 'json' }
import type { CommuneCsvRow } from '../data/csv.ts'
import type { FranceData } from '../data/types.ts'

const epciLookup: FranceData = {
  epcis: {},
  totalPopulation: 0
}

try {
  let differencesCommuneCount = 0
  console.log('difference de nombre de communes attendues et trouvées:')
  const epciCodesSeen: string[] = []
  epcis.forEach(csvEpci => {
    epciCodesSeen.push(csvEpci.code)
    const epciCommunes = communes.filter((c) => c.epci === csvEpci.code)
    const epci = {
      ...csvEpci,
      nombreCommunes: parseInt(csvEpci.nombreCommunes, 10),
      population: +csvEpci.populationTotale,
      communes: epciCommunes.map((c) => c.nom)
    }
    epciLookup.epcis[epci.code] = epci
    if (epciCommunes.length) {
      epci.population = 0
      epciCommunes.forEach((c) => {
        epci.population += +c.population
      })
    }
    if (epci.communes.length !== epci.nombreCommunes) {
      console.log(epci.nom, epci.code)
      console.log('attendu', epci.nombreCommunes)
      console.log('trouvé', epci.communes.length)
      differencesCommuneCount++
    }
    epciLookup.totalPopulation += epci.population
  })
  communes.filter((c) => !c.epci).forEach((c) => {
    epciLookup.totalPopulation += +c.population
  })
  const ignoredCommunes: CommuneCsvRow[] = []
  communes.forEach((c) => {
    if (epciCodesSeen.indexOf(c.epci) === -1) {
      ignoredCommunes.push(c)
    }
  })
  console.log(ignoredCommunes)

  console.log(differencesCommuneCount, 'EPCIs with commune count differences')
  console.log(Object.keys(epcis).length, 'EPCIs in total')
  console.log(ignoredCommunes.length, 'communes ignored')

  // convert JSON object to a string
  const data = JSON.stringify(epciLookup, null, 2)

  // write file to disk
  fs.writeFileSync('../data/dataByEpci/france.json', data, 'utf8')

  console.log('EPCI file successfully generated')
} catch (err) {
  console.log(`Error writing EPCI file: ${err}`)
}
