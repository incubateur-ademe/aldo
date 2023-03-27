const { getEpci } = require('./locations')

test('returns EPCI information for name and other info where present', () => {
  // this EPCI has changed since 2018, so this tests that the communes are being found from older data
  const info = getEpci('CC Le Grésivaudan')
  expect(info.code).toBe('200018166')
  expect(info.membres.length).toBeGreaterThan(0)
  expect(info.populationTotale).toBe(104039)
})
