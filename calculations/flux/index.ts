import {
  getFluxReferenceValues,
  getAnnualSurfaceChange,
  type Flux,
  type FluxOptions,
  type Reservoir
} from '../../data/flux.ts'
import { GroundTypes, groundType, has, type ForestSubtype, type StocksId } from '../constants.ts'
import { getFluxWoodProducts } from './woodProducts.ts'
import { getFluxAgriculturalPractices } from './agriculturalPractices.ts'
import { getBiomassCarbonDensity, getForestBiomassCarbonDensities, getForestAreaData } from '../../data/stocks.ts'
import { average, sumByProperty, weightedAverage } from '../math.ts'
import { FOREST_SUBTYPES } from '../../data/shared.ts'
import type { Commune, Location } from '../../data/types.ts'

export type { FluxOptions }

export interface FluxSummaryEntry {
  totalCarbonSequestration: number
  totalSequestration: number
  areaModified?: boolean
  hasModifications?: boolean
}

export interface AreaChange {
  area: number
  originalArea: number
  areaModified?: boolean
}

export interface BiomassSummary {
  to: ForestSubtype
  area: number
  originalArea?: number
  areaModified?: boolean
  co2e: number
  growth: number
  mortality: number
  timberExtraction: number
  fluxMeterCubed: number
  conversionFactor: number
  annualFlux: number
  annualFluxEquivalent: number
}

interface WoodCategorySummary {
  co2e: number
  localHarvest: number
  franceHarvest: number
  harvestPortion: number
  franceSequestration: number
}

export interface WoodSummary {
  localPopulation: number
  francePopulation: number
  populationPortion: number
  bo: WoodCategorySummary
  bi: WoodCategorySummary
}

export type FluxAreas = Partial<Record<StocksId, Partial<Record<StocksId, AreaChange>>>>
export type FluxSummary = Partial<Record<StocksId, FluxSummaryEntry>>
export type FluxCo2eByGroundType = Partial<Record<StocksId, Partial<Record<StocksId, number>>>>

export interface AnnualFluxes {
  allFlux: Flux[]
  summary: FluxSummary
  biomassSummary: BiomassSummary[]
  areas: FluxAreas
  fluxCo2eByGroundType: FluxCo2eByGroundType
  total: number
  woodSummary: WoodSummary
}

function convertCToCo2e (valueC: number) {
  return valueC * 44 / 12
}

function convertN2oToCo2e (valueC: number) {
  // source pour 273 :
  // https://aldo-documentation.territoiresentransitions.fr/aldo-documentation/introduction/sources#emissions-de-n2o
  return valueC * 273
}

function convertN2O (flux: number) {
  return flux / 15 * 0.01 * 44 / 25 + flux / 15 * 0.3 * 0.0075 * 44 / 28
}

export function getAnnualFluxes (communes: Commune[], options: FluxOptions = {}): AnnualFluxes {
  let fluxes: Flux[] = []

  communes.forEach((commune) => {
    fluxes.push(...getFluxesForCommune({ commune }, options))
  })
  const { areas, changePairs } = areaChangesByGroundType(communes, options)
  Object.values(changePairs).forEach((changePair) => {
    const from = changePair.from
    const to = changePair.to
    fluxes = replaceWithOverride(fluxes, areas, from, to, 'sol')
    fluxes = replaceWithOverride(fluxes, areas, from, to, 'biomasse')
    fluxes = replaceWithOverride(fluxes, areas, from, to, 'litière')
  })

  fluxes = fluxes.filter((f) => !!f.co2e)
  fluxes.push(...getNitrousOxideEmissions(fluxes))
  // TODO: aggregations for display
  //  - produits bois details

  fluxes.push(...getFluxAgriculturalPractices(options.agriculturalPracticesEstablishedAreas))

  const { summary, biomassSummary, fluxCo2eByGroundType, woodSummary, total } = fluxSummary(fluxes, options)

  return {
    allFlux: fluxes,
    summary,
    biomassSummary,
    areas,
    fluxCo2eByGroundType,
    total,
    woodSummary
  }
}

