const { getStocks } = require('./index')
const { getPopulationTotal } = require('../../data')

jest.mock('../../data/communes', () => {
  return {
    getCommunes: jest.fn((location) => {
      if (location.epcis) return [{ insee: '01234' }, { insee: '01235' }, { insee: '11234' }]
      if (location.commune) return [location.commune]
      return location.communes || [{ insee: '01234' }, { insee: '01235' }]
    })
  }
})

jest.mock('../../data/stocks', () => {
  const originalModule = jest.requireActual('../../data/stocks')

  return {
    __esModule: true,
    ...originalModule,
    getArea: jest.fn((location, groundType) => {
      if (location.commune.insee === 'no trees' && groundType === 'sols artificiels arborés et buissonants') return 0
      if (location.commune.insee === 'few trees' && groundType === 'sols artificiels arborés et buissonants') return 5
      return 25
    }),
    getCarbonDensity: jest.fn((commune, groundType) => {
      if (commune.insee?.startsWith('0')) {
        return {
          zpc: '1_1',
          cultures: 2,
          prairies: 2,
          forêts: 2,
          'zones humides': 2,
          vergers: 2,
          vignes: 2,
          'Sols artificialisés': 2,
          'sols artificiels imperméabilisés': 2,
          'sols artificiels enherbés': 2,
          'sols artificiels arborés et buissonants': 2
        }[groundType] || 0
      } else if (commune.insee) {
        return {
          zpc: '2_2',
          cultures: 8,
          prairies: 8,
          forêts: 8,
          'zones humides': 8,
          vergers: 8,
          vignes: 8,
          'Sols artificialisés': 8,
          'sols artificiels imperméabilisés': 8,
          'sols artificiels enherbés': 8,
          'sols artificiels arborés et buissonants': 8
        }[groundType] || 0
      } else return 0
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
    }),
    getHedgerowsDataForCommunes: jest.fn((location) => {
      if (location.communes.length === 2) {
        return [
          {
            department: 2,
            length: 10,
            carbonDensity: 50,
            byGroundType: {}
          },
          {
            department: 99,
            length: 10,
            carbonDensity: 10,
            byGroundType: {}
          }
        ]
      } else if (location.communes.length === 1) {
        return [
          {
            department: 2,
            length: 10,
            carbonDensity: 50,
            byGroundType: {}
          }
        ]
      } else if (location.communes.length === 3) {
        return [
          {
            department: 2,
            length: 2,
            carbonDensity: 50,
            byGroundType: {}
          },
          {
            department: 2,
            length: 8,
            carbonDensity: 50,
            byGroundType: {}
          },
          {
            department: 3,
            length: 20,
            carbonDensity: 20,
            byGroundType: {}
          }
        ]
      }
      return []
    })
  }
})

