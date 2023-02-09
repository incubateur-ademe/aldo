const { getStocks } = require('./index')
const { getEpci } = require('../epcis')
const { getPopulationTotal } = require('../../data')

jest.mock('../../data/stocks', () => {
  const originalModule = jest.requireActual('../../data/stocks')

  return {
    __esModule: true,
    ...originalModule,
    getArea: jest.fn(() => 50),
    getCarbonDensity: jest.fn(() => 2),
    getBiomassCarbonDensity: jest.fn(() => 3),
    getLiveBiomassCarbonDensity: jest.fn(() => 4),
    getDeadBiomassCarbonDensity: jest.fn(() => 5),
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
  const overrides = {
    areas: { vignes: 70 }
  }
  const epci = getEpci('CC Faucigny-Glières')
  const stocks = getStocks({ epci }, overrides)

  it('has data for all ground types', () => {
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

  describe('for simple ground types', () => {
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

    it('calculates total density by the sum of ground and biomass densities', () => {
      const totalDensity = simpleStock.totalDensity
      expect(totalDensity).toEqual(5)
    })

    it('allows area to be overridden', () => {
      const overriddenStock = stocks.vignes
      expect(overriddenStock.area).toEqual(70)
      expect(overriddenStock.originalArea).toEqual(50)
      expect(overriddenStock.groundStock).toEqual(140)
    })

    it('does not have neither parent nor children', () => {
      expect(simpleStock.children).not.toBeDefined()
      expect(simpleStock.parent).not.toBeDefined()
    })
  })

  describe('for child ground types', () => {
    it('returns parent type for child type', () => {
      expect(stocks['prairies zones arborées'].parent).toBe('prairies')
      expect(stocks['prairies zones arborées'].children).not.toBeDefined()
    })
  })

  describe('for parent ground types', () => {
    it('returns children for parent type', () => {
      expect(stocks.forêts.children.length).toEqual(4)
      expect(stocks.forêts.parent).not.toBeDefined()
    })

    it('has a total stock of a sum of the children stock', () => {
      expect(stocks.prairies.totalStock).toEqual(750)
    })
  })

  describe('for forest subtype', () => {
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
      // since we have mocked biomassDensity to return 4 for all sources,
      // this 1000 'inaccurately' takes simple biomass into account
      expect(forestChild.totalStock).toEqual(1000)
    })
  })

  describe('for wood products', () => {
    // implicit test: the default wood calculation setting is by harvest
    const stocksByHarvest = stocks

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
        const testStocks = getStocks({ epci }, {
          areas: {
            'sols artificiels arborés et buissonants': 20
          }
        })
        expect(testStocks[treeKey].area).toEqual(20)
      })

      it('can be fetched from the data', () => {
        const testStocks = getStocks({ epci })
        expect(testStocks[treeKey].area).toEqual(50)
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
        const testStocks = getStocks({ epci }, { areas })
        // proportion defaults to 0.8, or 80%. 80% of 50 is 40.
        expect(testStocks[impermeableKey].area).toEqual(40)
      })

      it('is the product of the proportion and the total when there are not many trees, and the proportion can be customised', () => {
        const areas = {}
        areas[treeKey] = 0
        const testStocks = getStocks({ epci }, { areas, proportionSolsImpermeables: 0.5 })
        expect(testStocks[impermeableKey].area).toEqual(25)
      })

      it('is the area without trees minus the area with trees if there are >= 0.2 * area trees', () => {
        const areas = {}
        areas[treeKey] = 40
        const testStocks = getStocks({ epci }, { areas })
        expect(testStocks[impermeableKey].area).toEqual(10)
      })
    })

    describe('the shrubby area', () => {
      it('can be set by the user', () => {
        const testStocks = getStocks({ epci }, {
          areas: {
            'sols artificiels arbustifs': 20
          }
        })
        expect(testStocks[shrubbyKey].area).toEqual(20)
      })

      // TODO: question the logic of this
      it('is the green portion of the total area minus the area with trees if there are not many trees', () => {
        const areas = {}
        areas[treeKey] = 5
        const testStocks = getStocks({ epci }, { areas })
        // areaWithoutTrees = 50 (from mocked getArea fn)
        // areaWithTrees = 5
        // 5 < 0.2 * (areaWithoutTrees + areaWithTrees)
        // 5 < 0.2 * 55 === TRUE
        // areaImpermeable = 0.8 * 55 = 44
        // threshold for condition : areaWithTrees < 0.2 * (areaImpermeable + areaWithTrees)
        // 5 < 0.2 * 49 === TRUE
        // 0.2 (default green portion) * (areaWithoutTrees + areaWithTrees) - areaWithTrees
        // 0.2 * 55 - 5
        expect(testStocks[shrubbyKey].area).toBeCloseTo(6, 0)
        // TODO: fix resolve floating point inaccuracy to be able to use the below
        // expect(testStocks[shrubbyKey].area).toEqual(6)
      })

      // TODO: green portion is customised relative to impermeable portion set by user

      it('is zero if there are proportionally a lot of trees', () => {
        const areas = {}
        areas[treeKey] = 40
        const testStocks = getStocks({ epci }, { areas })
        expect(testStocks[shrubbyKey].area).toEqual(0)
      })
    })
    // TODO: test to override to override proportionSolsImpermeables (NB the hardcoded 0.2 in the code which is a bug)
  })
})

// TODO: test display aggregations