function getFluxesForCommune (location: Location, options: FluxOptions) {
  const locationFluxes = getFluxReferenceValues(location)
  locationFluxes.forEach((flux) => {
    fetchArea(location, options, flux)
    calculateValue(flux)
  })
  locationFluxes.push(...deforestationFlux(location, options))

  locationFluxes.push(...getFluxWoodProducts(location, options.woodCalculation))
  return locationFluxes
}

function fetchArea (location: Location, options: FluxOptions, flux: Flux) {
  if (!flux.area && flux.area !== 0 && flux.from) {
    const area = getAnnualSurfaceChange(location, options, flux.from, flux.to)
    flux.area = area
    flux.originalArea = area
  }
}

function calculateValue (flux: Flux) {
  const area = flux.area ?? 0
  flux.flux = flux.annualFlux ?? 0
  if (flux.yearsForFlux) flux.flux *= flux.yearsForFlux
  flux.value = flux.flux * area
  flux.co2e = convertCToCo2e(flux.value)
}

function replaceWithOverride (fluxes: Flux[], areas: FluxAreas, from: StocksId, to: StocksId, reservoir: Reservoir) {
  const reservoirFluxes = fluxes.filter((f) => f.to === to && f.from === from && f.reservoir === reservoir)
  // fallback to using average in the case where no original area changes are registered for this pair
  const annualFlux = weightedAverage(reservoirFluxes, 'annualFlux', 'area') || average(reservoirFluxes, 'annualFlux')
  const areaChange = areas[from]?.[to]
  const newGroundFlux: Flux = {
    from,
    to,
    reservoir,
    gas: 'C',
    area: areaChange?.area,
    originalArea: areaChange?.originalArea,
    areaModified: true,
    yearsForFlux: reservoirFluxes[0]?.yearsForFlux,
    annualFlux,
    annualFluxEquivalent: convertCToCo2e(annualFlux)
  }
  const newFluxes = fluxes.filter((f) => !(f.to === to && f.from === from && f.reservoir === reservoir))
  calculateValue(newGroundFlux)
  newFluxes.push(newGroundFlux)
  return newFluxes
}

function getNitrousOxideEmissions (allFluxes: Flux[]) {
  // need to do a second pass because N2O calculation requires the sum of ground and litter values
  const n2oEmissions: Flux[] = []
  // assumes that all litter fluxes will be accompanied by a ground flux
  // also assumes that all communes will only have one ground x litter pair
  const groundFluxes = allFluxes.filter(flux => flux.reservoir === 'sol')
  const litterFluxes = allFluxes.filter(flux => flux.reservoir === 'litière')
  groundFluxes.forEach((groundFlux) => {
    const litterFlux = litterFluxes.find(flux => flux.from === groundFlux.from && flux.to === groundFlux.to && flux.commune === groundFlux.commune)
    const groundFluxValue = groundFlux.value || 0
    const litterFluxValue = litterFlux?.value || 0
    if (groundFluxValue + litterFluxValue < 0) {
      // decided to keep this grouping because N2O only tracked if emitted
      const annualN2O = convertN2O(groundFluxValue + litterFluxValue)
      n2oEmissions.push({
        from: groundFlux.from,
        to: groundFlux.to,
        value: annualN2O,
        reservoir: 'sol et litière',
        gas: 'N2O',
        co2e: convertN2oToCo2e(annualN2O)
        // flux and reservoir don't make much sense here
      })
    }
  })
  return n2oEmissions
}

