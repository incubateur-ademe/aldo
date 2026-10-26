import fluxForZpcs from './dataByCommune/flux-zpc.csv.json' with { type: 'json' }
import interRegionData from './dataByCommune/biomass-hors-forets.csv.json' with { type: 'json' }
import REGION_TO_INTER_REGION from './dataByCommune/region-to-inter-region.json' with { type: 'json' }
import carbonData2022 from './dataByEpci/bilan-carbone-foret-par-localisation.IGN-2022.csv.json' with { type: 'json' }
import carbonData2026 from './dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json' with { type: 'json' }
import { FOREST_AREA_COLUMN, FOREST_COMPOSITION, FOREST_SUBTYPES, LOCALISATION_LEVELS, getIgnLocalisation } from './shared.ts'
import { getForestAreaData } from './stocks.ts'
// TODO: move this file to a folder that both layers can rely on to not completely break
// dependency tree
import { GroundTypes, groundType, has, type PracticeId, type StocksId } from '../calculations/constants.ts'
import type { BiomassTransitionColumn, CitepaChangeRow, IgnComposition, IgnRow, SurfaceForetRow } from './csv.ts'
import type { Commune, Location } from './types.ts'

export type Reservoir = 'sol' | 'biomasse' | 'litière' | 'sol et litière'
export type Gas = 'C' | 'N2O' | 'CO2'

// Une ligne de flux, telle que décrite dans le README. Les champs optionnels
// dépendent de l'origine du flux : changement d'occupation, accroissement de
// la biomasse forestière, produits bois ou pratique agricole.
export interface Flux {
  from?: StocksId
  to: StocksId
  reservoir?: Reservoir
  gas: Gas
  commune?: string
  area?: number
  originalArea?: number
  areaModified?: boolean
  annualFlux?: number
  annualFluxEquivalent?: number
  yearsForFlux?: number
  flux?: number
  fluxEquivalent?: number
  value?: number
  co2e?: number
  // accroissement de la biomasse forestière
  ignLocalisationLevel?: string
  ignLocalisationCode?: string
  growth?: number
  mortality?: number
  timberExtraction?: number
  fluxMeterCubed?: number
  conversionFactor?: number
  // produits bois
  category?: 'bo' | 'bi'
  localHarvest?: number
  franceHarvest?: number
  localPortion?: number
  franceSequestration?: number
  localPopulation?: number
  francePopulation?: number
  // pratiques agricoles
  practice?: PracticeId
}

export interface FluxOptions {
  areas?: Record<string, number>
  areaChanges?: Record<string, number>
  woodCalculation?: string
  agriculturalPracticesEstablishedAreas?: Partial<Record<PracticeId, number>>
}

function handleGroundCarbonFluxExceptions (location: Location, from: StocksId, to: StocksId): number | undefined {
  const saArbId = 'sols artificiels arborés et buissonants'
  const saImpId = 'sols artificiels imperméabilisés'
  const saEnhId = 'sols artificiels arbustifs'
  const vergersId = 'vergers'
  const vignesId = 'vignes'
  const culturesId = 'cultures'
  const zhId = 'zones humides'
  if (from === culturesId) {
    if (to === vergersId || to === vignesId) return 0
  } else if (from.startsWith('prairies')) {
    if (to === saArbId) {
      // doesn't matter which forest subtype used here
      return getAnnualGroundCarbonFlux(location, from, 'forêt mixte')
    } else if (to === saEnhId) return 0
  } else if (from.startsWith('forêt')) {
    if (to === saArbId) return 0
  } else if (from === zhId) {
    if (to === vergersId || to === vignesId) {
      return getAnnualGroundCarbonFlux(location, from, culturesId)
    } else if (to === saImpId) {
      const zhToCultures = getAnnualGroundCarbonFlux(location, from, culturesId)
      const culturesToSaImp = getAnnualGroundCarbonFlux(location, culturesId, saImpId)
      return zhToCultures === undefined || culturesToSaImp === undefined ? undefined : zhToCultures + culturesToSaImp
    } else if (to === 'sols artificiels arbustifs') {
      // doesn't matter which prairie subtype used here
      return getAnnualGroundCarbonFlux(location, from, 'prairies zones arbustives')
    } else if (to === saArbId) {
      // doesn't matter which forest subtype used here
      return getAnnualGroundCarbonFlux(location, from, 'forêt mixte')
    }
  } else if (from === vergersId) {
    if (to === culturesId) return 0
    else if (to === zhId || to.startsWith('sols')) {
      return getAnnualGroundCarbonFlux(location, culturesId, to)
    } else if (to === vignesId) return 0
  } else if (from === vignesId) {
    if (to === culturesId) return 0
    else if (to === zhId || to.startsWith('sols')) {
      return getAnnualGroundCarbonFlux(location, culturesId, to)
    } else if (to === vergersId) return 0
  } else if (from === saImpId) {
    return getAnnualGroundCarbonFlux(location, culturesId, to)
  } else if (from === saEnhId) {
    // doesn't matter which prairie subtype used here
    return getAnnualGroundCarbonFlux(location, 'prairies zones arbustives', to)
  } else if (from === saArbId) {
    // doesn't matter which forest subtype used here
    return getAnnualGroundCarbonFlux(location, 'forêt mixte', to)
  }
}

