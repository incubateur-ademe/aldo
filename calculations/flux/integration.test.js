const { getAnnualFluxes } = require('./index')
const { getEpci } = require('../epcis')

// unit-style tests
test('returns expected number of entries for cultures ground changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const cGround = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'sol')
  expect(cGround.length).toBe(7)
})

test('returns expected number of entries for cultures litter changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const litter = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'litière')
  expect(litter.length).toBe(2)
})

// TODO: make all flux have a value and a co2e value - sums are done on co2e

// data-dependent tests
test('returns expected flux for each prairies -> cultures ground changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures' && f.reservoir === 'sol')
  const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
  const cPrairies = prairies.filter(f => f.gas === 'C')
  expect(cPrairies[0].value + cPrairies[1].value + cPrairies[2].value).toBeCloseTo(-638.71, 2)
})

test('returns expected flux for each prairies -> cultures N2O changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
  const n2oPrairies = prairies.filter(f => f.gas === 'N2O')
  expect(n2oPrairies[0].value + n2oPrairies[1].value).toBeCloseTo(-0.9, 2)
})

// TODO: add a forest litter value test if find EPCI with numbers !== 0

test('returns all relevant carbon emissions for cultures', () => {
  const summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary.cultures.totalCarbonSequestration).toBeCloseTo(-663.9, 1)
})

test('returns all relevant carbon and N20 emissions for cultures', () => {
  const summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary.cultures.totalSequestration).toBeCloseTo(-2702.5, 1)
  const fluxes = getAnnualFluxes({ epci: getEpci('200000933', true) })
  expect(fluxes.summary.cultures.totalSequestration).toBeCloseTo(-750, 0)
})

test('returns correct total for vergers and vignes', () => {
  let summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary.vergers.totalSequestration).toBeCloseTo(51, 0)
  summary = getAnnualFluxes({ epci: getEpci('200015162', true) }).summary
  expect(summary.vignes.totalSequestration).toBeCloseTo(17, 0)
  // the following value is wrong in the spreadsheet, so my calculations break.
  // summary = getAnnualFluxes({ epci: getEpci('200040798', true) }).summary
  // expect(summary.vignes.totalSequestration).toBeCloseTo(-99, 0)
})

test('returns correct total for all prairies', () => {
  const summary = getAnnualFluxes({ epci: getEpci('200015162', true) }).summary
  expect(summary.prairies.totalSequestration).toBeCloseTo(-772, 0)
})

test('returns correct total for zones humides', () => {
  let summary = getAnnualFluxes({ epci: getEpci('200042992', true) }).summary
  expect(summary['zones humides'].totalSequestration).toBeCloseTo(3388, 0)
  summary = getAnnualFluxes({ epci: getEpci('200055887', true) }).summary
  expect(summary['zones humides'].totalSequestration).toBeCloseTo(416, 0)
})

test('returns correct total for sols artificiels', () => {
  const summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary['sols artificiels'].totalSequestration).toBeCloseTo(-97, 0)
})

test('returns correct total for forests', () => {
  const summary1 = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary1.forêts.totalSequestration).toBeCloseTo(12151, 0)
  const summary2 = getAnnualFluxes({ epci: getEpci('3', true) }).summary
  expect(summary2.forêts.totalSequestration).toBeCloseTo(7202, 0)
  const summary3 = getAnnualFluxes({ epci: getEpci('249500455', true) }).summary
  expect(summary3.forêts.totalSequestration).toBeCloseTo(17424, 0)
})

test('returns correct total for wood products', () => {
  const summary = getAnnualFluxes({ epci: getEpci('245700398', true) }).summary
  expect(summary['produits bois'].totalSequestration).toBeCloseTo(270, 0)
  const summary1 = getAnnualFluxes({ epci: getEpci('245700398', true) }, { woodCalculation: 'consommation' }).summary
  expect(summary1['produits bois'].totalSequestration).toBeCloseTo(787, 0)
})

test('option to modify split of sols artificiels', () => {
  const stocks = getAnnualFluxes({ epci: getEpci('245700398', true) }, { proportionSolsImpermeables: 0.6 }).summary
  expect(stocks['sols artificiels'].totalSequestration).toBeCloseTo(-66, 0)
})
