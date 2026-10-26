import stocksForZpcs from './dataByCommune/stocks-zpc.csv.json' with { type: 'json' }
import forestAreaData from './dataByCommune/surface-foret.csv.json' with { type: 'json' }
import forestCarbonData from './dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json' with { type: 'json' }
import interRegionData from './dataByCommune/biomass-hors-forets.csv.json' with { type: 'json' }
import regionProportionData from './dataByEpci/proportion-usage-bois-par-region.csv.json' with { type: 'json' }
import hedgerowCarbonData from './dataByCommune/carbone-haies.csv.json' with { type: 'json' }
import hedgerowLengthData from './dataByCommune/haie-clc18.csv.json' with { type: 'json' }
import REGION_TO_INTER_REGION from './dataByCommune/region-to-inter-region.json' with { type: 'json' }
import { FOREST_AREA_COLUMN, FOREST_COMPOSITION, LOCALISATION_LEVELS, getIgnLocalisation } from './shared.ts'
import { GroundTypes, has, type ForestSubtype, type StocksId } from '../calculations/constants.ts'
import { STOCKS_ZPC_COLUMNS, type CitepaSurfaceRow, type IgnLocalisationLevel, type IgnRow, type SurfaceForetRow } from './csv.ts'
import type { Commune, Location } from './types.ts'

// Gets the carbon area density of a given ground type using the zone pédo-climatique majoritaire for the commune
export function getCarbonDensity (commune: Pick<Commune, 'insee' | 'zpc'>, groundType: string): number {
  const zpcForCommune = commune.zpc
  if (!zpcForCommune) {
    // Not expecting this to happen but in case it does, fail silently
    console.log('No ZPC for commune : ', commune)
    return 0
  }
  const stocksForZpc = stocksForZpcs.find((data) => data.zpc === zpcForCommune)
  if (!stocksForZpc) {
    // Not expecting this to happen but in case it does, fail silently
    console.log('No stocks for ZPC : ', zpcForCommune)
    return 0
  }
  const carbonDensity = has(STOCKS_ZPC_COLUMNS, groundType) ? stocksForZpc[groundType] : undefined
  if (!carbonDensity) {
    // Not expecting this to happen but in case it does, fail silently
    console.log('No stocks for ground type and ZPC : ', groundType, stocksForZpc)
    return 0
  }
  return +carbonDensity
}

// Area in hectares (ha) of a given ground type in a commune, 0 if unknown.
export function getArea (location: Location, groundType: StocksId): number {
  if (!location.commune) { console.log('getArea in data/stocks called wrong', location); return 0 }
  const area = location.commune.citepa2021?.[groundType]
  if (area !== undefined && area >= 0) return area
  console.log('no area saved for', location.commune.insee, groundType)
  return 0
}

// Gets the area in hectares (ha) of a given ground type in a location.
// The ground types Corine Land Cover uses are different from the types used by ALDO,
// so a mapping is used and the sum of ha of all matching CLC types is returned.
// NB: in the lookup the type names for ground data and the more specific biomass data
// are placed on the same level, so some CLC codes are used in two types.
export function getAreaFromDataOptimized ({ commune, groundType, areasByCommuneMap }: {
  commune: Pick<Commune, 'insee'>
  groundType: StocksId
  areasByCommuneMap: Map<string, CitepaSurfaceRow[]>
}): number | undefined {
  if (!commune) { console.log('getAreaFromData in data/stocks called wrong', commune); return }
  if (groundType === 'haies') {
    return
  }
  const typeDetails = GroundTypes.find((gt) => gt.stocksId === groundType)
  const citepaCodes = typeDetails?.citepaCodes
  if (!citepaCodes) {
    throw new Error(`No CITEPA code mapping found for ground type '${groundType}'`)
  }

  // TODO: handle case where no CITEPA codes are found.
  // This case should not happen, but we're still waiting for CITEPA answer regarding Aldo ground types mapping.
  if (citepaCodes.length === 0) {
    return 0
  }

  const areaDataForCommune = areasByCommuneMap.get(commune.insee) || []
  const totalArea = areaDataForCommune
    .filter((areaData) => has(citepaCodes, areaData.usage_2021))
    .reduce((totalArea, areaData) => totalArea + (+areaData.surfaces_ha), 0)

  return totalArea
}

export function getSignificantCarbonData () {
  // there is data will null values because it isn't statistically significant at that
  // level. Remove these lines because they are not used.
  return forestCarbonData.filter((data) => data.surface_ic === 's')
}