// TODO: incorporate yearsForFlux setting in here?
export function getAnnualGroundCarbonFlux (location: Location, from: StocksId, to: StocksId): number | undefined {
  const commune = location.commune
  if (!commune) { console.log('getAnnualGroundCarbonFlux called with bad location', location); return 0 }

  const fromDetails = groundType(from)
  const toDetails = groundType(to)
  if (fromDetails.fluxId === toDetails.fluxId) return 0

  const exceptionValue = handleGroundCarbonFluxExceptions(location, from, to)
  if (exceptionValue !== undefined) return exceptionValue
  if (!fromDetails.fluxId || !toDetails.fluxId) return
  // normal flux value lookup
  const zpc = commune.zpc

  const fluxForZpc = fluxForZpcs.find(data => data.zpc === zpc)
  if (!fluxForZpc) { console.log('No ZPC for commune', commune.insee, zpc); return }

  const dataValue = fluxForZpc[`${fromDetails.fluxId}_${toDetails.fluxId}`]
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

export function getForestLitterFlux (from: StocksId, to: StocksId): number | undefined {
  // TODO: why the addition of impermeabilisés?
  const fromTypes: StocksId[] = [...FOREST_SUBTYPES, 'sols artificiels arborés et buissonants', 'sols artificiels imperméabilisés']
  const toTypes: StocksId[] = [...FOREST_SUBTYPES, 'sols artificiels arborés et buissonants']
  if (has(FOREST_SUBTYPES, from) && !toTypes.includes(to)) {
    return -9
  } else if (!fromTypes.includes(from) && toTypes.includes(to)) {
    return 9
  }
}

export function getBiomassFlux (location: Location, from: StocksId, to: StocksId): number | undefined {
  if (!location.commune?.region) {
    // console.log('No region for commune', location)
    return 0
  }
  const interRegionForCommune = REGION_TO_INTER_REGION[location.commune.region]?.interRegion
  const data = interRegionData.find(data => data.INTER_REG === interRegionForCommune)
  if (!data) {
    console.log('No inter-region found for region of commune', location)
    return 0
  }
  let key: BiomassTransitionColumn = `${from} vers ${to}`
  // TODO: why is this done ? esp herbacés to imperméables
  const keyReplacements: Partial<Record<BiomassTransitionColumn, BiomassTransitionColumn>> = {
    'prairies zones arbustives vers prairies zones arborées': 'prairies zones arbustives vers sols artificiels arborés et buissonants',
    'prairies zones herbacées vers prairies zones arborées': 'prairies zones herbacées vers sols artificiels arborés et buissonants',
    'prairies zones arborées vers prairies zones arbustives': 'prairies zones arborées vers sols artificiels arbustifs',
    'prairies zones herbacées vers prairies zones arbustives': 'prairies zones herbacées vers sols artificiels arbustifs',
    'prairies zones arborées vers prairies zones herbacées': 'prairies zones arborées vers sols artificiels imperméabilisés',
    'prairies zones arbustives vers prairies zones herbacées': 'prairies zones arbustives vers sols artificiels imperméabilisés',
    'sols artificiels arborés et buissonants vers sols artificiels arbustifs': 'sols artificiels arborés et buissonants vers prairies zones arbustives',
    'sols artificiels arborés et buissonants vers sols artificiels imperméabilisés': 'sols artificiels arborés et buissonants vers prairies zones herbacées',
    'sols artificiels arbustifs vers sols artificiels arborés et buissonants': 'zones humides vers prairies zones arborées',
    'sols artificiels arbustifs vers sols artificiels imperméabilisés': 'zones humides vers prairies zones herbacées',
    'sols artificiels imperméabilisés vers sols artificiels arborés et buissonants': 'sols artificiels imperméabilisés vers prairies zones arborées',
    'sols artificiels imperméabilisés vers sols artificiels arbustifs': 'sols artificiels imperméabilisés vers prairies zones arbustives'
  }
  key = keyReplacements[key] || key
  const dataValue = data[key]
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

// some flux data is annual, some is for the 20 year period. This function returns 1 or 20
// depending on what is required to normalise the fluxs to the same tCO2e/ha.
export function yearMultiplier (reservoir: 'sol' | 'biomasse', from: StocksId, to: StocksId): number | undefined {
  const multiplier = 20
  if (reservoir === 'sol') {
    if (from === 'zones humides' || to === 'zones humides') {
      return 1
    } else if (to === 'sols artificiels imperméabilisés') {
      return 1
    } else if (to === 'sols artificiels arbustifs') {
      return 1
    } else if (to === 'sols artificiels arborés et buissonants') {
      return 1
    } else {
      return 20
    }
  } else if (reservoir === 'biomasse') {
    // not relevant for certain types
    const ignore: StocksId[] = ['produits bois', 'sols artificiels']
    if (from.startsWith('forêt ') || to.startsWith('forêt ') || ignore.includes(from) || ignore.includes(to)) {
      return
    }
    // NB: the order here is very important, for example zones humides
    // always gives 20 except when going to sols imperméabilisés
    if (from === 'sols artificiels imperméabilisés') {
      return multiplier
    } else if (to === 'sols artificiels imperméabilisés') {
      return 1
    } else if (to === 'prairies zones arborées') {
      return multiplier
    } else if (from === 'prairies zones arborées') {
      return 1
    } else if (from === 'zones humides') {
      return multiplier
    } else if (to === 'zones humides') {
      return 1
    } else if (from === 'cultures') {
      return multiplier
    } else if (to === 'cultures') {
      return 1
    } else if (from === 'sols artificiels arborés et buissonants') {
      return 1
    } else if (to === 'sols artificiels arborés et buissonants') {
      return multiplier
    } else if (from === 'prairies zones herbacées') {
      return multiplier
    } else if (to === 'prairies zones herbacées') {
      return 1
    } else if (from === 'vergers') {
      return 1
    } else if (to === 'vergers') {
      return multiplier
    } else if (from === 'vignes') {
      return multiplier
    } else if (to === 'vignes') {
      return 1
    } else if (from === 'prairies zones arbustives') {
      return 1
    } else if (to === 'prairies zones arbustives') {
      return multiplier
    }
    // the remaining type is sols artificiels arbustifs, but any from/to combo has already
    // been covered by the above
  }
  console.log('ERROR: multiplier not found for combination of reservoir: ' + reservoir + ' from: ' + from + ' to: ' + to)
  return 1
}

// returns all known fluxes for from - to combinations
// TODO: could make more efficient by opening all the files and finding the location data once
export function getFluxReferenceValues (location: Location): Flux[] {
  const commune = location.commune
  if (!commune) throw new Error('getFluxReferenceValues requires a commune')
  let fluxes: Flux[] = []
  for (const fromGt of GroundTypes) {
    const from = fromGt.stocksId
    for (const toGt of GroundTypes) {
      const to = toGt.stocksId
      if (from === to) {
        continue
      }
      if (fromGt.fluxId && toGt.fluxId && fromGt.fluxId !== toGt.fluxId) {
        const annualFlux = getAnnualGroundCarbonFlux(location, from, to)
        const yearsForFlux = yearMultiplier('sol', from, to)
        if (annualFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux,
            annualFluxEquivalent: cToCo2e(annualFlux),
            yearsForFlux,
            reservoir: 'sol',
            gas: 'C',
            commune: commune.insee
          })
        }
        const litterFlux = getForestLitterFlux(from, to)
        if (litterFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux: litterFlux,
            annualFluxEquivalent: cToCo2e(litterFlux),
            yearsForFlux: 1,
            reservoir: 'litière',
            gas: 'C',
            commune: commune.insee
          })
        }
      }
      const ignoreBiomass: StocksId[] = ['prairies', 'haies', 'forêts']
      if (!ignoreBiomass.includes(from) && !ignoreBiomass.includes(to)) {
        const biomassFlux = getBiomassFlux(location, from, to)
        const yearsForFlux = yearMultiplier('biomasse', from, to)
        if (biomassFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux: biomassFlux,
            annualFluxEquivalent: cToCo2e(biomassFlux),
            yearsForFlux,
            reservoir: 'biomasse',
            gas: 'C',
            commune: commune.insee
          })
        }
      }
    }
  }
  const forestBiomassFluxes = getForestBiomassFluxesByCommune(location)
  fluxes = fluxes.concat(forestBiomassFluxes)
  return fluxes
}

