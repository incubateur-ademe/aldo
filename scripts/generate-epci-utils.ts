import epcisData from '../data/dataByEpci/epcis.json' with { type: 'json' }
import communesData from '../data/dataByCommune/communes.json' with { type: 'json' }
import regionToInterRegion from '../data/dataByCommune/region-to-inter-region.json' with { type: 'json' }
import type { Commune, Epci } from '../data/types.ts'

export function getEpcis (): Epci[] {
  return Object.values(epcisData)
}

export function getCommunesForEpci (epci: Epci): Commune[] {
  return (epci.communes || [])
    .map((code) => communesData[String(code).padStart(5, '0')])
    .filter((c) => c !== undefined)
}

function getDominantValueByPopulation (communes: Commune[], key: 'region' | 'departement') {
  const totals = new Map<string, number>()
  communes.forEach((commune) => {
    const value = commune?.[key]
    if (!value) return
    const population = commune.population || 0
    totals.set(value, (totals.get(value) || 0) + population)
  })
  let bestValue = ''
  let bestPopulation = -1
  totals.forEach((population, value) => {
    if (population > bestPopulation) {
      bestPopulation = population
      bestValue = value
    }
  })
  return bestValue
}

export function getEPCIBaseMeta (epci: Epci) {
  const communes = getCommunesForEpci(epci)
  const region = getDominantValueByPopulation(communes, 'region')
  return {
    insee: epci.code,
    nom: epci.nom || '',
    epci: epci.code,
    departement: getDominantValueByPopulation(communes, 'departement') || '',
    region: region || '',
    zpc: '',
    inter_region: regionToInterRegion[String(region)]?.interRegion || '',
    groupe_ser: '',
    greco: '',
    rad_13: '',
    bassin_populicole: '',
    population: epci.population || 0
  }
}

export type EpciMeta = ReturnType<typeof getEPCIBaseMeta>

export function epciMetaRow (meta: EpciMeta): (string | number)[] {
  return [
    meta.insee, meta.nom, meta.epci, meta.departement, meta.region, meta.zpc,
    meta.inter_region, meta.groupe_ser, meta.greco, meta.rad_13, meta.bassin_populicole, meta.population
  ]
}
