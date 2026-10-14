import { getForestBiomassFluxesByCommune } from '../flux.ts'

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
