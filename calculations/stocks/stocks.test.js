const { getStocks } = require('./index')
const { getEpci } = require('../locations')
const { getPopulationTotal } = require('../../data')

jest.mock('../../data/stocks', () => {
  const originalModule = jest.requireActual('../../data/stocks')

  return {
    __esModule: true,
    ...originalModule,
    getArea: jest.fn((location) => {
      if (location.epci?.code === '200042992') return 100
      return 50
    }),
    getCarbonDensity: jest.fn((location) => {
      if (location.epci?.code === '200042992') return 5
      return 2
    }),
    getBiomassCarbonDensity: jest.fn((location, keyword) => {
      // TODO: maybe refactor getStocksByKeyword to only fetch biomass for non-forest
      if (!keyword.startsWith('forêt ')) {
        return 3
      }
    }),
    getForestBiomassCarbonDensities: jest.fn(() => ({ live: 4, dead: 5 })),
    getForestLitterCarbonDensity: jest.fn(() => 6),
    getAnnualWoodProductsHarvest: jest.fn(() => {
      return {
        bo: 1,
        bi: 5,
        all: 3
      }
    }),
    getAnnualFranceWoodProductsHarvest: jest.fn(() => {
      return {
        bo: 10,
        bi: 10
      }
    }),
    getFranceStocksWoodProducts: jest.fn(() => {
      return {
        bo: 500,
        bi: 200
      }
    })
  }
})

