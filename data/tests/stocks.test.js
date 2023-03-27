const {
  getCarbonDensity,
  getArea,
  getBiomassCarbonDensity,
  getCommuneAreaDataForEpci,
  getSignificantCarbonData,
  getCarbonDataForCommuneAndComposition,
  getForestBiomassCarbonDensities,
  getFranceStocksWoodProducts,
  // getAnnualWoodProductsHarvest,
  // getAnnualFranceWoodProductsHarvest,
  getForestLitterCarbonDensity
} = require('../stocks')

jest.mock('../communes', () => {
  return {
    getCommunes: jest.fn(() => {
      return [{ insee: '01234' }, { insee: '01235' }]
    })
  }
})

describe('The stocks data module', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  const groundDataPath = '../dataByEpci/ground.csv.json'
  it('given an EPCI and ground type, returns the carbon density in tC/ha from data file', () => {
    jest.doMock(groundDataPath, () => {
      return [
        {
          siren: '200007177',
          cultures: 50
        }
      ]
    })
    expect(getCarbonDensity({ epci: { code: '200007177' } }, 'cultures')).toBe(50)
  })

  const areaPath = '../dataByCommune/clc18.csv.json'
  it('returns area in hectares (ha) for ground type "cultures" and valid EPCI SIREN', () => {
    jest.doMock(areaPath, () => {
      return [
        {
          insee: '01234',
          code18: '211',
          area: '10'
        },
        {
          insee: '01235',
          code18: '212',
          area: '10'
        },
        {
          insee: '01235',
          code18: '211',
          area: '10'
        },
        {
          insee: '01234',
          code18: '213',
          area: '10'
        },
        {
          insee: '01234',
          code18: '241',
          area: '10'
        },
        {
          insee: '01234',
          code18: '242',
          area: '10'
        },
        {
          insee: '01234',
          code18: '243',
          area: '10'
        },
        {
          insee: '01234',
          code18: '244',
          area: '10'
        },
        // the following should be ignored
        {
          insee: '01234',
          code18: '999',
          area: '99'
        },
        {
          insee: '9999',
          code18: '244',
          area: '99'
        }
      ]
    })
    expect(getArea({ epci: { code: '200000172' } }, 'cultures')).toBe(80)
  })

  it('returns area in hectares (ha) for ground type "prairies zones herbacées" and valid EPCI SIREN', () => {
    jest.doMock(areaPath, () => {
      return [
        {
          insee: '01234',
          code18: '231',
          area: '10'
        },
        {
          insee: '01234',
          code18: '321',
          area: '5'
        },
        {
          insee: '01235',
          code18: '321',
          area: '5'
        },
        // to be ignored
        {
          insee: '01235',
          code18: '323',
          area: '99'
        }
      ]
    })
    expect(getArea({ epci: { code: '200000172' } }, 'prairies zones herbacées')).toBe(20)
  })

  it('throws useful error when attempting to get area for ground type without type to CLC type mapping', () => {
    jest.doMock(areaPath, () => {
      return [
        {
          insee: '01234',
          code18: '231',
          area: '10'
        }
      ]
    })
    let error
    try {
      getArea({ epci: { code: '200000172' } }, 'lake')
    } catch (e) {
      error = e
    }
    expect(error.message).toBe("No CLC code mapping found for ground type 'lake'")
  })

  it('returns biomass carbon density (as tC/ha) given valid ground type and EPCI SIREN', () => {
    jest.doMock('../dataByEpci/biomass-hors-forets.csv.json', () => {
      return [
        {
          siren: '200000172',
          'prairies zones arborées': 10
        }
      ]
    })
    expect(getBiomassCarbonDensity({ epci: { code: '200000172' } }, 'prairies zones arborées')).toBe(10)
  })

  it('relies on a different biomass function for forest biomass', () => {
    expect(getBiomassCarbonDensity({ epci: { code: '200000172' } }, 'forêt mixte')).toBeUndefined()
  })

  it('returns an array of area information per commune for an EPCI', () => {
    const epci = '200000172'
    jest.doMock('../dataByCommune/surface-foret.csv.json', () => {
      return [
        {
          INSEE_COM: '1001',
          CODE_EPCI: epci
        },
        {
          INSEE_COM: '1002',
          CODE_EPCI: epci
        },
        {
          INSEE_COM: '9999',
          CODE_EPCI: '249500513'
        }
      ]
    })
    const data = getCommuneAreaDataForEpci({ epci })
    expect(data.length).toBe(2)
  })

  it('returns an array of area for a combination of epcis and communes', () => {
    jest.doMock('../dataByCommune/surface-foret.csv.json', () => {
      return [
        {
          INSEE_COM: '1001',
          CODE_EPCI: '200000172'
        },
        {
          INSEE_COM: '1003',
          CODE_EPCI: '249500513'
        },
        {
          INSEE_COM: '2001',
          CODE_EPCI: '999999999'
        },
        {
          INSEE_COM: '2002',
          CODE_EPCI: '999999999'
        }
      ]
    })
    const data = getCommuneAreaDataForEpci({ epcis: ['200000172', '249500513'], communes: ['1003', '2001'] })
    expect(data.length).toBe(3)
  })

  it('returns the significant carbon data', () => {
    jest.doMock('../dataByEpci/bilan-carbone-foret-par-localisation.csv.json', () => {
      return [
        {
          surface_ic: 's'
        },
        {
          surface_ic: 'n.s'
        },
        {
          surface_ic: 's'
        }
      ]
    })
    const data = getSignificantCarbonData()
    expect(data.length).toBe(2)
  })

  it('for a matching groupser, returns data on the live and dead biomass carbon densities and wood product harvest for a given commune and composition', () => {
    const communeData = {
      code_groupeser: 'C5'
    }
    const carbonData = [
      {
        composition: 'Feuillu',
        code_localisation: 'A1'
      },
      {
        composition: 'Feuillu',
        code_localisation: 'C5',
        'carbone_(tC∙ha-1)': '10',
        'bois_mort_carbone_(tC∙ha-1)': '20',
        'prelevement_volume_(m3∙ha-1∙an-1)': '30'
      },
      {
        composition: 'Mixte',
        code_localisation: 'C5'
      }
    ]
    const data = getCarbonDataForCommuneAndComposition(communeData, carbonData, 'forêt feuillu')
    expect(data['carbone_(tC∙ha-1)']).toBe('10')
    expect(data['bois_mort_carbone_(tC∙ha-1)']).toBe('20')
    expect(data['prelevement_volume_(m3∙ha-1∙an-1)']).toBe('30')
  })

  it('for a matching greco, returns data on the live and dead biomass carbon densities and wood product harvest for a given commune and composition', () => {
    const communeData = {
      code_groupeser: 'C5',
      code_greco: 'C'
    }
    const carbonData = [
      {
        composition: 'Feuillu',
        code_localisation: 'A1'
      },
      {
        composition: 'Feuillu',
        code_localisation: 'C',
        'carbone_(tC∙ha-1)': '10',
        'bois_mort_carbone_(tC∙ha-1)': '20',
        'prelevement_volume_(m3∙ha-1∙an-1)': '30'
      },
      {
        composition: 'Mixte',
        code_localisation: 'C'
      }
    ]
    const data = getCarbonDataForCommuneAndComposition(communeData, carbonData, 'forêt feuillu')
    expect(data['carbone_(tC∙ha-1)']).toBe('10')
    expect(data['bois_mort_carbone_(tC∙ha-1)']).toBe('20')
    expect(data['prelevement_volume_(m3∙ha-1∙an-1)']).toBe('30')
  })

  it('for a matching rad13, returns data on the live and dead biomass carbon densities and wood product harvest for a given commune and composition', () => {
    const communeData = {
      code_groupeser: 'C5',
      code_greco: 'C',
      code_rad13: 'ARA'
    }
    const carbonData = [
      {
        composition: 'Feuillu',
        code_localisation: 'A1'
      },
      {
        composition: 'Feuillu',
        code_localisation: 'ARA',
        'carbone_(tC∙ha-1)': '10',
        'bois_mort_carbone_(tC∙ha-1)': '20',
        'prelevement_volume_(m3∙ha-1∙an-1)': '30'
      },
      {
        composition: 'Mixte',
        code_localisation: 'ARA'
      }
    ]
    const data = getCarbonDataForCommuneAndComposition(communeData, carbonData, 'forêt feuillu')
    expect(data['carbone_(tC∙ha-1)']).toBe('10')
    expect(data['bois_mort_carbone_(tC∙ha-1)']).toBe('20')
    expect(data['prelevement_volume_(m3∙ha-1∙an-1)']).toBe('30')
  })

  it('for a matching bassin populicole, returns data on the live and dead biomass carbon densities and wood product harvest for a given commune and composition', () => {
    const communeData = {
      code_groupeser: 'C5',
      code_greco: 'C',
      code_rad13: 'ARA',
      code_bassin_populicole: 'Sud'
    }
    const carbonData = [
      {
        composition: 'Feuillu',
        code_localisation: 'Sud'
      },
      {
        composition: 'Peupleraie',
        code_localisation: 'Sud',
        'carbone_(tC∙ha-1)': '10',
        'bois_mort_carbone_(tC∙ha-1)': '20',
        'prelevement_volume_(m3∙ha-1∙an-1)': '30'
      },
      {
        composition: 'Peupleraie',
        code_localisation: 'Nord'
      }
    ]
    const data = getCarbonDataForCommuneAndComposition(communeData, carbonData, 'forêt peupleraie')
    expect(data['carbone_(tC∙ha-1)']).toBe('10')
    expect(data['bois_mort_carbone_(tC∙ha-1)']).toBe('20')
    expect(data['prelevement_volume_(m3∙ha-1∙an-1)']).toBe('30')
  })

  it('falls back to France data with no matching carbon data, returns data on the live and dead biomass carbon densities and wood product harvest for a given commune and composition', () => {
    const communeData = {
      code_groupeser: 'C5',
      code_greco: 'C',
      code_rad13: 'ARA',
      code_bassin_populicole: 'Sud'
    }
    const carbonData = [
      {
        composition: 'Feuillu',
        code_localisation: 'France'
      },
      {
        composition: 'Conifere',
        code_localisation: 'France',
        'carbone_(tC∙ha-1)': '10',
        'bois_mort_carbone_(tC∙ha-1)': '20',
        'prelevement_volume_(m3∙ha-1∙an-1)': '30'
      }
    ]
    const data = getCarbonDataForCommuneAndComposition(communeData, carbonData, 'forêt conifere')
    expect(data['carbone_(tC∙ha-1)']).toBe('10')
    expect(data['bois_mort_carbone_(tC∙ha-1)']).toBe('20')
    expect(data['prelevement_volume_(m3∙ha-1∙an-1)']).toBe('30')
  })

  it('returns live biomass carbon density for a relevant forest type, weighted by area communes for an EPCI', () => {
    const epci = '200000172'
    jest.doMock('../dataByCommune/surface-foret.csv.json', () => {
      return [
        {
          INSEE_COM: '1001',
          CODE_EPCI: epci,
          code_groupeser: 'A1',
          SUR_MIXTES: '10'
        },
        {
          INSEE_COM: '1002',
          CODE_EPCI: epci,
          code_rad13: 'CVL',
          SUR_MIXTES: '30'
        }
      ]
    })
    jest.doMock('../dataByEpci/bilan-carbone-foret-par-localisation.csv.json', () => {
      return [
        {
          surface_ic: 's',
          code_localisation: 'A1',
          composition: 'Mixte',
          'carbone_(tC∙ha-1)': '2'
        },
        {
          surface_ic: 's',
          code_localisation: 'CVL',
          composition: 'Mixte',
          'carbone_(tC∙ha-1)': '4'
        }
      ]
    })
    expect(getForestBiomassCarbonDensities({ epci }, 'forêt mixte').live).toBe(3.5)
  })

  it('returns dead biomass carbon density for a relevant forest type, weighted by area communes for an EPCI', () => {
    const epci = '200000172'
    jest.doMock('../dataByCommune/surface-foret.csv.json', () => {
      return [
        {
          INSEE_COM: '1001',
          CODE_EPCI: epci,
          code_bassin_populicole: 'Nord',
          SUR_PEUPLERAIES: '10'
        },
        {
          INSEE_COM: '1002',
          CODE_EPCI: epci,
          code_bassin_populicole: 'Nord-Ouest',
          SUR_PEUPLERAIES: '30'
        }
      ]
    })
    jest.doMock('../dataByEpci/bilan-carbone-foret-par-localisation.csv.json', () => {
      return [
        {
          surface_ic: 's',
          code_localisation: 'Nord',
          composition: 'Peupleraie',
          'bois_mort_carbone_(tC∙ha-1)': '2'
        },
        {
          surface_ic: 's',
          code_localisation: 'Nord-Ouest',
          composition: 'Peupleraie',
          'bois_mort_carbone_(tC∙ha-1)': '4'
        }
      ]
    })
    expect(getForestBiomassCarbonDensities({ epci }, 'forêt peupleraie').dead).toBe(3.5)
  })

  it('returns area of forest subtype (as ha) given valid EPCI SIREN', () => {
    jest.doMock('../dataByCommune/surface-foret.csv.json', () => {
      return [
        {
          INSEE_COM: '00000',
          CODE_EPCI: '249500513',
          SUR_PEUPLERAIES: '30'
        },
        {
          INSEE_COM: '00001',
          CODE_EPCI: '249500513',
          SUR_PEUPLERAIES: '20'
        }
      ]
    })
    expect(getArea({ epci: { code: '249500513' } }, 'forêt peupleraie')).toBe(50)
  })

  it('returns area of haies (as ha) given valid EPCI SIREN', () => {
    jest.doMock('../dataByEpci/surface-haies.csv.json', () => {
      return [
        {
          siren: '249500513',
          area: '20'
        }
      ]
    })
    expect(getArea({ epci: { code: '249500513' } }, 'haies')).toBe(20)
  })

  it('returns forest litter carbon density (tC/ha) for valid forest subtype', () => {
    expect(getForestLitterCarbonDensity('feuillu')).toBe(9)
  })

  it('throws error when attempting to get forest litter carbon density for invalid forest subtype', () => {
    let error
    try {
      getForestLitterCarbonDensity('invalid')
    } catch (e) {
      error = e
    }
    expect(error.message).toBe("No forest litter carbon density found for forest subtype 'invalid'")
  })

  it('returns stocks of produits bois for France', () => {
    const franceStocks = getFranceStocksWoodProducts()
    // these are hard coded so not much point testing imo
    expect(franceStocks).toHaveProperty('bo')
    expect(franceStocks).toHaveProperty('bi')
  })

  // TODO: test getRegionProportionData
  // TODO: test harvestProportion
  // TODO: getAnnualWoodProductsHarvest
  // 4 x forest subtypes
})
