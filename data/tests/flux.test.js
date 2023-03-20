const {
  getAnnualGroundCarbonFlux,
  getAllAnnualFluxes,
  getAnnualSurfaceChange,
  getForestLitterFlux
} = require('../flux')

jest.mock('../communes', () => {
  return {
    getCommunes: jest.fn(() => {
      return [{ insee: '01234' }, { insee: '01235' }]
    })
  }
})

// test('returns all carbon flux in tc/(ha.year) for biomass cultures', () => {
//   const fluxes = getAllAnnualFluxes({ epci: {code:'200007177'} })
//   const biomassFlux = fluxes.filter(f => f.reservoir === 'biomasse')
//   const cultureFluxes = biomassFlux.filter(f => f.to === 'cultures')
//   expect(cultureFluxes.length).toBe(9)
//   expect(fluxes[0]).toHaveProperty('from')
//   expect(fluxes[0]).toHaveProperty('to')
//   expect(fluxes[0]).toHaveProperty('annualFlux')
// })

// test('returns expected biomass flux for forests', () => {
//   const fluxes = getAllAnnualFluxes({ epci: {code:'200007177'} })
//   const biomassFlux = fluxes.filter(f => f.reservoir === 'biomasse')
//   const forestFluxes = biomassFlux.filter(f => f.to.startsWith('forêt '))
//   expect(forestFluxes.length).toBe(4)
// })

// TODO: a flux entry has a good format:
// has a from
// has a to
// has a area
// has a originalArea
// has a areaModified
// has a reservoir
// has a gas
// has a flux
// has a fluxEquivalent
// has a value
// has a co2e

