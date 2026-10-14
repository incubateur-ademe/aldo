import franceData from './dataByEpci/france.json' with { type: 'json' }
import communes from './dataByCommune/communes_17122018.csv.json' with { type: 'json' }

export function epciList () {
  return Object.values(franceData.epcis).map((epci) => {
    return {
      code: epci.code,
      nom: epci.nom
    }
  })
}

export function getPopulationTotal () {
  return franceData.totalPopulation
}

export function communeList () {
  return communes.map((c) => ({ nom: c.nom, code: c.insee }))
}
