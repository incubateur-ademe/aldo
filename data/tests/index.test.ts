import { epciList, getPopulationTotal } from '../index.ts'

test('returns EPCI list', () => {
  const list = epciList()
  expect(list.length).toBe(1244)
})

test('returns population total for EPCIs in system', () => {
  // inaccuracies in data means that improvements are made gradually, so setting as range not exact value
  expect(getPopulationTotal()).toBeGreaterThan(64000000)
  expect(getPopulationTotal()).toBeLessThan(65000000)
})
