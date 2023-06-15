const { getAnnualFluxes } = require('./index')
const { getEpci } = require('../locations')
// const { getPopulationTotal } = require('../../data')

jest.mock('../../data/flux', () => {
  const originalModule = jest.requireActual('../../data/flux')

  return {
    __esModule: true,
    ...originalModule,
    getAnnualSurfaceChange: jest.fn((location, options, from, to) => {
      const areaChanges = {
        cultures: {
          vignes: 3,
          vergers: 4,
          'forêt mixte': 5,
          'forêt conifere': 5
        },
        'forêt mixte': {
          vignes: 10
        },
        'forêt feuillu': {
          'forêt conifere': 3
        }
      }[from]
      return areaChanges ? areaChanges[to] : 0
    }),
    // this is called once per commune
    getFluxReferenceValues: jest.fn(() => {
      return [
        {
          from: 'cultures',
          to: 'vignes',
          annualFlux: -2,
          annualFluxEquivalent: -10,
          yearsForFlux: 20,
          reservoir: 'sol',
          gas: 'C'
        },
        {
          from: 'cultures',
          to: 'vergers',
          annualFlux: 30,
          annualFluxEquivalent: 100,
          yearsForFlux: 1,
          reservoir: 'biomasse',
          gas: 'C'
        },
        {
          from: 'cultures',
          to: 'forêt mixte',
          annualFlux: 3,
          annualFluxEquivalent: 15,
          yearsForFlux: 20,
          reservoir: 'sol',
          gas: 'C'
        },
        // per-commune forest biomass entries: not associated with area changes (hence no from)
        // instead, in real usage the entries correspond to today's area for that type
        {
          to: 'forêt mixte',
          reservoir: 'biomasse',
          area: 1,
          annualFlux: 4,
          annualFluxEquivalent: 12,
          growth: 1,
          mortality: 1,
          timberExtraction: 1,
          fluxMeterCubed: 1,
          conversionFactor: 1
        },
        {
          to: 'forêt mixte',
          reservoir: 'biomasse',
          area: 2,
          annualFlux: 1,
          annualFluxEquivalent: 3,
          growth: 0.1,
          mortality: 0.1,
          timberExtraction: 0.1,
          fluxMeterCubed: 0.1,
          conversionFactor: 0.1
        },
        // add this entry (per-commune today's area) to check filtering on biomass summary
        {
          to: 'forêt feuillu',
          reservoir: 'biomasse',
          area: 20,
          annualFlux: 100,
          annualFluxEquivalent: 300,
          growth: 20,
          mortality: 20,
          timberExtraction: 20,
          fluxMeterCubed: 20,
          conversionFactor: 20
        },
        // change between forest types (eventually this will be handled, for now at least elegantly ignored)
        {
          from: 'forêt feuillu',
          to: 'forêt conifere',
          annualFlux: 2,
          annualFluxEquivalent: 6,
          yearsForFlux: 20,
          reservoir: 'sol',
          gas: 'C'
        }
      ]
    }),
    getFranceFluxWoodProducts: jest.fn(() => ({
      bo: 1000,
      bi: 2000
    }))
  }
})

const ORIGINAL_FLUX_COUNT = 7

jest.mock('../../data/stocks', () => {
  const originalModule = jest.requireActual('../../data/stocks')

  return {
    __esModule: true,
    ...originalModule,
    getAnnualWoodProductsHarvest: jest.fn(() => ({
      bo: 10,
      bi: 200
    })),
    getAnnualFranceWoodProductsHarvest: jest.fn(() => ({
      bo: 100,
      bi: 1000
    })),
    getBiomassCarbonDensity: jest.fn((location, keyword) => {
      if (!keyword.startsWith('forêt ')) {
        return 4
      }
    }),
    getForestBiomassCarbonDensities: jest.fn((location, type) => {
      return {
        live: type === 'forêt conifere' ? 13 : 3,
        dead: 7
      }
    })
  }
})

