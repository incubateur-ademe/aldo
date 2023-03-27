const {
  // getAnnualGroundCarbonFlux,
  // getAllAnnualFluxes,
  // getAnnualSurfaceChange,
  getForestBiomassFluxesByCommune
} = require('../flux')

// test('returns expected area for forest types', () => {
//   const epci = { epci: '200000172' }
//   expect(getAnnualSurfaceChange(epci, {}, undefined, 'forêt feuillu')).toBeCloseTo(1920.9, 1)
//   expect(getAnnualSurfaceChange(epci, {}, undefined, 'forêt conifere')).toBeCloseTo(3876.0, 1)
//   expect(getAnnualSurfaceChange(epci, {}, undefined, 'forêt peupleraie')).toBeCloseTo(0.1, 1)
//   expect(getAnnualSurfaceChange(epci, {}, undefined, 'forêt mixte')).toBeCloseTo(2976.8, 1)
// })

test('returns array of fluxes of expected structure', () => {
  const fluxes = getForestBiomassFluxesByCommune({ epci: { code: '200000172' } })
  expect(fluxes.length).toBe(40)
  const flux = fluxes[0]
  expect(flux).toHaveProperty('to')
  expect(flux).toHaveProperty('commune')
  expect(flux).toHaveProperty('area')
  expect(flux).toHaveProperty('ignLocalisationLevel')
  expect(flux).toHaveProperty('ignLocalisationCode')
  expect(flux).toHaveProperty('growth')
  expect(flux).toHaveProperty('mortality')
  expect(flux).toHaveProperty('timberExtraction')
  expect(flux).toHaveProperty('fluxMeterCubed')
  expect(flux).toHaveProperty('conversionFactor')
  expect(flux).toHaveProperty('annualFlux')
  expect(flux).toHaveProperty('annualFluxEquivalent')
})
