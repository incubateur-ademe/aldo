const { getIgnLocalisation } = require('../shared')

describe('Shared', () => {
  it('returns IGN localisation from commune data when asked for rad13', () => {
    const communeData = {
      code_greco: 'C',
      code_ser: 'C51',
      code_groupeser: 'C5',
      code_rad13: 'ARA',
      code_bassin_populicole: 'Sud'
    }
    const data = getIgnLocalisation(communeData, 'rad13', 'Mixte')
    expect(data.localisationCode).toBe('ARA')
    expect(data.localisationLevel).toBe('rad13')
  })

  it('returns IGN localisation from commune data when asked for bassin_populicole', () => {
    const communeData = {
      code_greco: 'C',
      code_ser: 'C51',
      code_groupeser: 'C5',
      code_rad13: 'ARA',
      code_bassin_populicole: 'Sud'
    }
    const data = getIgnLocalisation(communeData, 'bassin_populicole', 'Peupleraie')
    expect(data.localisationCode).toBe('Sud')
    expect(data.localisationLevel).toBe('bassin_populicole')
  })

  it('overrides code and level for rad13 COR and conifere', () => {
    const communeData = {
      code_greco: 'C',
      code_ser: 'C51',
      code_groupeser: 'C5',
      code_rad13: 'COR',
      code_bassin_populicole: 'Sud'
    }
    const data = getIgnLocalisation(communeData, 'rad13', 'Conifere')
    expect(data.localisationCode).toBe('J')
    expect(data.localisationLevel).toBe('greco')
  })

  it('overrides code and level for rad13 COR and mixte', () => {
    const communeData = {
      code_greco: 'C',
      code_ser: 'C51',
      code_groupeser: 'C5',
      code_rad13: 'COR',
      code_bassin_populicole: 'Sud'
    }
    const data = getIgnLocalisation(communeData, 'rad13', 'Mixte')
    expect(data.localisationCode).toBe('J')
    expect(data.localisationLevel).toBe('greco')
  })

  it('overrides code and level for rad13 HDF and conifere/mixte', () => {
    const communeData = {
      code_greco: 'C',
      code_ser: 'C51',
      code_groupeser: 'C5',
      code_rad13: 'HDF',
      code_bassin_populicole: 'Sud'
    }
    const data = getIgnLocalisation(communeData, 'rad13', 'Mixte')
    expect(data.localisationCode).toBe('B')
    expect(data.localisationLevel).toBe('greco')
  })

  it('overrides code and level for rad13 PDL and conifere/mixte', () => {
    const communeData = {
      code_greco: 'C',
      code_ser: 'C51',
      code_groupeser: 'C5',
      code_rad13: 'PDL',
      code_bassin_populicole: 'Sud'
    }
    const data = getIgnLocalisation(communeData, 'rad13', 'Mixte')
    expect(data.localisationCode).toBe('A')
    expect(data.localisationLevel).toBe('greco')
  })
})