describe('The flux calculation module', () => {
  const epci = getEpci('CC Faucigny-Glières')

  describe('flux entry', () => {
    it('has area, value, and co2e added', () => {
      const fluxes = getAnnualFluxes({ epci })
      const flux = fluxes.allFlux[0]
      expect(flux.area).toEqual(3)
      expect(flux.areaModified).toBeUndefined()
      expect(flux.originalArea).toEqual(3)
      expect(flux.flux).toEqual(-40)
      expect(flux.value).toEqual(-120)
      expect(flux.co2e).toEqual(-440)
    })
  })

  it('adds N2O entries for emissions', () => {
    // not strictly testing functionality, this is a sanity check for later use of variable
    const communeCount = 7
    expect(epci.communes.length).toBe(communeCount)

    // the actual test
    const fluxes = getAnnualFluxes({ epci })
    const n20Fluxes = fluxes.allFlux.filter((f) => f.reservoir === 'sol et litière')
    expect(n20Fluxes.length).toBe(communeCount) // only emission is from cultures -> vignes
    const flux = n20Fluxes[0]
    expect(flux.gas).toEqual('N2O')
    expect(flux.reservoir).toEqual('sol et litière')
    // value calculated from original spreadsheet
    expect(flux.value).toBeCloseTo(-0.17, 2)
  })
  // TODO: why are there so many N20 entries for -> sols art 200070720

  it('does not add N2O entries for sequestrations', () => {
    const fluxes = getAnnualFluxes({ epci })
    const flux = fluxes.allFlux[ORIGINAL_FLUX_COUNT + 1]
    expect(flux.gas).not.toEqual('N2O')
  })

  it('adds sequestrations from wood products by harvest', () => {
    const fluxes = getAnnualFluxes({ epci })
    const boFlux = fluxes.allFlux[ORIGINAL_FLUX_COUNT + 1]
    expect(boFlux.to).toEqual('produits bois')
    expect(boFlux.from).toEqual(undefined)
    expect(boFlux.category).toEqual('bo')
    expect(boFlux).toHaveProperty('localHarvest')
    expect(boFlux).toHaveProperty('franceHarvest')
    expect(boFlux).toHaveProperty('localPortion')
    expect(boFlux).toHaveProperty('franceSequestration')
    expect(boFlux.value).toEqual(100)
    expect(boFlux.co2e).toEqual(100)
    const biFlux = fluxes.allFlux[ORIGINAL_FLUX_COUNT + 2]
    expect(biFlux.to).toEqual('produits bois')
    expect(biFlux.from).toEqual(undefined)
    expect(biFlux.category).toEqual('bi')
    expect(biFlux.value).toEqual(400)
    expect(biFlux.co2e).toEqual(400)
  })

  it('adds sequestrations from wood products by consumption', () => {
    const fluxes = getAnnualFluxes({ epci }, { woodCalculation: 'consommation' })
    const boFlux = fluxes.allFlux[ORIGINAL_FLUX_COUNT + 1]
    expect(boFlux.to).toEqual('produits bois')
    expect(boFlux.from).toEqual(undefined)
    expect(boFlux.category).toEqual('bo')
    expect(boFlux).toHaveProperty('localPopulation')
    expect(boFlux).toHaveProperty('francePopulation')
    expect(boFlux).toHaveProperty('localPortion')
    expect(boFlux).toHaveProperty('franceSequestration')
    const biFlux = fluxes.allFlux[ORIGINAL_FLUX_COUNT + 2]
    expect(biFlux.to).toEqual('produits bois')
    expect(biFlux.from).toEqual(undefined)
    expect(biFlux.category).toEqual('bi')
  })

  it('has a total of co2e', () => {
    const fluxes = getAnnualFluxes({ epci })
    expect(fluxes).toHaveProperty('total')
    expect(fluxes.total).toBeGreaterThan(60)
  })

  // TODO: test totalSequestration in the summary for prairies, sols art, forêts
  it('has a summary with totals by ground type, including parent types', () => {
    const fluxes = getAnnualFluxes({ epci })
    expect(fluxes.summary.vignes).toBeDefined()
    expect(fluxes.summary.forêts).toBeDefined()
  })

  it('contains flux entries per forest subtype', () => {
    const fluxes = getAnnualFluxes({ epci })
    const conifer = fluxes.allFlux.find((f) => f.to === 'forêt conifere')
    expect(conifer.value).toBe(120)
  })

  describe('the forest biomass summary', () => {
    it('contains an entry for each forest subtype', () => {
      const fluxes = getAnnualFluxes({ epci })
      expect(fluxes.biomassSummary.length).toBe(4)
      expect(fluxes.biomassSummary[0].to).toBe('forêt mixte')
    })

    it('provides the area as a sum of the areas of the same type', () => {
      const fluxes = getAnnualFluxes({ epci })
      const mixed = fluxes.biomassSummary[0]
      // there are 7 communes, each with area of 3
      expect(mixed.area).toBe(21)
      expect(mixed.co2e).toBeDefined()
    })

    it('returns the average weighted against the area for annualFlux per type', () => {
      const fluxes = getAnnualFluxes({ epci })
      const mixed = fluxes.biomassSummary[0]
      // (4 * 1 + 1 * 2)/3 = 6/3
      expect(mixed.annualFlux).toBe(2)
      // the following should also be weighted averages, smoke test to check they exist
      expect(mixed.growth).toBeDefined()
      expect(mixed.mortality).toBeDefined()
      expect(mixed.timberExtraction).toBeDefined()
      expect(mixed.fluxMeterCubed).toBeDefined()
      expect(mixed.conversionFactor).toBeDefined()
      expect(mixed.annualFluxEquivalent).toBeDefined()
    })

    // TODO: if area is overridden for subtype, add areaModified and co2e of area * original weighted flux equiv.
  })

  // TODO: test that forest total includes this biomass growth in summary total

  // TODO: area changes can be overridden

  // TODO: can provide areas for agricultural practices
  // test per practice?

  describe('the biomass fluxes linked to deforestation', () => {
    const epci = { code: '243000643', communes: ['01234', '01235', '01236'] }
    it('adds for changes to non-forest types, using the stock biomass densities for both ground types', () => {
      const fluxes = getAnnualFluxes({ epci })
      const flux = fluxes.allFlux.find((f) => f.from === 'forêt mixte' && f.to === 'vignes' && f.reservoir === 'biomasse')
      expect(flux.annualFlux).toEqual(-6)
      expect(flux.annualFluxEquivalent).toBeDefined()
      expect(flux.area).toEqual(10)
      expect(flux.value).toEqual(-60)
      expect(flux.co2e).toBeDefined()
    })

    it('ignore biomass changes where final ground type is a forest type since these are accounted for by the biomass growth calculations', () => {
      const fluxes = getAnnualFluxes({ epci })
      const toConifer = fluxes.allFlux.find((f) => f.from === 'cultures' && f.to === 'forêt conifere' && f.reservoir === 'biomasse')
      expect(toConifer).not.toBeDefined()
      const betweenForests = fluxes.allFlux.find((f) => f.from === 'forêt feuillu' && f.to === 'forêt conifere' && f.reservoir === 'biomasse')
      expect(betweenForests).not.toBeDefined()
    })

    it('allows change from forest type to be overridden', () => {
      const originalFluxes = getAnnualFluxes({ epci })
      expect(epci.communes.length).toBe(3)
      const forVignFluxes = originalFluxes.allFlux.filter((f) => f.from === 'forêt mixte' && f.to === 'vignes' && f.reservoir === 'biomasse')
      expect(forVignFluxes.length).toBe(3)
      const fluxes = getAnnualFluxes({ epci }, { areaChanges: { for_mix_vign: 20 } })
      const toVineyard = fluxes.allFlux.find((f) => f.from === 'forêt mixte' && f.to === 'vignes' && f.reservoir === 'biomasse')
      expect(toVineyard.area).toBe(20)
      expect(toVineyard.originalArea).toBe(30) // this is 30 whereas previous test is 10 because this is the sum of all commune changes
      expect(toVineyard.areaModified).toBe(true)
    })
  })
  // TODO: should be able to override area from a prairie subtype to another

  it('aggregates the area changes per-commune into a hash table to provide a total area change per ground type pair for the grouping', () => {
    const communes = [{ insee: '01234' }, { insee: '01235' }]
    const fluxes = getAnnualFluxes({ communes }, { areaChanges: { cult_verg: 10 } })
    const fluxAreaSummary = fluxes.areas
    expect(fluxAreaSummary).toBeDefined()
    expect(fluxAreaSummary.cultures.vignes.area).toBe(6)
    expect(fluxAreaSummary.cultures.vignes.originalArea).toBe(6)
    expect(fluxAreaSummary.cultures.vignes.areaModified).toBe(undefined)
    expect(fluxAreaSummary.cultures.vergers.area).toBe(10)
    expect(fluxAreaSummary.cultures.vergers.originalArea).toBe(8)
    expect(fluxAreaSummary.cultures.vergers.areaModified).toBe(true)
  })

  it('allows area overrides, updating the sequestration with the original weighted average for flux multiplied by new area', () => {
    const communes = [{ insee: '01234' }, { insee: '01235' }]

    const fluxes = getAnnualFluxes({ communes }, {})
    const cultVignFluxes = fluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'sol')
    expect(cultVignFluxes.length).toBe(2)

    const modifiedFluxes = getAnnualFluxes({ communes }, { areaChanges: { cult_vign: 10 } })
    const modifiedCultVignFluxes = modifiedFluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'sol')
    expect(modifiedCultVignFluxes.length).toBe(1)
    const flux = modifiedCultVignFluxes[0]
    expect(flux.value).toBe(-400)
    // TODO: test the weighted averaging for flux.flux

    // TODO: test impact on related flux:
    // - biomasse
    // - N20
    // - forest litter
  })
})
