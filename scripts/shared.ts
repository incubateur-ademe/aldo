// Éléments communs aux scripts de génération des fichiers DATA ADEME.
import communesData from '../data/dataByCommune/communes.json' with { type: 'json' }
import forestAreaRaw from '../data/dataByCommune/surface-foret.csv.json' with { type: 'json' }
import regionToInterRegion from '../data/dataByCommune/region-to-inter-region.json' with { type: 'json' }
import type { Commune } from '../data/types.ts'
import { GroundTypes, has, type StocksId } from '../calculations/constants.ts'
import { FOREST_SUBTYPES } from '../data/shared.ts'

// Paires (from, to) des fichiers flux1/flux2, dans l'ordre de la référence DATA ADEME :
// occupations ayant un identifiant de flux, hors forêt -> forêt (traité via la biomasse).
const fluxGroundTypes = GroundTypes.filter((gt) => gt.altFluxId || gt.fluxId)
export const FLUX_PAIRS: readonly [StocksId, StocksId][] = fluxGroundTypes.flatMap((fromGt) => fluxGroundTypes
  .filter((toGt) => fromGt.stocksId !== toGt.stocksId && !(has(FOREST_SUBTYPES, fromGt.stocksId) && has(FOREST_SUBTYPES, toGt.stocksId)))
  .map((toGt): [StocksId, StocksId] => [fromGt.stocksId, toGt.stocksId]))

// Codes INSEE des arrondissements (absents des fichiers de référence)
export const ARRONDISSEMENT_CODES = new Set([
  // Paris
  '75101', '75102', '75103', '75104', '75105', '75106', '75107', '75108',
  '75109', '75110', '75111', '75112', '75113', '75114', '75115', '75116',
  '75117', '75118', '75119', '75120',
  // Lyon
  '69381', '69382', '69383', '69384', '69385', '69386', '69387', '69388', '69389',
  // Marseille
  '13201', '13202', '13203', '13204', '13205', '13206', '13207', '13208',
  '13209', '13210', '13211', '13212', '13213', '13214', '13215', '13216'
])

export interface ForestMeta {
  groupe_ser: string
  greco: string
  rad_13: string
  bassin_populicole: string
}

export const EMPTY_FOREST_META: ForestMeta = { groupe_ser: '', greco: '', rad_13: '', bassin_populicole: '' }

// Index de la géolocalisation forestière par commune (code INSEE sur 5 caractères).
// Quand une commune a plusieurs lignes (plusieurs SER), on prend la 1ère.
export const forestMetaByCommune: Record<string, ForestMeta> = {}
forestAreaRaw.forEach((row) => {
  // INSEE_COM dans surface-foret peut être sans zéro initial
  const code = String(row.INSEE_COM).padStart(5, '0')
  forestMetaByCommune[code] ??= {
    groupe_ser: row.code_groupeser || '',
    greco: row.code_greco || '',
    rad_13: row.code_rad13 || '',
    bassin_populicole: row.code_bassin_populicole || ''
  }
})

export function communesToExport (): Commune[] {
  return Object.values(communesData).filter(
    (c) => !ARRONDISSEMENT_CODES.has(String(c.insee).padStart(5, '0'))
  )
}

export function interRegionOf (commune: Commune) {
  return regionToInterRegion[String(commune.region)]?.interRegion || ''
}

// Colonnes de métadonnées communes à tous les fichiers (insee, nom, ..., population)
export function communeMeta (commune: Commune, insee: string): (string | number)[] {
  const forestMeta = forestMetaByCommune[String(commune.insee).padStart(5, '0')] || EMPTY_FOREST_META
  return [
    insee,
    commune.nom ?? '',
    commune.epci || '',
    commune.departement || '',
    commune.region || '',
    commune.zpc || '',
    interRegionOf(commune),
    forestMeta.groupe_ser,
    forestMeta.greco,
    forestMeta.rad_13,
    forestMeta.bassin_populicole,
    commune.population || 0
  ]
}

export type CsvCell = string | number | null | undefined

// Formatage d'une valeur CSV. `quoteAll` reproduit le format QUOTE_ALL de certains
// fichiers de référence DATA ADEME.
export function csvValue (v: CsvCell, quoteAll = false) {
  if (v === null || v === undefined || v === '') return quoteAll ? '""' : ''
  const str = String(v)
  if (quoteAll || str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function errorMessage (err: unknown) {
  return err instanceof Error ? err.message : String(err)
}