describe('The stocks calculation module', () => {
  const epci = { code: '00000000' }
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

    it('calculates ground stock by taking the sum of the products of density and area for every commune', () => {
      const groundStock = simpleStock.groundStock
      expect(groundStock).toEqual(100)
    })

    it('calculates biomass stock by taking the sum of the products of density and area for every commune', () => {
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
      // (25 * 2 + 25 * (4 + 5) + 25 * 6) * 2 communes
      expect(forestChild.totalStock).toEqual(850)
    })
  })

  describe('for wood products', () => {
    // implicit test: the default wood calculation setting is by harvest
    const stocksByHarvest = getStocks({ epci })

    it('for harvest, calculates stock by multiplying France stocks with the proportion of all m^3 of wood harvested locally', () => {
      expect(stocksByHarvest['produits bois'].boStock).toEqual(100)
      expect(stocksByHarvest['produits bois'].biStock).toEqual(200)
    })

    const stocksByConsumption = getStocks({ epci }, { woodCalculation: 'consommation' })

    it('for consumption, calculates stock by multipling France stocks with the proportion of local population', () => {
      // TODO: mock getPopulationTotal and epci.populationTotale and remove logic for a better test
      const populationShare = epci.population / getPopulationTotal()
      expect(stocksByConsumption['produits bois'].boStock).toEqual(500 * populationShare)
      expect(stocksByConsumption['produits bois'].biStock).toEqual(200 * populationShare)
    })
  })

  describe('for hedgerows', () => {
    it('returns the stock as the product of the length and carbon density for an EPCI', () => {
      const stocks = getStocks({ epci })
      const hedgerows = stocks.haies
      expect(hedgerows.area).toBe(20)
      expect(hedgerows.totalDensity).toBe(30) // weighted average
      expect(hedgerows.totalStock).toBe(600)
    })

    it('returns the stock as the product of the length and carbon density for a commune', () => {
      const stocks = getStocks({ commune: { departement: 2 } })
      const hedgerows = stocks.haies
      expect(hedgerows.totalStock).toBe(500)
    })

    it('returns the stock as the sum of the products of the length and carbon density for a grouping', () => {
      const stocks = getStocks({ communes: [{ departement: 2 }, { departement: 2 }, { departement: 3 }] })
      const hedgerows = stocks.haies
      expect(hedgerows.area).toBe(30)
      expect(hedgerows.totalDensity).toBe(30) // weighted average
      expect(hedgerows.totalStock).toBe(900)
    })

    it('supports length overrides', () => {
      const stocks = getStocks({ epci }, { areas: { haies: 10 } })
      const hedgerows = stocks.haies
      expect(hedgerows.area).toBe(10)
      expect(hedgerows.originalArea).toBe(20)
      expect(hedgerows.areaModified).toBe(true)
      expect(hedgerows.hasModifications).toBe(true)
      expect(hedgerows.totalDensity).toBe(30)
      expect(hedgerows.totalStock).toBe(300)
    })

    // TODO: test commune aggregation of lengths byGroundType
  })

  describe('for artificial ground types', () => {
    const impermeableKey = 'sols artificiels imperméabilisés'
    const shrubbyKey = 'sols artificiels arbustifs'
    const treeKey = 'sols artificiels arborés et buissonants'
    const unmodifiedStocks = getStocks({ epci })

    describe('the tree area', () => {
      it('can be set by the user without impacting the other area calculations', () => {
        const stocks = getStocks({ epci }, {
          areas: {
            'sols artificiels arborés et buissonants': 20
          }
        })
        expect(stocks[treeKey].area).toEqual(20)
        expect(stocks[impermeableKey].area).toEqual(unmodifiedStocks[impermeableKey].area)
        expect(stocks[shrubbyKey].area).toEqual(unmodifiedStocks[shrubbyKey].area)
      })

      it('can be fetched from the data as the sum of the areas of the communes', () => {
        const stocks = getStocks({ epci })
        expect(stocks[treeKey].area).toEqual(50)
      })
    })

    // NB: the 'proportion' in these tests refers to the hypothesis of the proportion of artificial ground
    //  which is impermeable. The value can be 0 - 1 inclusive.
    describe('the impermeable area', () => {
      it('can be set by the user without impacting the other area calculations', () => {
        const fixedImpermeableStocks = getStocks({ epci }, {
          areas: {
            'sols artificiels imperméabilisés': 20
          }
        })
        expect(fixedImpermeableStocks[impermeableKey].area).toEqual(20)
        expect(fixedImpermeableStocks[treeKey].area).toEqual(unmodifiedStocks[treeKey].area)
        expect(fixedImpermeableStocks[shrubbyKey].area).toEqual(unmodifiedStocks[shrubbyKey].area)
      })

      it('is the product of the proportion and the total when there are not many trees', () => {
        const stocks = getStocks({ commune: { insee: 'no trees' } })
        // proportion defaults to 0.8, or 80%. 80% of 25 is 20.
        expect(stocks[impermeableKey].area).toEqual(20)
      })

      it('is the product of the proportion and the total when there are not many trees, and the proportion can be customised', () => {
        const stocks = getStocks({ commune: { insee: 'no trees' } }, { proportionSolsImpermeables: 0.5 })
        expect(stocks[impermeableKey].area).toEqual(12.5)
      })

      it('is the area without trees minus the area with trees if there are >= 0.2 * area trees', () => {
        // with the trees area mocked at 50 we trigger this condition
        const stocks = getStocks({ epci })
        expect(stocks[impermeableKey].area).toEqual(0)
      })
    })

    describe('the shrubby area', () => {
      it('can be set by the user without impacting the other area calculations', () => {
        const stocks = getStocks({ epci }, {
          areas: {
            'sols artificiels arbustifs': 20
          }
        })
        expect(stocks[shrubbyKey].area).toEqual(20)
        expect(stocks[impermeableKey].area).toEqual(unmodifiedStocks[impermeableKey].area)
        expect(stocks[treeKey].area).toEqual(unmodifiedStocks[treeKey].area)
      })

      it('is the green portion of the total area minus the area with trees if there are not many trees', () => {
        const stocks = getStocks({ commune: { insee: 'few trees' } })
        // areaWithoutTrees = 25 (from mocked getArea fn)
        // areaWithTrees = 5
        // 5 < 0.2 * (areaWithoutTrees + areaWithTrees)
        // 5 < 0.2 * 30 === TRUE
        // areaImpermeable = 0.8 * 30 = 24
        // threshold for condition : areaWithTrees < 0.2 * (areaImpermeable + areaWithTrees)
        // 5 < 0.2 * 29 === TRUE
        // 0.2 (default green portion) * (areaWithoutTrees + areaWithTrees) - areaWithTrees
        // 0.2 * 30 - 5
        expect(stocks[shrubbyKey].area).toBeCloseTo(1, 0)
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

        // 7 * 50 * 3 = 1050 stock for 7 standard sources
        // 50 * 4 * (4 + 5) = 200 * 9 = 1800 for forest live and dead inc
        // 50 * 3 = 150 for the only sols art that has area with the mocked data
        // 0 for prod bois
        // 600 for haies
        const expectedBiomassStockTotal = 3600
        const total = stocks.total
        const expectedPercentage = expectedBiomassStockTotal / total * 100
        expect(percentageByReservoir['Biomasse sur pied']).toBeCloseTo(expectedPercentage, 1)
      })
    })
  })

  // getStocks for a commune
  // getStocks for multiple epcis and communes
  describe('for a custom grouping of territories', () => {
    const epci2 = { code: '99999999' }
    it('outputs area as sum of location areas', () => {
      const stocks = getStocks({ epcis: [epci, epci2] })
      expect(stocks.cultures.area).toEqual(75)
      expect(stocks.cultures.originalArea).toEqual(75)
      // (4 forest child types) 4 * 25 * 3 communes
      expect(stocks.forêts.area).toEqual(300)
      // 4 * (25 * 4) * 3
      expect(stocks.forêts.liveBiomassStock).toEqual(1200)
    })

    it('outputs ground density as weighted average of location areas', () => {
      const stocks = getStocks({ epcis: [epci, epci2] })
      expect(stocks.cultures.groundDensity).toEqual(4)
    })

    it('allows area overrides for a simple ground type', () => {
      const overrides = {
        areas: { cultures: 1000 }
      }
      const stocks = getStocks({ epcis: [epci, epci2] }, overrides)
      expect(stocks.cultures.area).toEqual(1000)
      expect(stocks.cultures.originalArea).toEqual(75)
      expect(stocks.cultures.areaModified).toBe(true)
      expect(stocks.cultures.hasModifications).toBe(true)
      // and the ground density should remain the weighted average from the original areas
      expect(stocks.cultures.groundDensity).toEqual(4)
    })

    it('updates parent type data for overridden child area', () => {
      const overrides = {
        areas: { 'forêt feuillu': 1000 }
      }
      const stocks = getStocks({ epcis: [epci, epci2] }, overrides)
      const forestChild = stocks['forêt feuillu']
      expect(forestChild.area).toEqual(1000)
      expect(forestChild.liveBiomassDensity).toEqual(4)
      expect(forestChild.liveBiomassStock).toEqual(4000)
      expect(forestChild.originalArea).toEqual(75)
      expect(forestChild.areaModified).toBe(true)
      expect(forestChild.hasModifications).toBe(true)
      const forestParent = stocks.forêts
      expect(forestParent.areaModified).toBe(true)
      expect(forestParent.hasModifications).toBe(true)
      // non overridden areas : 3 types * 25 area * 3 communes + 1000
      expect(forestParent.area).toEqual(1225)
      // 3 types * (25 * 4) * 3 communes + (1000 * 4)
      expect(forestParent.liveBiomassStock).toEqual(4900)
    })
    // 2 epcis, 2 communes (one of which is part of one of the epcis so shouldn't count)

    // it('calculates total stock as a sum of the stocks of the requested territories', () => {

    // })

    // it calculates the carbon density as a weighted average of the requested territories

    // it allows area overrides, calculating stock as original weighted density * area given
  })
})
