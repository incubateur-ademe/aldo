const {
  getAnnualGroundCarbonFlux,
  getAnnualGroundCarbonFluxes,
  getAnnualSurfaceChange
} = require('../flux')

test('returns carbon flux in tC/(ha.year) for ground for given area and from -> to combination', () => {
  expect(getAnnualGroundCarbonFlux({ epci: '200007177' }, 'prairies zones arborées', 'cultures')).toBeCloseTo(-0.7, 1)
})

test('returns all carbon flux in tc/(ha.year) for ground cultures', () => {
  const fluxes = getAnnualGroundCarbonFluxes({ epci: '200007177' })
  // expect(fluxes.length).toBe(87) TODO
  const cultureFluxes = fluxes.filter(f => f.to === 'cultures')
  expect(cultureFluxes.length).toBe(7)
  expect(fluxes[0]).toHaveProperty('from')
  expect(fluxes[0]).toHaveProperty('to')
  expect(fluxes[0]).toHaveProperty('value')
})

test('returns annual? change in surface area', () => {
  expect(getAnnualSurfaceChange({ epci: '200007177' }, 'prairies zones arborées', 'cultures')).toBeCloseTo(0, 2)
  expect(getAnnualSurfaceChange({ epci: '200007177' }, 'prairies zones arbustives', 'cultures')).toBeCloseTo(3.60, 2)
  expect(getAnnualSurfaceChange({ epci: '200007177' }, 'prairies zones herbacées', 'cultures')).toBeCloseTo(39.57, 2)
})
