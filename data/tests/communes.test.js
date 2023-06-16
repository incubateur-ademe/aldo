const { getCommunes, completeData } = require('../communes')

jest.mock('../dataByCommune/communes.json', () => {
  return {
    '01234': {
      insee: '01234',
      epci: '200007177'
    },
    '01235': {
      insee: '01235',
      epci: '200007177'
    },
    11234: {
      insee: '11234',
      epci: '200007188'
    },
    11235: {
      insee: '11235',
      epci: '200007188'
    },
    '09999': {
      insee: '09999',
      epci: '000'
    }
  }
})

jest.mock('../dataByCommune/zpc.csv.json', () => {
  return [
    {
      insee: '01234',
      zpc: '1_1'
    },
    {
      insee: '01235',
      zpc: '2_1'
    }
  ]
})

jest.mock('../dataByCommune/clc18-change.csv.json', () => {
  return [
    {
      commune: '01234',
      code12: '221',
      code18: '111',
      area: '6'
    },
    {
      commune: '01234',
      code12: '221',
      code18: '211',
      area: '12'
    }
  ]
})

describe('The commune fetching helper', () => {
  it('Can fetch communes by SIREN EPCI', () => {
    const communes = getCommunes({ epci: { code: '200007177', communes: ['01234', '01235'] } })
    expect(communes.length).toBe(2)
    expect(communes[0].insee).toBe('01234')
    expect(communes[1].insee).toBe('01235')
  })

  it('Can fetch communes for multiple EPCIs', () => {
    const communes = getCommunes({
      epcis: [
        { code: '200007177', communes: ['01234', '01235'] },
        { code: '200007188', communes: ['11234', '11235'] }
      ]
    })
    expect(communes.length).toBe(4)
    expect(communes[0].insee).toBe('01234')
    expect(communes[1].insee).toBe('01235')
    expect(communes[2].insee).toBe('11234')
    expect(communes[3].insee).toBe('11235')
  })

  it('Can deduplicate communes', () => {
    const communes = getCommunes({
      epci: { code: '200007177', communes: ['01234', '01235'] },
      epcis: [{ code: '200007177', communes: ['01234', '01235'] }, { code: '200007188', communes: ['11234', '11235'] }],
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

  describe('data extension', () => {
    it('adds ZPC to each commune', () => {
      const communes = completeData([{ insee: '01234' }, { insee: '01235' }])
      expect(communes.length).toBe(2)
      expect(communes[0].insee).toBe('01234')
      expect(communes[0].zpc).toBe('1_1')
      expect(communes[1].insee).toBe('01235')
      expect(communes[1].zpc).toBe('2_1')
    })

    it('adds area changes', () => {
      const communes = completeData([{ insee: '01234' }, { insee: '01235' }])
      expect(communes.length).toBe(2)
      expect(communes[0].insee).toBe('01234')
      expect(communes[0].changes).toBeDefined()
      expect(communes[0].changes.vignes['sols artificiels imperméabilisés']).toBe(1)
      expect(communes[0].changes.vignes.cultures).toBe(2)
    })
  })
})
