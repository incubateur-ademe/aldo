const { getAnnualFluxes } = require('./index')

// unit-style tests
test('returns expected number of entries for cultures ground changes', () => {
  const allFlux = getAnnualFluxes({ epci: '200007177' }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const cGround = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'ground')
  expect(cGround.length).toBe(7)
})

test('returns expected number of entries for cultures litter changes', () => {
  const allFlux = getAnnualFluxes({ epci: '200007177' }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const litter = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'litter')
  expect(litter.length).toBe(2)
})

// TODO: make all flux have a value and a co2e value - sums are done on co2e

// data-dependent tests
test('returns expected flux for each prairies -> cultures ground changes', () => {
  const allFlux = getAnnualFluxes({ epci: '200007177' }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures' && f.reservoir === 'ground')
  const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
  const cPrairies = prairies.filter(f => f.gas === 'C')
  expect(cPrairies[0].value + cPrairies[1].value + cPrairies[2].value).toBeCloseTo(-638.71, 2)
})

test('returns expected flux for each prairies -> cultures N2O changes', () => {
  const allFlux = getAnnualFluxes({ epci: '200007177' }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
  const n2oPrairies = prairies.filter(f => f.gas === 'N2O')
  expect(n2oPrairies[0].value + n2oPrairies[1].value).toBeCloseTo(-0.9, 2)
})

// TODO: add a forest litter value test if find EPCI with numbers !== 0

test('returns all relevant carbon emissions for cultures', () => {
  const summary = getAnnualFluxes({ epci: '200007177' }).summary
  expect(summary.cultures.totalCarbonSequestration).toBeCloseTo(-663.9, 1)
})

test('returns all relevant carbon and N20 emissions for cultures', () => {
  const summary = getAnnualFluxes({ epci: '200007177' }).summary
  expect(summary.cultures.totalSequestration).toBeCloseTo(-2702.5, 1)
  const fluxes = getAnnualFluxes({ epci: '200000933' })
  expect(fluxes.summary.cultures.totalSequestration).toBeCloseTo(-750, 0)
})
