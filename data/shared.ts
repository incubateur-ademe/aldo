import type { ForestSubtype } from '../calculations/constants.ts'
import type { IgnComposition, IgnLocalisationLevel, SurfaceForetRow } from './csv.ts'

export const FOREST_SUBTYPES: readonly ForestSubtype[] = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']

// Sous-type de forêt ALDO -> composition IGN
export const FOREST_COMPOSITION: Record<ForestSubtype, IgnComposition> = {
  'forêt feuillu': 'Feuillu',
  'forêt conifere': 'Conifere',
  'forêt mixte': 'Mixte',
  'forêt peupleraie': 'Peupleraie'
}

// Sous-type de forêt ALDO -> colonne de surface dans surface-foret.csv
export const FOREST_AREA_COLUMN = {
  'forêt feuillu': 'SUR_FEUILLUS',
  'forêt conifere': 'SUR_RESINEUX',
  'forêt mixte': 'SUR_MIXTES',
  'forêt peupleraie': 'SUR_PEUPLERAIES'
} as const satisfies Record<ForestSubtype, keyof SurfaceForetRow>

// Niveaux de localisation IGN, du plus précis au plus large
export const LOCALISATION_LEVELS: readonly IgnLocalisationLevel[] = ['groupeser', 'greco', 'rad13', 'bassin_populicole']

export function getIgnLocalisation (communeData: Pick<SurfaceForetRow, `code_${IgnLocalisationLevel}`>, level: IgnLocalisationLevel, subtype: IgnComposition | undefined) {
  let code: string = communeData[`code_${level}`]
  const coniferOrMixed = subtype === 'Conifere' || subtype === 'Mixte'
  // sometimes, using a neighbouring region is preferable to using the France-wide data
  if (code === 'COR' && coniferOrMixed) {
    code = 'J'
    level = 'greco'
  } else if (code === 'HDF' && coniferOrMixed) {
    // there are some instances of NA,HDF in the data
    // IDF would have same exception, except all data is in B3, B4, or B5 so greco B already used
    code = 'B'
    level = 'greco'
  } else if (code === 'PDL' && subtype === 'Mixte') {
    // there are some instances of NA,PDL in the data
    code = 'A'
    level = 'greco'
  }
  return {
    localisationCode: code,
    localisationLevel: level
  }
}