describe('The stocks calculation module', () => {
  const epci = getEpci('CC Faucigny-Glières')
  it('has data for all ground types', () => {
    const stocks = getStocks({ epci })
    expect(stocks.cultures).toBeDefined()
    expect(stocks.prairies).toBeDefined()
    expect(stocks['prairies zones arborées']).toBeDefined()
    expect(stocks['prairies zones herbacées']).toBeDefined()
    expect(stocks['prairies zones arbustives']).toBeDefined()
    expect(stocks['zones humides']).toBeDefined()
    expect(stocks.vergers).toBeDefined()
    expect(stocks.vignes).toBeDefined()
    expect(stocks['sols artificiels']).toBeDefined()
    expect(stocks['sols artificiels arbustifs']).toBeDefined()
    expect(stocks['sols artificiels imperméabilisés']).toBeDefined()
    expect(stocks['sols artificiels arborés et buissonants']).toBeDefined()
    expect(stocks.forêts).toBeDefined()
    expect(stocks['forêt mixte']).toBeDefined()
    expect(stocks['forêt feuillu']).toBeDefined()
    expect(stocks['forêt conifere']).toBeDefined()
    expect(stocks['forêt peupleraie']).toBeDefined()
    expect(stocks['produits bois']).toBeDefined()
    expect(stocks.haies).toBeDefined()
  })

  describe('for simple ground types and a single EPCI', () => {
    const overrides = {
      areas: { vignes: 70 }
    }
    const stocks = getStocks({ epci }, overrides)
    const simpleStock = stocks.cultures // has neither parent nor children

    it('calculates ground stock by multiplying density by area', () => {
      const groundStock = simpleStock.groundStock
      expect(groundStock).toEqual(100)
    })

    it('calculates biomass stock by multiplying density by area', () => {
      const biomassStock = simpleStock.biomassStock
      expect(biomassStock).toEqual(150)
    })

    // TODO: why have both totalStock and totalReservoirStock?
    it('calculates total stock by the sum of ground and biomass stock', () => {
      const totalStock = simpleStock.totalStock
      expect(totalStock).toEqual(250)
      const totalReservoirStock = simpleStock.totalReservoirStock
      expect(totalReservoirStock).toEqual(250)
    })

    it('accepts multiple locations', () => {
      const stocks = getStocks({ epcis: [epci, getEpci('200042992', true)] })
      expect(stocks.cultures.area).toEqual(150)
      expect(stocks.cultures.groundDensity).toEqual(4)
    })

    it('calculates total density by the sum of ground and biomass densities', () => {
      const totalDensity = simpleStock.totalDensity
      expect(totalDensity).toEqual(5)
    })

    it('allows area to be overridden', () => {
      const overriddenStock = stocks.vignes
      expect(overriddenStock.area).toEqual(70)
      expect(overriddenStock.originalArea).toEqual(50)
      expect(overriddenStock.groundStock).toEqual(140)
      expect(overriddenStock.hasModifications).toBe(true)
    })

    it('indicates that an area has not been modified', () => {
      const nonOverridenStock = stocks.cultures
      expect(nonOverridenStock.hasModifications).toBeFalsy()
    })

    it('does not have neither parent nor children', () => {
      expect(simpleStock.children).not.toBeDefined()
      expect(simpleStock.parent).not.toBeDefined()
    })
  })

  describe('for child ground types', () => {
    it('returns parent type for child type', () => {
      const stocks = getStocks({ epci })
      expect(stocks['prairies zones arborées'].parent).toBe('prairies')
      expect(stocks['prairies zones arborées'].children).not.toBeDefined()
    })
  })

  describe('for parent ground types', () => {
    const stocks = getStocks({ epci })

    it('returns children for parent type', () => {
      expect(stocks.forêts.children.length).toEqual(4)
      expect(stocks.forêts.parent).not.toBeDefined()
    })

    it('has a total stock of a sum of the children stock', () => {
      expect(stocks.prairies.totalStock).toEqual(750)
    })

    it('has a biomass stock of the sum of the biomass stock of children', () => {
      // 3 * 50 * 3
      expect(stocks.prairies.biomassStock).toEqual(450)
    })

    it('has sum of live and dead biomass stocks of children if forest', () => {
      // 4 * 50 * 4
      expect(stocks.forêts.liveBiomassStock).toEqual(800)
      // 4 * 50 * 5
      expect(stocks.forêts.deadBiomassStock).toEqual(1000)
    })
  })

  describe('for forest subtype', () => {
    const stocks = getStocks({ epci })
    const forestChild = stocks['forêt mixte']

    it('has live biomass stock', () => {
      expect(forestChild.liveBiomassDensity).toEqual(4)
      expect(forestChild.liveBiomassStock).toEqual(200)
    })

    it('has dead biomass stock', () => {
      expect(forestChild.deadBiomassDensity).toEqual(5)
      expect(forestChild.deadBiomassStock).toEqual(250)
    })

    it('has forest litter stock', () => {
      expect(forestChild.forestLitterDensity).toEqual(6)
      expect(forestChild.forestLitterStock).toEqual(300)
    })

    it('calculates the total stock with the extra reservoirs', () => {
      // ground + live and dead biomass + litter
      // 50 * 2 + 50 * (4 + 5) + 50 * 6
      expect(forestChild.totalStock).toEqual(850)
    })
  })

  describe('for wood products', () => {
    // implicit test: the default wood calculation setting is by harvest
    const stocksByHarvest = getStocks({ epci })

    it('for harvest, calculates stock by multiplying France stocks with the proportion of all m^3 of wood harvested locally', () => {
      expect(stocksByHarvest['produits bois'].boStock).toEqual(50)
      expect(stocksByHarvest['produits bois'].biStock).toEqual(100)
    })

    const stocksByConsumption = getStocks({ epci }, { woodCalculation: 'consommation' })

    it('for consumption, calculates stock by multipling France stocks with the proportion of local population', () => {
      // TODO: mock getPopulationTotal and epci.populationTotale and remove logic for a better test
      const populationShare = epci.populationTotale / getPopulationTotal()
      expect(stocksByConsumption['produits bois'].boStock).toEqual(500 * populationShare)
      expect(stocksByConsumption['produits bois'].biStock).toEqual(200 * populationShare)
    })
  })

  describe('for artificial ground types', () => {
    const impermeableKey = 'sols artificiels imperméabilisés'
    const shrubbyKey = 'sols artificiels arbustifs'
    const treeKey = 'sols artificiels arborés et buissonants'

    describe('the tree area', () => {
      it('can be set by the user', () => {
        const stocks = getStocks({ epci }, {
          areas: {
            'sols artificiels arborés et buissonants': 20
          }
        })
        expect(stocks[treeKey].area).toEqual(20)
      })

      it('can be fetched from the data', () => {
        const stocks = getStocks({ epci })
        expect(stocks[treeKey].area).toEqual(50)
      })
    })

    // NB: the 'proportion' in these tests refers to the hypothesis of the proportion of artificial ground
    //  which is impermeable. The value can be 0 - 1 inclusive.
    describe('the impermeable area', () => {
      it('can be set by the user', () => {
        const fixedImpermeableStocks = getStocks({ epci }, {
          areas: {
            'sols artificiels imperméabilisés': 20
          }
        })
        expect(fixedImpermeableStocks[impermeableKey].area).toEqual(20)
      })

      it('is the product of the proportion and the total when there are not many trees', () => {
        const areas = {}
        areas[treeKey] = 0
        const stocks = getStocks({ epci }, { areas })
        // proportion defaults to 0.8, or 80%. 80% of 50 is 40.
        expect(stocks[impermeableKey].area).toEqual(40)
      })

      it('is the product of the proportion and the total when there are not many trees, and the proportion can be customised', () => {
        const areas = {}
        areas[treeKey] = 0
        const stocks = getStocks({ epci }, { areas, proportionSolsImpermeables: 0.5 })
        expect(stocks[impermeableKey].area).toEqual(25)
      })

      it('is the area without trees minus the area with trees if there are >= 0.2 * area trees', () => {
        // with the trees area mocked at 50 we trigger this condition
        const stocks = getStocks({ epci })
        expect(stocks[impermeableKey].area).toEqual(0)
      })
    })

    describe('the shrubby area', () => {
      it('can be set by the user', () => {
        const stocks = getStocks({ epci }, {
          areas: {
            'sols artificiels arbustifs': 20
          }
        })
        expect(stocks[shrubbyKey].area).toEqual(20)
      })

      // TODO: question the logic of this
      it('is the green portion of the total area minus the area with trees if there are not many trees', () => {
        const areas = {}
        areas[treeKey] = 5
        const stocks = getStocks({ epci }, { areas })
        // areaWithoutTrees = 50 (from mocked getArea fn)
        // areaWithTrees = 5
        // 5 < 0.2 * (areaWithoutTrees + areaWithTrees)
        // 5 < 0.2 * 55 === TRUE
        // areaImpermeable = 0.8 * 55 = 44
        // threshold for condition : areaWithTrees < 0.2 * (areaImpermeable + areaWithTrees)
        // 5 < 0.2 * 49 === TRUE
        // 0.2 (default green portion) * (areaWithoutTrees + areaWithTrees) - areaWithTrees
        // 0.2 * 55 - 5
        expect(stocks[shrubbyKey].area).toBeCloseTo(6, 0)
        // TODO: fix resolve floating point inaccuracy to be able to use the below
        // expect(stocks[shrubbyKey].area).toEqual(6)
      })

      // TODO: green portion is customised relative to impermeable portion set by user

      it('is zero if there are proportionally a lot of trees', () => {
        // with the trees area mocked at 50 we trigger this condition
        const stocks = getStocks({ epci })
        expect(stocks[shrubbyKey].area).toEqual(0)
      })
    })
    // TODO: test to override to override proportionSolsImpermeables (NB the hardcoded 0.2 in the code which is a bug)
  })

  describe('data aggregations', () => {
    it('returns sum of stocks', () => {
      const stocks = getStocks({ epci })
      expect(stocks.total).toBeDefined()
      // smoke test - 50 * 16 (ground type count) * 2
      // not hardcoding the calculation because have previously tested all the stock calculations
      // and the value will change if those calculations end up changing.
      expect(stocks.total).toBeGreaterThan(1600)
    })

    it('for each parent type, calculates the proportion of the stock for that type against the total', () => {
      // TODO: could improve these tests with expected values
      const stocks = getStocks({ epci })
      expect(stocks.cultures.stockPercentage).toBeDefined()
      expect(stocks.cultures.groundAndLitterStockPercentage).toBeDefined()
      expect(stocks.cultures.biomassStockPercentage).toBeDefined()
    })

    it('provides the total carbon densities for all sources', () => {
      const stocks = getStocks({ epci })
      expect(stocks.byDensity.cultures).toBe(5)
      expect(stocks.byDensity['forêt mixte']).toBe(17)
    })

    describe('percentage of stock per reservoir', () => {
      const stocks = getStocks({ epci })
      const percentageByReservoir = stocks.percentageByReservoir

      it('contains all reservoir types', () => {
        expect(percentageByReservoir['Sol (30 cm)']).toBeDefined()
        expect(percentageByReservoir['Biomasse sur pied']).toBeDefined()
        expect(percentageByReservoir['Litière']).toBeDefined()
        expect(percentageByReservoir['Matériaux bois']).toBeDefined()
      })

      it('includes live and dead biomass in biomass calculation', () => {
        // there are:
        // 16 stock sources (inc haies, prod bois; not inc parent types)
        // 7 of which use straightforward area * density calculations

        // mocking means that:
        // biomass stock per ground subtype = 50 * 3
        // live biomass stock per ground subtype = 50 * 4
        // dead biomass stock per ground subtype = 50 * 5

        // 8 * 50 * 3 = 1200 stock for 7 standard sources + haies
        // 50 * 4 * (4 + 5) = 200 * 9 = 1800 for forest live and dead inc
        // 50 * 3 = 150 for the only sols art that has area with the mocked data
        // 0 for prod bois
        const expectedBiomassStockTotal = 3150
        const total = stocks.total
        const expectedPercentage = expectedBiomassStockTotal / total * 100
        expect(percentageByReservoir['Biomasse sur pied']).toBeCloseTo(expectedPercentage, 1)
      })
    })
  })

  // getStocks for a commune
  // getStocks for multiple epcis and communes
  describe('for a custom grouping of territories', () => {
    // 2 epcis, 2 communes (one of which is part of one of the epcis so shouldn't count)

    it('calculates total stock as a sum of the stocks of the requested territories', () => {

    })

    // it calculates the carbon density as a weighted average of the requested territories

    // it allows area overrides, calculating stock as original weighted density * area given
  })
})
