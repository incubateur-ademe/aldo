const { epciList, getPopulationTotal } = require('../index')

test('returns EPCI list', () => {
  const list = epciList()
  expect(list.length).toBe(1248)
})

test('returns population total for EPCIs in system', () => {
  expect(getPopulationTotal(epciList())).toBe(65705495)
})

test('EPCI communes are included', () => {
  const list = epciList()
  expect(list[0].membres).toBeDefined()
})
