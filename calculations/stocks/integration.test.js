const { getStocks } = require('./index')
const { getEpci } = require('../epcis')

test('returns stocks by ground type for a valid EPCI', () => {
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') })

  expect(stocks.cultures.totalReservoirStock).toBeCloseTo(95097, 0)
  expect(stocks.cultures.stockPercentage).toEqual(6)
  expect(stocks.cultures.area).toBeCloseTo(1741, 0)

  expect(stocks.prairies.totalReservoirStock).toBeCloseTo(243060, 0)
  expect(stocks.prairies.stockPercentage).toEqual(15.3)
  expect(stocks.prairies.area).toEqual(2599.15354877)

  expect(stocks['prairies zones herbacées'].parent).toEqual('prairies')
  expect(stocks['prairies zones herbacées'].area).toEqual(2522.1652952)
  expect(stocks['prairies zones herbacées'].totalDensity).toEqual(93.30767341)
  // not adding stock tests for prairie subtypes because spreadsheet does something marginally different

  expect(stocks['prairies zones arbustives'].parent).toEqual('prairies')
  expect(stocks['prairies zones arbustives'].area).toEqual(76.98825357)
  expect(stocks['prairies zones arbustives'].totalDensity).toEqual(100.30767341)

  expect(stocks['prairies zones arborées'].parent).toEqual('prairies')
  expect(stocks['prairies zones arborées'].area).toEqual(0)
  expect(stocks['prairies zones arborées'].totalDensity).toEqual(150.30767341)

  expect(stocks['zones humides'].totalReservoirStock).toEqual(6813.237073875)
  expect(stocks['zones humides'].stockPercentage).toEqual(0.4)
  expect(stocks['zones humides'].area).toEqual(54.505896590999996)

  expect(stocks.vergers.totalReservoirStock).toEqual(0)
  expect(stocks.vergers.stockPercentage).toEqual(0)
  expect(stocks.vergers.area).toEqual(0)

  expect(stocks.vignes.totalReservoirStock).toEqual(0)
  expect(stocks.vignes.stockPercentage).toEqual(0)
  expect(stocks.vignes.area).toEqual(0)

  expect(stocks['sols artificiels'].totalReservoirStock).toBeCloseTo(67419.88, 2)
  expect(stocks['sols artificiels'].stockPercentage).toBeCloseTo(4.2, 1)
  expect(stocks['sols artificiels'].area).toBeCloseTo(1530.13, 2)

  expect(stocks['sols artificiels imperméabilisés'].area).toBeCloseTo(1224.10, 2)
  expect(stocks['sols artificiels imperméabilisés'].totalDensity).toBeCloseTo(30, 2)
  expect(stocks['sols artificiels imperméabilisés'].totalReservoirStock).toBeCloseTo(36723.12, 2)

  expect(stocks['sols artificiels arbustifs'].area).toBeCloseTo(306.03, 2)
  expect(stocks['sols artificiels arbustifs'].totalDensity).toBeCloseTo(100.31, 2)
  expect(stocks['sols artificiels arbustifs'].totalReservoirStock).toBeCloseTo(30696.76, 2)

  expect(stocks['sols artificiels arborés et buissonants'].area).toBeCloseTo(0, 2)
  expect(stocks['sols artificiels arborés et buissonants'].totalDensity).toBeCloseTo(145.57, 2)
  expect(stocks['sols artificiels arborés et buissonants'].totalReservoirStock).toBeCloseTo(0, 2)

  expect(stocks.haies.totalReservoirStock).toEqual(5085.895944561377)
  expect(stocks.haies.stockPercentage).toEqual(0.3)
  expect(stocks.haies.area).toEqual(61.68869213)

  expect(stocks.forêts.totalReservoirStock).toEqual(1127615.0067169224)
  expect(stocks.forêts.stockPercentage).toEqual(70.8)
  expect(stocks.forêts.area).toEqual(6456.9392066)

  expect(stocks['forêt mixte'].parent).toEqual('forêts')
  expect(stocks['forêt mixte'].area).toEqual(2762.462366)
  expect(stocks['forêt mixte'].totalDensity).toEqual(180.01374969)
  expect(stocks['forêt mixte'].totalReservoirStock).toEqual(497281.2088811692)

  expect(stocks['forêt feuillu'].parent).toEqual('forêts')
  expect(stocks['forêt feuillu'].area).toEqual(951.8722256)
  expect(stocks['forêt feuillu'].totalDensity).toEqual(180.47012302000002)
  expect(stocks['forêt feuillu'].totalReservoirStock).toEqual(171784.49765335317)

  expect(stocks['forêt conifere'].parent).toEqual('forêts')
  expect(stocks['forêt conifere'].area).toEqual(2742.504615)
  expect(stocks['forêt conifere'].totalDensity).toEqual(167.19547565)
  expect(stocks['forêt conifere'].totalReservoirStock).toEqual(458534.36357724515)

  expect(stocks['forêt peupleraie'].parent).toEqual('forêts')
  expect(stocks['forêt peupleraie'].area).toEqual(0.1)
  expect(stocks['forêt peupleraie'].totalDensity).toEqual(149.36605155)
  expect(stocks['forêt peupleraie'].totalReservoirStock).toEqual(14.936605155)
})

