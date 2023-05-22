const { getCommunes } = require('../communes')

jest.mock('../dataByCommune/communes_17122018.csv.json', () => {
  return [
    {
      insee: '01234',
      epci: '200007177'
    },
    {
      insee: '01235',
      epci: '200007177'
    },
    {
      insee: '09999',
      epci: '000'
    }
  ]
})

test('Can fetch communes by SIREN EPCI', () => {
  const communes = getCommunes({ epci: { code: '200007177' } })
  expect(communes.length).toBe(2)
  expect(communes[0].insee).toBe('01234')
  expect(communes[1].insee).toBe('01235')
})

// TODO: test for multiple epcis
// TODO: test commune deduplication if specified epcis and communes