// TODO: fix file to append 0 to all the codes that are just 4 characters long
function forestInseeCode (insee: string) {
  return insee.startsWith('0') ? insee.slice(1) : insee
}

export function getForestAreaData (location: Location): SurfaceForetRow[] {
  if (location.epci) {
    const code = location.epci.code
    return forestAreaData.filter(data => data.CODE_EPCI === code)
  } else if (location.commune) {
    const code = forestInseeCode(location.commune.insee)
    return forestAreaData.filter(data => data.INSEE_COM === code)
  }
  const communeCodes = (location.communes ?? []).map((c) => forestInseeCode(c.insee))
  const epciCodes = (location.epcis ?? []).map((e) => e.code)
  return forestAreaData.filter(data => communeCodes.includes(data.INSEE_COM) || epciCodes.includes(data.CODE_EPCI))
}

// communeData is one entry from the array returned by getForestAreaData
// carbon data is the array returned by getSignificantCarbonData
// composition is a forest subtype
export function getCarbonDataForCommuneAndComposition (
  communeData: Pick<SurfaceForetRow, 'INSEE_COM' | `code_${IgnLocalisationLevel}`>,
  carbonData: IgnRow[],
  forestSubtype: ForestSubtype
): IgnRow {
  const composition = FOREST_COMPOSITION[forestSubtype]
  const compositionCarbonData =
    carbonData.filter((data) => data.composition === composition)

  // there are 4 levels of carbonData precision. carbonData may or may not have data for one of
  // these levels for the commune and composition requested. Start at most precise, trying larger
  // levels if not found.
  for (const level of LOCALISATION_LEVELS) {
    const { localisationCode } = getIgnLocalisation(communeData, level, composition)
    const found = compositionCarbonData.find((data) => data.code_localisation === localisationCode)
    if (found) return found
  }
  // no precise data found, fall back to using data for France.
  const franceCompositionCarbonData =
    compositionCarbonData.find((data) => data.code_localisation === 'France')
  if (franceCompositionCarbonData) {
    return franceCompositionCarbonData
  } else {
    // this is unexpected, fail loudly
    const message =
      `Carbon data could not be retrieved for commune ${communeData.INSEE_COM} and subtype ${forestSubtype}`
    throw new Error(message)
  }
}

export function getForestBiomassCarbonDensities (location: Location, forestSubtype: ForestSubtype, areaDataByCommune?: SurfaceForetRow[]) {
  areaDataByCommune = areaDataByCommune || getForestAreaData(location)
  if (!areaDataByCommune.length) {
    return { live: 0, dead: 0 }
  }
  const significantCarbonData = getSignificantCarbonData()

  let weightedLiveSum = 0
  let weightedDeadSum = 0
  let meanLiveSum = 0
  let meanDeadSum = 0
  let totalArea = 0
  const areaCompositionColumnName = FOREST_AREA_COLUMN[forestSubtype]
  areaDataByCommune.forEach((communeData) => {
    const area = +communeData[areaCompositionColumnName]
    const carbonData = getCarbonDataForCommuneAndComposition(communeData, significantCarbonData, forestSubtype)
    weightedLiveSum += +carbonData['carbone_(tC∙ha-1)'] * area
    weightedDeadSum += +carbonData['bois_mort_carbone_(tC∙ha-1)'] * area
    meanLiveSum += +carbonData['carbone_(tC∙ha-1)']
    meanDeadSum += +carbonData['bois_mort_carbone_(tC∙ha-1)']
    totalArea += area
  })
  // if there is some area, take weighted sum, otherwise take mean to allow for user customisations of areas
  const live = totalArea ? weightedLiveSum / totalArea : meanLiveSum / areaDataByCommune.length
  const dead = totalArea ? weightedDeadSum / totalArea : meanDeadSum / areaDataByCommune.length
  return { live, dead }
}

export function getBiomassCarbonDensity (location: Location, groundType: StocksId): number | undefined {
  if (groundType.startsWith('forêt')) {
    return
  }
  if (groundType === 'haies') {
    return getForestBiomassCarbonDensities(location, 'forêt mixte').live
  }
  if (!location.commune?.region) {
    console.log('No region for commune', location)
    return 0
  }
  const interRegionForCommune = REGION_TO_INTER_REGION[location.commune.region]?.interRegion
  const data = interRegionData.find(data => data.INTER_REG === interRegionForCommune)
  if (!data) {
    console.log('No inter-region found for region of commune', location)
    return 0
  }
  // NB: all stocks are integers, but flux has decimals
  return parseInt(data[groundType] ?? '', 10) || 0
}