export function cToCo2e (valueC: number) {
  return valueC * 44 / 12
}

export function getAnnualSurfaceChange (location: Location, options: FluxOptions, from: StocksId, to: StocksId): number {
  const yearlyAreaChange = location.commune?.changes?.[from]?.[to] || 0
  const solsArtificielsException = getSolsArtificielsException(from, to)
  if (solsArtificielsException !== undefined) {
    return solsArtificielsException
  }
  return yearlyAreaChange
}

// Maps Citepa usage codes to ALDO stocksId
// Based on the new Citepa format where codes are already in ALDO nomenclature
// According to the brief, the Citepa data already corresponds to ALDO nomenclature
// Prefer leaf types (no children) over parent types when a code matches both
function mapCitepaCodeToStocksId (citepaCode: string): StocksId | null {
  if (!citepaCode) return null

  const matches = GroundTypes.filter(groundType => has(groundType.citepaCodes ?? [], citepaCode))
  const leafMatch = matches.find(gt => !gt.children)
  return (leafMatch || matches[0])?.stocksId || null
}

// Optimized getAnnualSurfaceChangeFromData using pre-indexed data
export function getAnnualSurfaceChangeFromDataOptimized ({ commune, from, to, citepaDataByCommuneMap }: {
  commune: Pick<Commune, 'insee'>
  from: StocksId
  to: StocksId
  citepaDataByCommuneMap: Map<string, CitepaChangeRow[]>
}) {
  const areaChangesForCommune = citepaDataByCommuneMap.get(commune.insee) || []
  const changesForGroundTypes = areaChangesForCommune.filter((change) => {
    const fromStocksId = mapCitepaCodeToStocksId(change.usage_2013)
    const toStocksId = mapCitepaCodeToStocksId(change.usage_2023)
    return fromStocksId === from && toStocksId === to
  })
  const totalAreaChange = changesForGroundTypes.reduce((acc, change) => {
    const area = parseFloat(change.surfaces_converties)
    return acc + (isNaN(area) ? 0 : area)
  }, 0)
  const yearsBetweenStudies = 10 // Période 2013-2023 = 10 ans
  const yearlyAreaChange = totalAreaChange / yearsBetweenStudies
  return yearlyAreaChange
}

