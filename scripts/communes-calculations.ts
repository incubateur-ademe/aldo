// This script fetches data per-commune and saves it in order to avoid re-fetching data that doesn't change.
// This is done once in advance rather than per-request since this data does not change per-request.
// The JSON versions of the files must be generated before this script is run using the csvtojson.sh script.
// To run, enter the scripts directory and call `node communes-calculations.ts`
// TODO: write tests for this script

import fs from 'node:fs'
import communes from '../data/dataByCommune/communes_17122018.csv.json' with { type: 'json' }
import epcis from '../data/dataByEpci/epci.csv.json' with { type: 'json' }
import citepaAreas from '../data/dataByCommune/citepa-surfaces-2023.csv.json' with { type: 'json' }
import citepaChanges from '../data/dataByCommune/citepa-flux-2013-2023.csv.json' with { type: 'json' }
import { completeData } from '../data/communes.ts'
import type { Commune, Epci } from '../data/types.ts'

// Pre-index epcis by code for O(1) lookups instead of O(n) find()
const epciMap = new Map<string, string>()
epcis.forEach((epci) => {
  epciMap.set(epci.code, epci.nom)
})

const extendedCommunes = completeData(communes.map((c) => ({ ...c, population: +c.population })), { areas: citepaAreas, changes: citepaChanges })
const communeDict: Record<string, Commune> = {}
const epciDict: Record<string, Epci> = {}
extendedCommunes.forEach((commune) => {
  communeDict[commune.insee] = commune
  if (commune.epci) {
    const epci = epciDict[commune.epci]
    if (!epci) {
      epciDict[commune.epci] = {
        code: commune.epci,
        nom: epciMap.get(commune.epci),
        population: commune.population,
        communes: [commune.insee]
      }
    } else {
      epci.population = (epci.population ?? 0) + (commune.population || 0) // don't have population for arrondissements
      epci.communes?.push(commune.insee)
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