describe('The flux data module', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  const groundDataPath = '../dataByEpci/ground.csv.json'
  it('given an EPCI, initial ground and final ground, returns the carbon flux in tC/(ha.year) from data file', () => {
    jest.doMock(groundDataPath, () => {
      return [
        {
          siren: '200007177',
          'f_prai_cult_%zpc': -2
        }
      ]
    })
    expect(getAnnualGroundCarbonFlux({ epci: { code: '200007177' } }, 'prairies zones arborées', 'cultures')).toBe(-2)
  })

  it('returns all carbon flux in tc/(ha.year) for ground cultures', () => {
    jest.doMock(groundDataPath, () => {
      return [
        {
          siren: '200007177',
          'f_vign_cult_%zpc': 3,
          'f_for_cult_%zpc': -10
        }
      ]
    })
    const fluxes = getAllAnnualFluxes({ epci: { code: '200007177' } })
    const groundFluxes = fluxes.filter(f => f.reservoir === 'sol')
    const cultureFluxes = groundFluxes.filter(f => f.to === 'cultures')
    // 1 vineyard + 4 forest subtypes
    expect(cultureFluxes.length).toBe(5)
  })

  const areaChangePath = '../dataByCommune/clc18-change.csv.json'
  it('returns change in surface area for given ground types from data file divided by 6, the number of years between studies', () => {
    const siren = '200007177'
    jest.doMock(areaChangePath, () => {
      return [
        // from constants.json:
        // prairies zones arborées = 323
        // cultures = 211, 212...
        {
          commune: '01234',
          code12: '323',
          code18: '211',
          area: '5'
        },
        {
          commune: '01235',
          code12: '323',
          code18: '211',
          area: '15'
        },
        {
          commune: '01235',
          code12: '323',
          code18: '212',
          area: '4.6'
        },
        {
          commune: '01234',
          code12: '323',
          code18: '999', // uninteresting code for this change
          area: '100'
        },
        {
          commune: '09999', // uninteresting commune for this EPCI
          code12: '323',
          code18: '211',
          area: '100'
        }
      ]
    })
    expect(getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arborées', 'cultures')).toBeCloseTo(4.1, 1)
    expect(getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arbustives', 'cultures')).toBe(0)
  })

  describe('sols artificiels area changes', () => {
    // NB: in constants arbustifs and impermeable are the same codes
    describe('when final occupation is impermeable', () => {
      it('always returns 0 when initial occupation is shrubby', () => {
        const siren = '200007177'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '111',
              code18: '112',
              area: '100'
            },
            {
              commune: '01235',
              code12: '121',
              code18: '122',
              area: '200'
            }
          ]
        })
        const fromShrubby = getAnnualSurfaceChange({ epci: siren }, {}, 'sols artificiels arbustifs', 'sols artificiels imperméabilisés')
        expect(fromShrubby).toBe(0)
      })
      // TODO: what about if has data overrides?

      it('returns CLC change data when, for the same initial occupation, there is a large change to sols art with trees', () => {
        const siren = '200007177'
        const from = 'cultures'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '213', // cultures
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '241', // cultures
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '242', // cultures
              code18: '141', // sols art arborés
              area: '600'
            }
          ]
        })
        const fromCultures = getAnnualSurfaceChange({ epci: siren }, {}, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(50)
      })

      it('returns CLC change data when, for the same initial occupation, there is a large change to sols art with trees, with custom portion', () => {
        const siren = '200007177'
        const from = 'cultures'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '213', // cultures
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '241', // cultures
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '242', // cultures
              code18: '141', // sols art arborés
              area: '600'
            }
          ]
        })
        const fromCultures = getAnnualSurfaceChange({ epci: siren }, { proportionSolsImpermeables: 0.34 }, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(50)
      })

      it('returns the impermeable portion of the sum of changes to impermeable and to sols art with trees, with custom portion', () => {
        const siren = '200007177'
        const from = 'cultures'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '213', // cultures
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '241', // cultures
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '242', // cultures
              code18: '141', // sols art arborés
              area: '600'
            }
          ]
        })
        const fromCultures = getAnnualSurfaceChange({ epci: siren }, { proportionSolsImpermeables: 0.33 }, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(49.5)
      })

      it('returns the impermeable portion of the sum of changes to impermeable and to sols art with trees', () => {
        const siren = '200007177'
        const from = 'cultures'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '213', // cultures
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '241', // cultures
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '242', // cultures
              code18: '141', // sols art arborés
              area: '60'
            }
          ]
        })
        const fromCultures = getAnnualSurfaceChange({ epci: siren }, {}, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(48)
      })
    })
    // TODO: test if doubling up on changes to shrubby and impermeable since they use the same CLC codes
    describe('when final occupation is shrubby', () => {
      it('always returns 0 when initial occupation is impermeable', () => {
        const siren = '200007177'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '111', // sols art
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '121', // sols art
              code18: '122', // sols art
              area: '200'
            }
          ]
        })
        const toShrubby = getAnnualSurfaceChange({ epci: siren }, {}, 'sols artificiels imperméabilisés', 'sols artificiels arbustifs')
        expect(toShrubby).toBe(0)
      })
      // TODO: what about if has data overrides?

      it('for forest subtypes, if the change to sols art trees is smaller than the green portion of remaining sols art, return the green portion of remaining sols art', () => {
        const siren = '200007177'
        const from = 'forêt mixte'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '313', // forêt mixte
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '324', // forêt mixte
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '324', // forêt mixte
              code18: '141', // sols art arborés
              area: '6'
            }
          ]
        })
        // proportion green = 0.2; change sols art = 50
        // => threshold = 0.2 * 50 = 10
        const fromForestMixed = getAnnualSurfaceChange({ epci: siren }, {}, from, 'sols artificiels arbustifs')
        expect(fromForestMixed).toBeCloseTo(10, 0)
      })

      it('for forest subtypes, if the change to sols art trees is smaller than the green portion of remaining sols art, return the green portion of remaining sols art, with custom portion', () => {
        const siren = '200007177'
        const from = 'forêt mixte'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '313', // forêt mixte
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '324', // forêt mixte
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '324', // forêt mixte
              code18: '141', // sols art arborés
              area: '6'
            }
          ]
        })
        // proportion green = 0.4; change sols art = 50
        // => threshold = 0.4 * 50 = 20
        const fromForestMixed = getAnnualSurfaceChange({ epci: siren }, { proportionSolsImpermeables: 0.6 }, from, 'sols artificiels arbustifs')
        expect(fromForestMixed).toBeCloseTo(20, 0)
      })

      // TODO: in the code, changeSolsArbores is set as 0, meaning this test cannot pass
      // check what the actual behaviour should be
      // it('for forest subtypes, return 0 if change to sols art trees is greater than green portion of remaining sols art', () => {
      //   const siren = '200007177'
      //   const from = 'forêt mixte'
      //   jest.doMock(areaChangePath, () => {
      //     return [
      //       {
      //         siren,
      //         '313-112': 100, // forêt mixte -> sols art
      //         '324-122': 200, // forêt mixte -> sols art
      //         '324-141': 600 // forêt mixte -> sols art arborés
      //       }
      //     ]
      //   })
      //   // proportion green = 0.4; change sols art = 50
      //   // => threshold = 0.4 * 50 = 20
      //   const fromForestMixed = getAnnualSurfaceChange({ epci: siren }, {}, from, 'sols artificiels arbustifs')
      //   expect(fromForestMixed).toBe(0)
      // })

      it('if the change to sols art trees is smaller than the green portion of the total change to sols art, return the green portion of the total change to sols art, minus the tree change', () => {
        const siren = '200007177'
        const from = 'cultures'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '243', // cultures
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '243', // cultures
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '243', // cultures
              code18: '141', // sols art arborés
              area: '6'
            }
          ]
        })
        // proportion green = 0.4; change sols art = 50
        // => threshold = 0.2 * 50 = 10 (10 - 1)
        const fromCultures = getAnnualSurfaceChange({ epci: siren }, {}, from, 'sols artificiels arbustifs')
        expect(fromCultures).toBeCloseTo(9, 0)
      })

      it('if the change to sols art trees is smaller than the green portion of the total change to sols art, return the green portion of the total change to sols art, minus the tree change, with custom proportion', () => {
        const siren = '200007177'
        const from = 'cultures'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '243', // cultures
              code18: '112', // sols art
              area: '100'
            },
            {
              commune: '01235',
              code12: '243', // cultures
              code18: '122', // sols art
              area: '200'
            },
            {
              commune: '01235',
              code12: '243', // cultures
              code18: '141', // sols art arborés
              area: '6'
            }
          ]
        })
        // proportion green = 0.4; change sols art = 50
        // => threshold = 0.4 * 50 = 20 (20 - 1)
        const fromCultures = getAnnualSurfaceChange({ epci: siren }, { proportionSolsImpermeables: 0.6 }, from, 'sols artificiels arbustifs')
        expect(fromCultures).toBeCloseTo(19, 0)
      })
    })

    describe('when final occupation is sols art trees', () => {
      it('returns 0 if the initial area is sols art arbustifs, prairies arborés, prairies arbusifs, vergers, vignes, or zones humides', () => {
        const siren = '200007177'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '111', // sols art
              code18: '141', // sols art arborés
              area: '60'
            },
            {
              commune: '01234',
              code12: '323', // prai_arbo
              code18: '141', // sols art arborés
              area: '60'
            },
            {
              commune: '01234',
              code12: '322', // prai_arbu
              code18: '141', // sols art arborés
              area: '60'
            },
            {
              commune: '01234',
              code12: '222', // vergers
              code18: '141', // sols art arborés
              area: '60'
            },
            {
              commune: '01234',
              code12: '221', // vignes
              code18: '141', // sols art arborés
              area: '60'
            },
            {
              commune: '01234',
              code12: '411', // zones humides
              code18: '141', // sols art arborés
              area: '60'
            }
          ]
        })
        const to = 'sols artificiels arborés et buissonants'
        const fromSolsArtArbustifs = getAnnualSurfaceChange({ epci: siren }, {}, 'sols artificiels arbustifs', to)
        expect(fromSolsArtArbustifs).toBe(0)
        const fromPraiArbo = getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arborées', to)
        expect(fromPraiArbo).toBe(0)
        const fromPraiArbu = getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arbustives', to)
        expect(fromPraiArbu).toBe(0)
        const fromVergers = getAnnualSurfaceChange({ epci: siren }, {}, 'vergers', to)
        expect(fromVergers).toBe(0)
        const fromVignes = getAnnualSurfaceChange({ epci: siren }, {}, 'vignes', to)
        expect(fromVignes).toBe(0)
        const fromZonesHumides = getAnnualSurfaceChange({ epci: siren }, {}, 'zones humides', to)
        expect(fromZonesHumides).toBe(0)
      })

      it('returns CLC yearly change for remaining initial types', () => {
        const siren = '200007177'
        jest.doMock(areaChangePath, () => {
          return [
            {
              commune: '01234',
              code12: '244', // cultures
              code18: '141', // sols art
              area: '60'
            }
          ]
        })
        const fromCultures = getAnnualSurfaceChange({ epci: siren }, {}, 'cultures', 'sols artificiels arborés et buissonants')
        expect(fromCultures).toBe(10)
      })
    })
  })

  describe('for forests', () => {
    it('provides data per-subtype', () => {
      jest.doMock(groundDataPath, () => {
        return [
          {
            siren: '200007177',
            'f_for_vign_%zpc': -2,
            'f_cult_for_%zpc': 3
          }
        ]
      })
      const fluxes = getAllAnnualFluxes({ epci: { code: '200007177' } })
      const forestFlux = fluxes.find((f) => f.from === 'forêts' && f.to === 'vignes' && f.reservoir === 'sol')
      expect(forestFlux).toBeUndefined()
      const mixedFlux = fluxes.find((f) => f.from === 'forêt mixte' && f.to === 'vignes' && f.reservoir === 'sol')
      expect(mixedFlux).toBeDefined()
      expect(mixedFlux.annualFlux).toBe(-2)
      const coniferFlux = fluxes.find((f) => f.from === 'forêt conifere' && f.to === 'vignes' && f.reservoir === 'sol')
      expect(coniferFlux).toBeDefined()
      const leafyFlux = fluxes.find((f) => f.from === 'forêt feuillu' && f.to === 'vignes' && f.reservoir === 'sol')
      expect(leafyFlux).toBeDefined()
      const poplarFlux = fluxes.find((f) => f.from === 'forêt peupleraie' && f.to === 'vignes' && f.reservoir === 'sol')
      expect(poplarFlux).toBeDefined()
    })

    it('adds a multiplier of 20', () => {
      // the ground carbon density is the same for all forest types
      jest.doMock(groundDataPath, () => {
        return [
          {
            siren: '200007177',
            'f_for_vign_%zpc': -2,
            'f_prai_for_%zpc': 3
          }
        ]
      })
      const fluxes = getAllAnnualFluxes({ epci: { code: '200007177' } })
      const toVineyards = fluxes.find((f) => f.from === 'forêt mixte' && f.to === 'vignes')
      expect(toVineyards.yearsForFlux).toBe(20)
      const toLeafy = fluxes.find((f) => f.from === 'prairies zones arborées' && f.to === 'forêt feuillu')
      expect(toLeafy.yearsForFlux).toBe(20)
    })

    it('adds litter changes for forest subtype -> other ground type changes', () => {
      const allFlux = getAllAnnualFluxes({ epci: { code: '200007177' } })
      const culturesFlux = allFlux.filter(f => f.to === 'cultures')
      const litter = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'litière')
      expect(litter.length).toBe(4)
    })

    it('returns expected value for forest litter flux', () => {
      expect(getForestLitterFlux('cultures', 'forêt mixte')).toBe(9)
      expect(getForestLitterFlux('forêt feuillu', 'cultures')).toBe(-9)
      expect(getForestLitterFlux('zones humides', 'cultures')).toBeUndefined()
      expect(getForestLitterFlux('cultures', 'sols artificiels arborés et buissonants')).toBe(9)
      // TODO: ask if the following should be the case - the spreadsheet is malformed w/ repeated impermeabilise row
      expect(getForestLitterFlux('sols artificiels arborés et buissonants', 'cultures')).toBeUndefined()
    })
  })
})