// Business rules for sols artificiels transitions. Citepa data provides A_i, A_h, A_a
// separately, so we use direct values and only apply these rules.
function getSolsArtificielsException (from: StocksId, to: StocksId): number | undefined {
  if (to === 'sols artificiels imperméabilisés') {
    if (from === 'sols artificiels arbustifs') return 0
  } else if (to === 'sols artificiels arbustifs') {
    if (from === 'sols artificiels imperméabilisés') return 0
  } else if (to === 'sols artificiels arborés et buissonants') {
    const none: StocksId[] = ['sols artificiels arbustifs', 'prairies zones arborées', 'prairies zones arbustives', 'vergers', 'vignes', 'zones humides']
    if (none.indexOf(from) > -1) return 0
  }
  // Use direct Citepa value (return undefined to fall through)
}

// source: CITEPA 2016-2019. In tCO2/an
export function getFranceFluxWoodProducts () {
  return {
    bo: 918160.6252,
    bi: 441532.8296
  }
}

// Source for the following data : IGN 2022
// given an EPCI, return an array of flux objects (as described in readme)
// with additional keys for:
// - commune INSEE code
// - ignLocalisationLevel (groupeser, greco, rad13, France)
// - ignLocalisationCode (e.g. A1, A, ARA, France)
// NB: can have multiple entries for one commune + forest composition combo,
//     because the land can be split by different ignLocalisationCode
// So a flux entry is unique on commune, to, ignLocalisationCode keys.
export function getForestBiomassFluxesByCommune (location: Location): Flux[] {
  // there is data with null values because it isn't statistically significant at that
  // level. Remove these lines because they are not used.
  const significantCarbonData = carbonData2026.filter((data) => data.surface_ic === 's')
  const areaDataByCommune = getForestAreaData(location)
  const fluxes: Flux[] = []
  areaDataByCommune.forEach((communeData) => {
    // for each line of data by commune + localisationCode, we need to add a flux
    //   for each of the four forest subtypes
    FOREST_SUBTYPES.forEach((forestSubtype) => {
      const subtype = FOREST_COMPOSITION[forestSubtype]
      const compositionCarbonData =
        significantCarbonData.filter((data) => data.composition === subtype)
      let carbonDataForCommuneAndLocalisation: IgnRow | undefined
      let ignLocalisationLevel = 'France'
      let ignLocalisationCode = 'France'
      for (const level of LOCALISATION_LEVELS) {
        const { localisationCode, localisationLevel } = getIgnLocalisation(communeData, level, subtype)
        carbonDataForCommuneAndLocalisation =
          compositionCarbonData.find((data) => data.code_localisation === localisationCode)
        if (carbonDataForCommuneAndLocalisation) {
          ignLocalisationLevel = localisationLevel
          ignLocalisationCode = localisationCode
          break
        }
      }
      if (!carbonDataForCommuneAndLocalisation) {
        carbonDataForCommuneAndLocalisation =
          compositionCarbonData.find((data) => data.code_localisation === 'France')
        if (!carbonDataForCommuneAndLocalisation) {
          // this is unexpected
          const message =
            `Carbon data could not be retrieved for commune ${communeData.INSEE_COM} and subtype ${forestSubtype}`
          throw new Error(message)
        }
      }
      const row = carbonDataForCommuneAndLocalisation
      const annualFlux = +row['bilan_carbone_(tC∙ha-1∙an-1)']
      fluxes.push({
        commune: communeData.INSEE_COM,
        to: forestSubtype,
        reservoir: 'biomasse',
        gas: 'C',
        area: +communeData[FOREST_AREA_COLUMN[forestSubtype]],
        ignLocalisationLevel,
        ignLocalisationCode,
        growth: +row['production_volume_(m3∙ha-1∙an-1)'],
        mortality: +row['mortalite_volume_(m3∙ha-1∙an-1)'],
        timberExtraction: +row['prelevement_volume_(m3∙ha-1∙an-1)'],
        fluxMeterCubed: +row['bilan_volume_(m3∙ha-1∙an-1)'],
        conversionFactor: +row.fexp_vol_carb,
        annualFlux,
        annualFluxEquivalent: cToCo2e(annualFlux)
      })
    })
  })
  return fluxes
}

