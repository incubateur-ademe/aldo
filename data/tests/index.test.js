const { epciList, getPopulationTotal } = require('../index')

test('returns EPCI list', () => {
  const list = epciList()
  expect(list.length).toBe(1244)
})

test('returns population total for EPCIs in system', () => {
  // inaccuracies in data means that improvements are made gradually, so setting as range not exact value
  expect(getPopulationTotal(epciList())).toBeGreaterThan(64000000)
  expect(getPopulationTotal(epciList())).toBeLessThan(65000000)
})
