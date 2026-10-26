import communesData from './dataByCommune/communes.json' with { type: 'json' }
import zpcByCommune from './dataByCommune/zpc.csv.json' with { type: 'json' }
import { LEAF_GROUND_TYPES, type StocksId } from '../calculations/constants.ts'
import { getAreaFromDataOptimized } from './stocks.ts'
import { getAnnualSurfaceChangeFromDataOptimized } from './flux.ts'
import type { CitepaChangeRow, CitepaSurfaceRow } from './csv.ts'
import type { Commune, Location } from './types.ts'

export function getCommunes (location: Location): Commune[] {
  // handle the location options
  const epcis = location.epcis || []
  if (location.epci) epcis.push(location.epci)
  const epciCommuneCodes: string[] = []
  epcis.forEach((epci) => epciCommuneCodes.push(...(epci.communes ?? [])))
  const allCommunes: Commune[] = []
  addCommunesIfUnique(allCommunes, epciCommuneCodes)

  const remainingCommunes = location.communes || []
  if (location.commune) remainingCommunes.push(location.commune)
  addCommunesIfUnique(allCommunes, remainingCommunes)

  addArrondissements(allCommunes)

  return allCommunes
}

// can pass list of commune objects or insee codes
function addCommunesIfUnique (communes: Commune[], communesToAdd: (Commune | string)[]) {
  communesToAdd.forEach((commune) => {
    const insee = typeof commune === 'string' ? commune : commune.insee
    const alreadyIncluded = communes.some((c) => c.insee === insee)
    if (alreadyIncluded) return
    const toAdd = typeof commune === 'string' ? communesData[commune] : commune
    if (toAdd) communes.push(toAdd)
  })
}

function addArrondissements (communes: Commune[]) {
  let arrondissementsToAdd: Commune[] = []
  communes.forEach((commune) => {
    commune.zpc = zpcByCommune.find((zpcData) => zpcData.insee === commune.insee)?.zpc
    const arrondissements = COMMUNES_WITH_ARRONDISSEMENTS[commune.insee]
    if (arrondissements) {
      arrondissementsToAdd = arrondissementsToAdd.concat(arrondissements.map((aInsee) => communesData[aInsee]).filter((c) => c !== undefined))
    }
  })
  arrondissementsToAdd.forEach((a) => communes.push(a))
}

// Pre-index commune data for O(1) lookups instead of O(n) find()
export function buildCommuneMap<T extends { insee_com: string }> ({ communesRawData }: { communesRawData: T[] }): Map<string, T[]> {
  return communesRawData.reduce((communesMap, item) => {
    const insee = item.insee_com
    const existing = communesMap.get(insee) || []
    return communesMap.set(insee, [...existing, item])
  }, new Map<string, T[]>())
}

// adds data about:
// - arrondissements
// - ZPC
// - surfaces et changements de surfaces CITEPA (`areas` et `changes` sont les
//   lignes brutes des CSV, chargées par l'appelant car très volumineuses)
export function completeData (communes: Commune[], citepa: { areas: CitepaSurfaceRow[], changes: CitepaChangeRow[] }) {
  const zpcByCommuneMap = new Map<string, string>()
  zpcByCommune.forEach((zpcData) => {
    zpcByCommuneMap.set(zpcData.insee, zpcData.zpc)
  })

  const areasByCommuneMap = buildCommuneMap({ communesRawData: citepa.areas })
  const citepaDataByCommuneMap = buildCommuneMap({ communesRawData: citepa.changes })

  let arrondissementsToAdd: Commune[] = []
  communes.forEach((commune) => {
    commune.zpc = zpcByCommuneMap.get(commune.insee)
    const arrondissements = COMMUNES_WITH_ARRONDISSEMENTS[commune.insee]
    if (arrondissements) {
      // TODO: reassess if EPCI is requried if move biomass region to here too
      arrondissementsToAdd = arrondissementsToAdd.concat(arrondissements.map((aInsee) => {
        return { insee: aInsee, zpc: commune.zpc, epci: commune.epci, region: commune.region, departement: commune.departement }
      }))
    }
  })
  const allCommunes = communes.concat(arrondissementsToAdd)

  // Progress indicator every 100 communes instead of every commune
  const totalCommunes = allCommunes.length
  allCommunes.forEach((commune, index) => {
    if (index % 100 === 0) {
      console.log(`Processing commune ${index + 1}/${totalCommunes} (${commune.insee})`)
    }
    const changes: Commune['changes'] = {}
    const citepa2021: Commune['citepa2021'] = {}
    LEAF_GROUND_TYPES.forEach((fromGt) => {
      const changesFrom: Partial<Record<StocksId, number>> = {}
      changes[fromGt.stocksId] = changesFrom
      citepa2021[fromGt.stocksId] = getAreaFromDataOptimized({ commune, groundType: fromGt.stocksId, areasByCommuneMap })
      LEAF_GROUND_TYPES.forEach((toGt) => {
        if (fromGt.stocksId === toGt.stocksId) return
        const area = getAnnualSurfaceChangeFromDataOptimized({ commune, from: fromGt.stocksId, to: toGt.stocksId, citepaDataByCommuneMap })
        if (area) changesFrom[toGt.stocksId] = area
      })
    })
    commune.changes = changes
    commune.citepa2021 = citepa2021
  })
  return allCommunes
}

// some communes have arrondissements which are administratively communes but will be referred to as arrondissements in this code.
// We want the user to be able to select communes, not arrondissements. In general, the UI should only show communes.
// The data, however, is at mixed levels.
// CLC 18 and forest area data is at arrondissement level.
// ZPC is at commune level.
const COMMUNES_WITH_ARRONDISSEMENTS: Record<string, string[] | undefined> = {
  // Lyon
  69123: [
    '69381', '69382', '69383', '69384', '69385', '69386',
    '69387', '69388', '69389'
  ],
  // Marseille
  13055: [
    '13201', '13202', '13203', '13204', '13205', '13206',
    '13207', '13208', '13209', '13210',
    '13211', '13212', '13213', '13214', '13215', '13216'
  ],
  // Paris
  75056: [
    '75101', '75102', '75103', '75104', '75105', '75106',
    '75107', '75108', '75109', '75110',
    '75111', '75112', '75113', '75114', '75115', '75116',
    '75117', '75118', '75119', '75120'
  ]
}
