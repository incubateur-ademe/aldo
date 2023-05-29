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
      insee: '11234',
      epci: '200007188'
    },
    {
      insee: '11235',
      epci: '200007188'
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

test('Can fetch communes for multiple EPCIs', () => {
  const communes = getCommunes({ epcis: [{ code: '200007177' }, { code: '200007188' }] })
  expect(communes.length).toBe(4)
  expect(communes[0].insee).toBe('01234')
  expect(communes[1].insee).toBe('01235')
  expect(communes[2].insee).toBe('11234')
  expect(communes[3].insee).toBe('11235')
})

test('Can deduplicate communes', () => {
  const communes = getCommunes({
    epci: { code: '200007177' },
    epcis: [{ code: '200007177' }, { code: '200007188' }],
    commune: { insee: '09999' },
    communes: [{ insee: '11235' }, { insee: '09999' }]
  })
  expect(communes.length).toBe(5)
  expect(communes[0].insee).toBe('01234')
  expect(communes[1].insee).toBe('01235')
  expect(communes[2].insee).toBe('11234')
  expect(communes[3].insee).toBe('11235')
  expect(communes[4].insee).toBe('09999')
})