function fluxSummary (allFluxes: Flux[], options: FluxOptions) {
  const summary: FluxSummary = {}
  const fluxCo2eByGroundType: FluxCo2eByGroundType = {}
  const woodSummary: WoodSummary = {
    localPopulation: 0,
    francePopulation: 0,
    populationPortion: 0,
    bo: {
      co2e: 0,
      localHarvest: 0,
      franceHarvest: 0,
      harvestPortion: 0,
      franceSequestration: 0
    },
    bi: {
      co2e: 0,
      localHarvest: 0,
      franceHarvest: 0,
      harvestPortion: 0,
      franceSequestration: 0
    }
  }
  let total = 0
  const addToSummary = (key: StocksId, flux: Flux, co2e: number) => {
    const entry = summary[key] ??= {
      totalCarbonSequestration: 0,
      totalSequestration: 0
    }
    if (flux.gas === 'C') {
      entry.totalCarbonSequestration += flux.value ?? 0
    }
    entry.totalSequestration += co2e
    if (flux.areaModified) {
      entry.areaModified = flux.areaModified
      entry.hasModifications = flux.areaModified
    }
  }
  allFluxes.forEach((flux) => {
    const co2e = flux.co2e
    if (co2e === undefined) {
      console.log('WARNING: flux without a co2e found', flux)
      return
    }
    total += co2e
    const to = flux.to
    addToSummary(to, flux, co2e)
    const parent = groundType(to).parentType
    if (parent) addToSummary(parent, flux, co2e)
    // this won't take into account flux from biomass growth
    const from = flux.from
    if (from && to) {
      const fromEntry = fluxCo2eByGroundType[from] ??= {}
      fromEntry[to] = (fromEntry[to] ?? 0) + co2e
    }
    // wood products - NB handling both calculation methods at once
    // despite the fluxes for the other type being NaN
    if (to === 'produits bois' && flux.category) {
      const category = flux.category
      woodSummary[category].co2e += co2e
      woodSummary[category].localHarvest += flux.localHarvest ?? 0
      woodSummary[category].harvestPortion += flux.localPortion ?? 0
      // France details only need to be set once really
      woodSummary.francePopulation = flux.francePopulation ?? 0
      woodSummary[category].franceSequestration = flux.franceSequestration ?? 0
      woodSummary[category].franceHarvest = flux.franceHarvest ?? 0
      if (category === 'bo') {
        // randomly taking bo category - just want to not double the
        // localPopulation since we have fluxes for 2 categories
        woodSummary.localPopulation += flux.localPopulation ?? 0
        woodSummary.populationPortion += flux.localPortion ?? 0
      }
    }
  })
  const biomassSummary = forestBiomassGrowthSummary(allFluxes, options)
  // update change flag for forests based on if the area used in biomass growth
  // calculations is defined by the user.
  const biomassGrowthAreaModified = biomassSummary.some((subtype) => subtype.areaModified)
  if (summary.forêts) {
    summary.forêts.areaModified = summary.forêts.areaModified || biomassGrowthAreaModified
    summary.forêts.hasModifications = summary.forêts.hasModifications || biomassGrowthAreaModified
  }
  return { summary, biomassSummary, fluxCo2eByGroundType, woodSummary, total }
}

