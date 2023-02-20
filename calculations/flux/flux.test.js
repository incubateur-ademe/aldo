const { getAnnualFluxes } = require('./index')
const { getEpci } = require('../epcis')
// const { getPopulationTotal } = require('../../data')

jest.mock('../../data/flux', () => {
  const originalModule = jest.requireActual('../../data/flux')

  return {
    __esModule: true,
    ...originalModule,
    getAnnualSurfaceChange: jest.fn((location, options, from, to) => {
      return {
        cultures: {
          vignes: 3,
          vergers: 4,
          'forêt mixte': 5
        }
      }[from][to]
    }),
    getAllAnnualFluxes: jest.fn(() => {
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
        }
      ]
    }),
    getFranceFluxWoodProducts: jest.fn(() => ({
      bo: 1000,
      bi: 2000
    }))
    // getBiomassCarbonDensity: jest.fn((location, keyword) => {
    //   // TODO: maybe refactor getStocksByKeyword to only fetch biomss for non-forest
    //   if (!keyword.startsWith('forêt ')) {
    //     return 3
    //   }
    // }),
  }
})

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
    }))
  }
})

describe('The flux calculation module', () => {
  const epci = getEpci('CC Faucigny-Glières')

  describe('flux entry', () => {
    it('has area, value, and co2e added', () => {
      const fluxes = getAnnualFluxes({ epci })
      const flux = fluxes.allFlux[0]
      expect(flux.area).toEqual(3)
      expect(flux.areaModified).toBe(false)
      expect(flux.originalArea).toEqual(3)
      expect(flux.flux).toEqual(-40)
      expect(flux.value).toEqual(-120)
      expect(flux.co2e).toEqual(-440)
    })
  })

  it('adds N2O entries for emissions', () => {
    const fluxes = getAnnualFluxes({ epci })
    const flux = fluxes.allFlux[3]
    expect(flux.gas).toEqual('N2O')
    expect(flux.reservoir).toEqual('sol et litière')
    // value calculated from original spreadsheet
    expect(flux.value).toBeCloseTo(-0.17, 2)
  })

  it('does not add N2O entries for sequestrations', () => {
    const fluxes = getAnnualFluxes({ epci })
    const flux = fluxes.allFlux[4]
    expect(flux.gas).not.toEqual('N2O')
  })

  it('adds sequestrations from wood products by harvest', () => {
    const fluxes = getAnnualFluxes({ epci })
    const boFlux = fluxes.allFlux[4]
    expect(boFlux.to).toEqual('produits bois')
    expect(boFlux.from).toEqual(undefined)
    expect(boFlux.category).toEqual('bo')
    expect(boFlux).toHaveProperty('localHarvest')
    expect(boFlux).toHaveProperty('franceHarvest')
    expect(boFlux).toHaveProperty('localPortion')
    expect(boFlux).toHaveProperty('franceSequestration')
    expect(boFlux.value).toEqual(100)
    expect(boFlux.co2e).toEqual(100)
    const biFlux = fluxes.allFlux[5]
    expect(biFlux.to).toEqual('produits bois')
    expect(biFlux.from).toEqual(undefined)
    expect(biFlux.category).toEqual('bi')
    expect(biFlux.value).toEqual(400)
    expect(biFlux.co2e).toEqual(400)
  })

  it('adds sequestrations from wood products by consumption', () => {
    const fluxes = getAnnualFluxes({ epci }, { woodCalculation: 'consommation' })
    const boFlux = fluxes.allFlux[4]
    expect(boFlux.to).toEqual('produits bois')
    expect(boFlux.from).toEqual(undefined)
    expect(boFlux.category).toEqual('bo')
    expect(boFlux).toHaveProperty('localPopulation')
    expect(boFlux).toHaveProperty('francePopulation')
    expect(boFlux).toHaveProperty('localPortion')
    expect(boFlux).toHaveProperty('franceSequestration')
    const biFlux = fluxes.allFlux[5]
    expect(biFlux.to).toEqual('produits bois')
    expect(biFlux.from).toEqual(undefined)
    expect(biFlux.category).toEqual('bi')
  })

  it('has a total of co2e', () => {
    const fluxes = getAnnualFluxes({ epci })
    expect(fluxes).toHaveProperty('total')
    expect(fluxes.total).toBeGreaterThan(60)
  })

  it('has a summary with totals by ground type, including parent types', () => {
    const fluxes = getAnnualFluxes({ epci }, { areaChanges: {} })
    expect(fluxes.summary.vignes).toBeDefined()
    expect(fluxes.summary.forêts).toBeDefined()
  })

  it('has a forest biomass summary', () => {
    const fluxes = getAnnualFluxes({ epci })
    expect(fluxes.biomassSummary).toBeDefined()
  })

  // biomass summary:

  // an array of 4 entries, one for each subtype
  // each entry:
  // has a area which is the sum of the area of the entries for that type
  // has a co2e which is the sum of the co2e of the entries for that type
  // has an annualFluxEquivalent which is a weighted average over the area for that type
  // if area is overridden for subtype, add areaModified and co2e of area * original weighted flux equiv.
})