type ForestFluxKey = 'accroissement' | 'mortalite' | 'prelevement' | 'bilan'
export type ForestComparisonData = Record<ForestFluxKey, number>
export type ForestComparison =
  | { hasForestData: false }
  | {
    hasForestData: true
    data2022: ForestComparisonData
    data2026: ForestComparisonData
    localisationCode2022: string | undefined
    localisationCode2026: string | undefined
    hasWarning: boolean
  }

// Retourne une comparaison agrégée des flux de carbone forestiers entre
// les deux campagnes IGN (2022 = 2016-2020, 2026 = 2020-2024).
// Les valeurs sont en tCO2e/ha/an, agrégées par moyenne pondérée sur les surfaces du territoire.
export function getForestBiomassComparisonByCommune (location: Location): ForestComparison {
  const WARNING_SURFACE_RATIO_THRESHOLD = 0.05
  // Regroupements non supportés
  if (!location.commune && !location.epci) {
    return { hasForestData: false }
  }

  // Pré-filtrage sur données statistiquement significatives (identique à l'existant)
  const significantData2022 = carbonData2022.filter(d => d.surface_ic === 's')
  const significantData2026 = carbonData2026.filter(d => d.surface_ic === 's')

  // Filtrer les lignes du territoire
  const areaDataByCommune = getForestAreaData(location)

  // Vérifier qu'il y a de la forêt dans le territoire
  const totalForestArea = areaDataByCommune.reduce((sum, d) => {
    return sum + (+d.SUR_FEUILLUS || 0) + (+d.SUR_RESINEUX || 0) + (+d.SUR_MIXTES || 0) + (+d.SUR_PEUPLERAIES || 0)
  }, 0)
  if (totalForestArea === 0) {
    return { hasForestData: false }
  }

  const compositions = [
    { subtype: 'Feuillu', surfaceCol: 'SUR_FEUILLUS' },
    { subtype: 'Conifere', surfaceCol: 'SUR_RESINEUX' },
    { subtype: 'Mixte', surfaceCol: 'SUR_MIXTES' },
    { subtype: 'Peupleraie', surfaceCol: 'SUR_PEUPLERAIES' }
  ] as const

  const carbonColumns = {
    accroissement: 'production_carbone_(tC∙ha-1∙an-1)',
    mortalite: 'mortalite_carbone_(tC∙ha-1∙an-1)',
    prelevement: 'prelevement_carbone_(tC∙ha-1∙an-1)',
    bilan: 'bilan_carbone_(tC∙ha-1∙an-1)'
  } as const satisfies Record<ForestFluxKey, keyof IgnRow>
  const fluxKeys = Object.keys(carbonColumns) as ForestFluxKey[]

  // Accumulateurs pour la moyenne pondérée
  const acc2022: ForestComparisonData = { accroissement: 0, mortalite: 0, prelevement: 0, bilan: 0 }
  const acc2026: ForestComparisonData = { accroissement: 0, mortalite: 0, prelevement: 0, bilan: 0 }
  // totalWeight = Σ surfaces (all compositions) → dénominateur de la moyenne pondérée
  // surfacePerSubtype = surfaces par composition → pour identifier la composition dominante
  // (totalWeight === sum of surfacePerSubtype values)
  let totalWeight = 0

  // Pour le code de localisation affiché : composition dominante par surface TOTALE sur tout le territoire.
  // On accumule surface par composition, et on garde le code de la commune qui contribue le plus
  // à chaque composition (pour les EPCIs multi-communes où le code peut varier par commune).
  const surfacePerSubtype: Partial<Record<IgnComposition, number>> = {} // { Feuillu: totalHa, Conifere: totalHa, ... }
  const maxSurfacePerSubtype: Partial<Record<IgnComposition, number>> = {} // { Feuillu: maxHaInOneCommune, ... } — pour trouver le code dominant
  const code2022PerSubtype: Partial<Record<IgnComposition, string>> = {} // code de la commune qui contribue le plus de ha pour ce subtype
  const code2026PerSubtype: Partial<Record<IgnComposition, string>> = {}

  const isSubtypeAffected: Partial<Record<IgnComposition, boolean>> = {} // { Feuillu: true/false, ... }

  // Helper : résoudre la localisation dans un dataset pour une commune et une composition
  function resolveLocalisation (communeData: SurfaceForetRow, subtype: IgnComposition, significantData: IgnRow[]) {
    const compositionData = significantData.filter(d => d.composition === subtype)
    for (const level of LOCALISATION_LEVELS) {
      const { localisationCode, localisationLevel } = getIgnLocalisation(communeData, level, subtype)
      const row = compositionData.find(d => d.code_localisation === localisationCode)
      if (row) return { localisationCode, localisationLevel, row }
    }
    // Fallback France
    const row = compositionData.find(d => d.code_localisation === 'France')
    if (!row) {
      throw new Error(
        `Carbon data could not be retrieved for commune ${communeData.INSEE_COM} and subtype ${subtype}`
      )
    }
    return { localisationCode: 'France', localisationLevel: 'France', row }
  }

  // Helper : détecte si la significativité (surface_ic) diffère entre les deux datasets
  // pour une commune et une composition donnée.
  // Vérifie tous les niveaux de localisation en utilisant les codes bruts de la commune
  // (sans passer par getIgnLocalisation qui peut convertir certains codes comme PDL→A).
  function hasSignificanceDifference (communeData: SurfaceForetRow, subtype: IgnComposition) {
    const comp2022 = carbonData2022.filter(d => d.composition === subtype)
    const comp2026 = carbonData2026.filter(d => d.composition === subtype)
    for (const level of LOCALISATION_LEVELS) {
      const rawCode = communeData[`code_${level}`]
      if (!rawCode) continue
      const row2022 = comp2022.find(d => d.code_localisation === rawCode)
      const row2026 = comp2026.find(d => d.code_localisation === rawCode)
      if ((row2022 || row2026) && (row2022?.surface_ic === 's') !== (row2026?.surface_ic === 's')) {
        return true
      }
    }
    return false
  }

  areaDataByCommune.forEach(communeData => {
    compositions.forEach(({ subtype, surfaceCol }) => {
      const surface = +communeData[surfaceCol] || 0
      if (surface === 0) return // Exclure les compositions sans surface

      const res2022 = resolveLocalisation(communeData, subtype, significantData2022)
      const res2026 = resolveLocalisation(communeData, subtype, significantData2026)

      if (hasSignificanceDifference(communeData, subtype)) {
        isSubtypeAffected[subtype] = true
      }

      // Accumulation pondérée
      fluxKeys.forEach(fluxKey => {
        const col = carbonColumns[fluxKey]
        acc2022[fluxKey] += (+res2022.row[col] || 0) * surface
        acc2026[fluxKey] += (+res2026.row[col] || 0) * surface
      })
      totalWeight += surface

      // Accumulation surface par composition (pour trouver la composition dominante après la boucle)
      surfacePerSubtype[subtype] = (surfacePerSubtype[subtype] || 0) + surface
      // Codes : on retient ceux de la commune qui contribue le plus de ha pour ce subtype
      if (surface > (maxSurfacePerSubtype[subtype] || 0)) {
        maxSurfacePerSubtype[subtype] = surface
        code2022PerSubtype[subtype] = res2022.localisationCode
        code2026PerSubtype[subtype] = res2026.localisationCode
      }
    })
  })

  const subtypeSurfaces = Object.entries(surfacePerSubtype) as [IgnComposition, number][]
  const totalAffectedForestArea = subtypeSurfaces.reduce((sum, [subtype, surface]) => {
    return sum + (isSubtypeAffected[subtype] ? surface : 0)
  }, 0)

  const hasWarning =
    totalForestArea > 0 &&
    (totalAffectedForestArea / totalForestArea) >= WARNING_SURFACE_RATIO_THRESHOLD

  // Composition dominante = celle avec la plus grande surface totale sur tout le territoire
  const dominantSubtype = subtypeSurfaces
    .sort(([, a], [, b]) => b - a)[0]?.[0]
  const dominantCode2022 = dominantSubtype && code2022PerSubtype[dominantSubtype]
  const dominantCode2026 = dominantSubtype && code2026PerSubtype[dominantSubtype]

  // Moyenne pondérée + conversion tC → tCO2e
  const data2022: ForestComparisonData = { accroissement: 0, mortalite: 0, prelevement: 0, bilan: 0 }
  const data2026: ForestComparisonData = { accroissement: 0, mortalite: 0, prelevement: 0, bilan: 0 }
  fluxKeys.forEach(fluxKey => {
    data2022[fluxKey] = cToCo2e(acc2022[fluxKey] / totalWeight)
    data2026[fluxKey] = cToCo2e(acc2026[fluxKey] / totalWeight)
  })

  return {
    data2022,
    data2026,
    localisationCode2022: dominantCode2022,
    localisationCode2026: dominantCode2026,
    hasWarning,
    hasForestData: true
  }
}