export function forestBiomassGrowthSummary (allFlux: Flux[], options: FluxOptions): BiomassSummary[] {
  // aggregate forest biomass data which is by commune, not EPCI
  const forestBiomassSummaryByType: BiomassSummary[] = []
  for (const subtype of FOREST_SUBTYPES) {
    const subtypeFluxes =
      allFlux.filter((flux) => !flux.from && flux.to === subtype && flux.reservoir === 'biomasse')
    const originalArea = sumByProperty(subtypeFluxes, 'area')
    // the property of interest can have quite different values for different geo locations
    // and the surface area within that location can be quite different
    // so use a weighted sum, not an average, to get closer to a reasonable 'average' value
    const weighted = (property: 'growth' | 'mortality' | 'timberExtraction' | 'fluxMeterCubed' | 'conversionFactor' | 'annualFlux' | 'annualFluxEquivalent') =>
      weightedAverage(subtypeFluxes, property, 'area')
    const summary: BiomassSummary = {
      to: subtype,
      area: originalArea,
      co2e: sumByProperty(subtypeFluxes, 'co2e'),
      growth: weighted('growth'),
      mortality: weighted('mortality'),
      timberExtraction: weighted('timberExtraction'),
      fluxMeterCubed: weighted('fluxMeterCubed'),
      conversionFactor: weighted('conversionFactor'),
      annualFlux: weighted('annualFlux'),
      annualFluxEquivalent: weighted('annualFluxEquivalent')
    }
    forestBiomassSummaryByType.push(summary)
    const areaOverride = options.areas?.[subtype]
    if (areaOverride) {
      summary.originalArea = originalArea
      summary.area = areaOverride
      summary.areaModified = true
      summary.co2e = summary.area * summary.annualFluxEquivalent
    }
  }
  return forestBiomassSummaryByType
}

function areaChangesByGroundType (communes: Commune[], options: FluxOptions) {
  const areas: FluxAreas = {}
  const changePairs: Record<string, { from: StocksId, to: StocksId }> = {}
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes
    .filter((gt) => !gt.children && !has(excludeIds, gt.stocksId))
  communes.forEach((commune) => {
    childGroundTypes.forEach((from) => {
      const fromGt = from.stocksId
      const areasFrom = areas[fromGt] ??= {}
      childGroundTypes.forEach((to) => {
        const toGt = to.stocksId
        if (fromGt === toGt) return

        const change = areasFrom[toGt] ??= { originalArea: 0, area: 0 }

        change.originalArea += getAnnualSurfaceChange({ commune }, options, fromGt, toGt)
        change.area = change.originalArea

        if (options.areaChanges) {
          // sometimes from isn't defined because of the special cases of forest biomass
          const key = `${from.altFluxId || from.fluxId}_${to.altFluxId || to.fluxId}`
          const override = options.areaChanges[key]
          if (override !== undefined && override >= 0) {
            // this area is not summed.
            change.area = override
            change.areaModified = true
            changePairs[key] = { from: fromGt, to: toGt }
          }
        }
      })
    })
  })
  return { areas, changePairs }
}

function deforestationFlux (location: Location, options: FluxOptions) {
  const deforestationFluxes: Flux[] = []
  const forestSubtypes = groundType('forêts').children ?? []
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes
    .filter((gt) => !gt.children && !has(excludeIds, gt.stocksId))
  const areaData = getForestAreaData(location)
  for (const from of forestSubtypes) {
    if (!has(FOREST_SUBTYPES, from)) continue
    const forestBiomassDensities = getForestBiomassCarbonDensities(location, from, areaData)
    const initialBiomassDensity = forestBiomassDensities.live + forestBiomassDensities.dead

    for (const toGt of childGroundTypes) {
      const to = toGt.stocksId
      if (from === to) {
        continue
      } else if (forestSubtypes.includes(to)) {
        // ignore reforestation and changes between forest subtypes since that biomass should
        // be taken into account by the growth of biomass based on area used by stocks
        continue
      }

      const biomassDensity = getBiomassCarbonDensity(location, to)
      if (biomassDensity === undefined) continue
      const annualFlux = biomassDensity - initialBiomassDensity

      const annualFluxEquivalent = convertCToCo2e(annualFlux)
      const area = getAnnualSurfaceChange(location, options, from, to)
      if (annualFlux) {
        const value = annualFlux * area || 0
        deforestationFluxes.push({
          from,
          to,
          area,
          originalArea: area,
          annualFlux,
          annualFluxEquivalent,
          yearsForFlux: 1,
          flux: annualFlux,
          value,
          co2e: convertCToCo2e(value),
          reservoir: 'biomasse',
          gas: 'C'
        })
      }
    }
  }
  return deforestationFluxes
}