test('returns correct wood stocks for consumption calculation type', () => {
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') }, { woodCalculation: 'consommation' })

  expect(stocks['produits bois'].totalReservoirStock).toBeCloseTo(49171, 0)
  expect(stocks['produits bois'].stockPercentage).toEqual(3.1)
  expect(stocks['produits bois'].localPopulation).toEqual(27164)
  expect(stocks['produits bois'].francePopulation).toEqual(65705495)
  expect(stocks['produits bois'].portionPopulation).toBeDefined()
  // since the total is already confirmed as correct, just check the subtotals exist
  expect(stocks['produits bois'].boFranceStocksTotal).toBeDefined()
  expect(stocks['produits bois'].biFranceStocksTotal).toBeDefined()
  expect(stocks['produits bois'].boStock).toBeDefined()
  expect(stocks['produits bois'].biStock).toBeDefined()
})

test('returns correct wood stocks for harvest calculation type', () => {
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') }, { woodCalculation: 'récolte' })

  expect(stocks['produits bois'].totalReservoirStock).toBeCloseTo(48540, 0)
  expect(stocks['produits bois'].stockPercentage).toEqual(3)
  expect(stocks['produits bois'].boLocalHarvestTotal).toBeCloseTo(16138, 0)
  expect(stocks['produits bois'].biLocalHarvestTotal).toBeCloseTo(1538, 0)
  expect(stocks['produits bois'].boFranceHarvestTotal).toBeCloseTo(20105285, 0)
  expect(stocks['produits bois'].biFranceHarvestTotal).toBeCloseTo(11186985, 0)
  expect(stocks['produits bois'].boPortion).toBeDefined()
  expect(stocks['produits bois'].biPortion).toBeDefined()
  // since the total is already confirmed as correct, just check the subtotals exist
  expect(stocks['produits bois'].boFranceStocksTotal).toBeDefined()
  expect(stocks['produits bois'].biFranceStocksTotal).toBeDefined()
  expect(stocks['produits bois'].boStock).toBeDefined()
  expect(stocks['produits bois'].biStock).toBeDefined()
  // TODO: test percentageByReservoir here or below
})

test('returns stocks according to provided area overrides', () => {
  const areas = {
    cultures: 0,
    'prairies zones herbacées': 10,
    'prairies zones arbustives': 20,
    'prairies zones arborées': 30,
    'sols artificiels arbustifs': 40
  }
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') }, { areas })
  expect(stocks.cultures.totalReservoirStock).toEqual(0)
  expect(stocks.prairies.totalReservoirStock).toEqual(7448.4604046)
  expect(stocks.cultures.originalArea).toBeCloseTo(1741, 0)
  expect(stocks['sols artificiels arbustifs'].totalReservoirStock).toBeCloseTo(4012, 0)
  // test that if area is not given, our area data is used
  expect(stocks['zones humides'].originalArea).toBeCloseTo(55, 0)
  expect(stocks['sols artificiels imperméabilisés'].totalReservoirStock).toBeCloseTo(36723, 0)
})

// chart data tests
test('returns stocks by reservoir for a valid EPCI', () => {
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') }, { woodCalculation: 'consommation' })
  expect(stocks.percentageByReservoir).toEqual({
    'Sol (30 cm)': 61.6,
    Litière: 3.6,
    'Biomasse sur pied': 31.7,
    // NB: this number is different to the spreadsheet because the graphic for the spreadsheet doesn't take into
    // account the change in woodCalculation value
    'Matériaux bois': 3.1
  })
})

test('returns carbon density by ground type for a valid EPCI', () => {
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') }, { woodCalculation: 'consommation' })
  expect(stocks.byDensity).toEqual({
    cultures: 54.63076734,
    'prairies zones herbacées': 93.30767341,
    'prairies zones arbustives': 100.30767341,
    'prairies zones arborées': 150.30767341,
    'forêt feuillu': 180.47012302000002,
    'forêt mixte': 180.01374969,
    'forêt conifere': 167.19547565,
    'forêt peupleraie': 149.36605155,
    'zones humides': 125,
    vergers: 62,
    vignes: 44,
    'sols artificiels imperméabilisés': 30,
    'sols artificiels arbustifs': 100.30767341,
    'sols artificiels arborés et buissonants': 145.56920809000002,
    haies: 82.4445416
  })
})

test('returns EPCI information for name and other info where present', () => {
  // this EPCI has changed since 2018, so this tests that the communes are being found from older data
  const info = getEpci('CC Le Grésivaudan')
  expect(info.code).toBe('200018166')
  expect(info.membres).toBeDefined()
  expect(info.populationTotale).toBe(104039)
})

test('option to modify split of sols artificiels', () => {
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') }, { proportionSolsImpermeables: 0.6 })
  expect(stocks['sols artificiels'].totalReservoirStock).toBeCloseTo(88936, 0)
})

test('total stock returned', () => {
  const stocks = getStocks({ epci: getEpci('CC Faucigny-Glières') }, {})
  expect(stocks.total).toBeCloseTo(1593631, 0)
})