// source: CITEPA 2016-2019 in tC
export function getFranceStocksWoodProducts () {
  return {
    bo: 33741446.79,
    bi: 58436577.05
  }
}

// source: CITEPA 2016-2020 in m3
export function getAnnualFranceWoodProductsHarvest () {
  return {
    bo: 19253833.33,
    bi: 10472666.67
  }
}

export type WoodCategory = 'bo' | 'bi'

// for each category (BO, BI), return m3/an harvested
export function getAnnualWoodProductsHarvest (location: Location) {
  const harvestByCategory = {
    bo: 0,
    bi: 0,
    all: 0
  }
  const conversionBFTToVAT: Record<ForestSubtype, number> = {
    'forêt conifere': 1.3,
    'forêt feuillu': 1.44,
    'forêt mixte': 1.37,
    'forêt peupleraie': 1.3
  }
  const areaDataByCommune = getForestAreaData(location)
  const significantCarbonData = getSignificantCarbonData()
  areaDataByCommune.forEach((communeData) => {
    (['forêt conifere', 'forêt feuillu', 'forêt mixte', 'forêt peupleraie'] as const).forEach((forestSubtype) => {
      const areaCompositionColumnName = FOREST_AREA_COLUMN[forestSubtype]
      const area = +communeData[areaCompositionColumnName]
      const carbonData = getCarbonDataForCommuneAndComposition(communeData, significantCarbonData, forestSubtype)
      const bftPerHa = +carbonData['prelevement_volume_(m3∙ha-1∙an-1)']
      const bft = bftPerHa * area
      const vat = bft * conversionBFTToVAT[forestSubtype]
      const total = bft * 0.9 + (vat - bft) * 0.5
      harvestByCategory.bo += total * harvestProportion('bo', communeData)
      harvestByCategory.bi += total * harvestProportion('bi', communeData)
      harvestByCategory.all += total
    })
  })
  return harvestByCategory
}

function harvestProportion (category: WoodCategory, communeData: Pick<SurfaceForetRow, 'code_rad13'>) {
  const region = communeData.code_rad13
  const dataForRegion = regionProportionData.find((data) => data.code_localisation === region)
  if (!dataForRegion) throw new Error(`No wood usage proportion found for region '${region}'`)
  return +dataForRegion[category === 'bo' ? '% BO' : '% BI'] / 100
}

export function getForestLitterCarbonDensity (subtype: string) {
  const subtypes = ['feuillu', 'mixte', 'conifere', 'peupleraie']
  if (subtypes.indexOf(subtype) === -1) {
    throw new Error(`No forest litter carbon density found for forest subtype '${subtype}'`)
  }
  return 9 // TODO: ask follow up on source of this data
}

export interface HedgerowsData {
  length: number
  carbonDensity: number
  byGroundType: Partial<Record<StocksId, number>>
  biomassStock?: number
}

export function getHedgerowsDataForCommunes (location: Location): HedgerowsData[] {
  if (!location.communes) { console.log('getHedgerowsDataForCommunes called wrong', location); return [] }

  const communes = location.communes.map((c) => c.insee)
  const lengthData = hedgerowLengthData.filter((data) => communes.includes(data.INSEE_COM) && data.TOTKM_HAIE)

  const excludeIds = ['produits bois', 'haies']
  // ignore child types as well
  const groundTypes = GroundTypes.filter((gt) => !gt.parentType && !has(excludeIds, gt.stocksId))
  return lengthData.map((data) => {
    // default to the average of all the values (calculated in excel) if department not in file
    const carbonDensity = hedgerowCarbonData.find((cd) => cd.dep === data.INSEE_DEP)?.C_tot_km || 101.347

    const byGroundType: Partial<Record<StocksId, number>> = {}
    groundTypes.forEach((gt) => {
      let length = 0
      gt.clcCodes?.forEach((clcCode) => {
        length += +(data[`CLC_${clcCode}`] ?? 0) || 0
      })
      byGroundType[gt.stocksId] = length
    })
    return {
      length: +data.TOTKM_HAIE,
      carbonDensity: +carbonDensity,
      byGroundType
    }
  })
}
