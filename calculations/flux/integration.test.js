const { getAnnualFluxes } = require('./index')
const { getEpci } = require('../locations')

// unit-style tests
test('returns expected number of entries for cultures ground changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const cGround = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'sol')
  expect(cGround.length).toBe(9)
})

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

test('returns correct total for vergers and vignes', () => {
  let summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary.vergers.totalSequestration).toBeCloseTo(51, 0)
  summary = getAnnualFluxes({ epci: getEpci('200015162', true) }).summary
  expect(summary.vignes.totalSequestration).toBeCloseTo(17, 0)
  // the following value is wrong in the spreadsheet, so my calculations break.
  summary = getAnnualFluxes({ epci: getEpci('200040798', true) }).summary
  expect(summary.vignes.totalSequestration).toBeCloseTo(0, 0)
})

test('returns correct total for zones humides', () => {
  let summary = getAnnualFluxes({ epci: getEpci('200042992', true) }).summary
  expect(summary['zones humides'].totalSequestration).toBeCloseTo(3387, 0)
  summary = getAnnualFluxes({ epci: getEpci('200055887', true) }).summary
  expect(summary['zones humides'].totalSequestration).toBeCloseTo(416, 0)
})

test('option to set an area changed to 0', () => {
  const epci = getEpci('245700398', true)
  let flux = getAnnualFluxes({ epci })
  let summary = flux.summary
  const originalFlux = summary.cultures.totalSequestration
  expect(originalFlux).not.toBe(0)

  const areaChanges = {
    prai_herb_cult: 0
  }
  flux = getAnnualFluxes({ epci }, { areaChanges })
  summary = flux.summary
  // prairies to cultures results in an emission, so when reduced to 0 the sequestration value is larger
  expect(summary.cultures.totalSequestration).toBeGreaterThan(originalFlux)
})
