const {
  getCarbonDensity,
  getArea,
  getBiomassCarbonDensity,
  // getCommuneAreaDataForEpci,
  // getLiveBiomassCarbonDensity,
  // getDeadBiomassCarbonDensity,
  // getFranceStocksWoodProducts,
  // getAnnualWoodProductsHarvest,
  // getAnnualFranceWoodProductsHarvest,
  getForestLitterCarbonDensity
} = require('../stocks')

describe('The stocks data module', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  const groundDataPath = '../dataByEpci/ground.csv.json'
  it('given an EPCI, initial ground and final ground, returns the carbon flux in tC/(ha.year) from data file', () => {
    jest.doMock(groundDataPath, () => {
      return [
        {
          siren: '200007177',
          cultures: 50
        }
      ]
    })
    expect(getCarbonDensity({ epci: '200007177' }, 'cultures')).toBe(50)
  })

  const areaPath = '../dataByEpci/clc18.csv.json'
  it('returns area in hectares (ha) for ground type "cultures" and valid EPCI SIREN', () => {
    jest.doMock(areaPath, () => {
      return [
        {
          siren: '200000172',
          211: 10,
          212: 10,
          213: 10,
          241: 10,
          242: 10,
          243: 10,
          244: 10
        }
      ]
    })
    expect(getArea({ epci: '200000172' }, 'cultures')).toBe(70)
  })

  it('returns area in hectares (ha) for ground type "prairies zones herbacées" and valid EPCI SIREN', () => {
    jest.doMock(areaPath, () => {
      return [
        {
          siren: '200000172',
          231: 10,
          321: 10,
          323: 100 // should be ignored
        }
      ]
    })
    expect(getArea({ epci: '200000172' }, 'prairies zones herbacées')).toBe(20)
  })

  it('throws useful error when attempting to get area for ground type without type to CLC type mapping', () => {
    jest.doMock(areaPath, () => {
      return [
        {
          siren: '200000172',
          231: 10
        }
      ]
    })
    let error
    try {
      getArea({ epci: '200000172' }, 'lake')
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
    expect(getBiomassCarbonDensity({ epci: '200000172' }, 'prairies zones arborées')).toBe(10)
  })

  // it('returns forest biomass carbon density (as tC/ha) given valid forest type and EPCI SIREN', () => {
  it('relies on a different biomass function for forest biomass', () => {
    expect(getBiomassCarbonDensity({ epci: '200000172' }, 'forêt mixte')).toBeUndefined()
  })

  // TODO: tests for all the forest biomass functions
  // it('returns an array of area information per commune for an EPCI', () => {
  //   const epci = '200000172'
  //   jest.doMock('../dataByEpci/surface-foret-par-commune.csv.json', () => {
  //     return [
  //       {
  //         CODE_EPCI: epci,
  //         SUR_FEUILLUS: '20',
  //         SUR_RESINEUX: '100',
  //       }
  //     ]
  //   })
  //   const data = getCommuneAreaDataForEpci({ epci })
  // })

  // it('returns live biomass carbon density for a relevant forest type', () => {
  //   const epci = '200000172'
  //   jest.doMock('../dataByEpci/surface-foret-par-commune.csv.json', () => {
  //     return [
  //       {
  //         CODE_EPCI: epci,
  //         SUR_FEUILLUS: '20',
  //         SUR_RESINEUX: '100',
  //       }
  //     ]
  //   })
  //   expect(getLiveBiomassCarbonDensity({ epci: '200000172' }, 'forêt mixte')).toBe(20)
  // })

  // it('returns dead biomass carbon density for a relevant forest type', () => {
  //   expect(getDeadBiomassCarbonDensity({ epci: '200000172' }, 'forêt conifer')).toBe(10)
  // })

  // it('returns biomass carbon density (as tC/ha) for poplar groves', () => {
  //   expect(getBiomassCarbonDensity({ epci: '200000172' }, 'forêt peupleraie')).toBe(51.79684346)
  // })

  it('returns area of forest subtype (as ha) given valid EPCI SIREN', () => {
    jest.doMock('../dataByEpci/surface-foret-par-commune.csv.json', () => {
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
    expect(getArea({ epci: '249500513' }, 'forêt peupleraie')).toBe(50)
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
    expect(getArea({ epci: '249500513' }, 'haies')).toBe(20)
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
})

// test('returns stocks of produits bois for France', () => {
//   expect(getFranceStocksWoodProducts()).toStrictEqual({
//     bo: 177419001,
//     bi: 258680001
//   })
// })

// test('returns stocks of produits bois for France by composition and category', () => {
//   expect(getAnnualFranceWoodProductsHarvest()).toStrictEqual({
//     feuillus: {
//       bo: 15462933.6725767,
//       bi: 6835439.59931826
//     },
//     coniferes: {
//       bo: 4642351.6311988,
//       bi: 4351545.84347542
//     }
//   })
// })

// test('returns stocks of produits bois for location by composition and category', () => {
//   expect(getAnnualWoodProductsHarvest({ epci: '200000172' })).toStrictEqual({
//     feuillus: {
//       bo: 393.017426088703,
//       bi: 214.082662991407
//     },
//     coniferes: {
//       bo: 15745.2607908564,
//       bi: 1324.09871367348
//     }
//   })
// })
