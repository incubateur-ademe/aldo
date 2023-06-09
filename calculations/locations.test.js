const { getEpci } = require('./locations')

test('returns EPCI information for name and other info where present', () => {
  // this EPCI has changed since 2018, so this tests that the communes are being found from older data
  const info = getEpci('CC Faucigny-Glières')
  expect(info.code).toBe('200000172')
  // used excel to get the following numbers
  expect(info.communes.length).toBe(7)
  expect(info.population).toBe(26898)
})
