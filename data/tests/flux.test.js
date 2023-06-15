const {
  getAnnualGroundCarbonFlux,
  getFluxReferenceValues,
  getAnnualSurfaceChange,
  getAnnualSurfaceChangeFromData,
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
//   const fluxes = getFluxReferenceValues({ epci: {code:'200007177'} })
//   const biomassFlux = fluxes.filter(f => f.reservoir === 'biomasse')
//   const cultureFluxes = biomassFlux.filter(f => f.to === 'cultures')
//   expect(cultureFluxes.length).toBe(9)
//   expect(fluxes[0]).toHaveProperty('from')
//   expect(fluxes[0]).toHaveProperty('to')
//   expect(fluxes[0]).toHaveProperty('annualFlux')
// })

// test('returns expected biomass flux for forests', () => {
//   const fluxes = getFluxReferenceValues({ epci: {code:'200007177'} })
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

  describe('the fetching of ground carbon flux in tC/(ha.year)', () => {
    const commune = { insee: '1001', zpc: '1_1' }
    it('given a commune, initial ground and final ground, returns the carbon flux in tC/(ha.year) from data file', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            prai_cult: -2
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'prairies zones arborées', 'cultures')).toBe(-2)
    })

    // the exceptions
    it('returns 0 for cultures -> vignes and cultures -> vergers', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            cult_vign: -2
            // testing both if data is present (not expected) and when it isn't
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'cultures', 'vignes')).toBe(0)
      expect(getAnnualGroundCarbonFlux({ commune }, 'cultures', 'vergers')).toBe(0)
    })

    it('for prairies -> sols art arborés return prairies -> forêts', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            prai_for: 2
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'prairies zones herbacées', 'sols artificiels arborés et buissonants')).toBe(2)
    })

    it('for forêt subtypes -> sols art arborés return 0', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1'
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'forêt conifere', 'sols artificiels arborés et buissonants')).toBe(0)
    })

    it('for zones humides -> vergers/vignes return as if -> cultures', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            zh_cult: 2
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'zones humides', 'vignes')).toBe(2)
      expect(getAnnualGroundCarbonFlux({ commune }, 'zones humides', 'vergers')).toBe(2)
    })

    it('for zones humides -> sols art imp return sum of (zh -> cult + cult -> sa imp)', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            cult_art_imp: 2,
            zh_cult: 3
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'zones humides', 'sols artificiels imperméabilisés')).toBe(5)
    })

    it('for zones humides -> sa enh return as if -> prairies', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            zh_prai: 2
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'zones humides', 'sols artificiels arbustifs')).toBe(2)
    })

    it('for zones humides -> sa arborés return as if -> forêt', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            zh_for: 2
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'zones humides', 'sols artificiels arborés et buissonants')).toBe(2)
    })

    it('for vergers -> cultures return 0', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1'
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vergers', 'cultures')).toBe(0)
    })

    it('for vergers -> zones humides return cultures -> zh', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            cult_zh: 2
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vergers', 'zones humides')).toBe(2)
    })

    it('for vergers -> vignes return 0', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1'
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vergers', 'vignes')).toBe(0)
    })

    it('for vergers to any sols art, return the equivalent using an initial occupation of cultures', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            cult_art_imp: 2,
            cult_art_arb: 3,
            cult_art_enh: 4
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vergers', 'sols artificiels imperméabilisés')).toBe(2)
      expect(getAnnualGroundCarbonFlux({ commune }, 'vergers', 'sols artificiels arborés et buissonants')).toBe(3)
      expect(getAnnualGroundCarbonFlux({ commune }, 'vergers', 'sols artificiels arbustifs')).toBe(4)
    })

    it('for vignes -> cultures return 0', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1'
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vignes', 'cultures')).toBe(0)
    })

    it('for vignes -> zones humides return cultures -> zh', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            cult_zh: 2
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vignes', 'zones humides')).toBe(2)
    })

    it('for vignes -> vergers return 0', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1'
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vignes', 'vergers')).toBe(0)
    })

    it('for vignes to any sols art, return the equivalent using an initial occupation of cultures', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            cult_art_imp: 2,
            cult_art_arb: 3,
            cult_art_enh: 4
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'vignes', 'sols artificiels imperméabilisés')).toBe(2)
      expect(getAnnualGroundCarbonFlux({ commune }, 'vignes', 'sols artificiels arborés et buissonants')).toBe(3)
      expect(getAnnualGroundCarbonFlux({ commune }, 'vignes', 'sols artificiels arbustifs')).toBe(4)
    })

    it('replaces an inital occupation of sols art imp with cultures for all', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            cult_prai: 1,
            cult_for: 2,
            cult_zh: 3,
            cult_art_arb: 4,
            cult_art_enh: 5
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'cultures')).toBe(0)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'prairies zones arbustives')).toBe(1)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'forêt mixte')).toBe(2)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'zones humides')).toBe(3)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'sols artificiels imperméabilisés')).toBe(0)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'sols artificiels arborés et buissonants')).toBe(4)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'sols artificiels arbustifs')).toBe(5)
      // takes into account cultures exceptions
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'vignes')).toBe(0)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels imperméabilisés', 'vergers')).toBe(0)
    })

    it('replaces an inital occupation of sols art enh with prairies for all', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            prai_cult: 1,
            prai_for: 2,
            prai_zh: 3,
            prai_vign: 4,
            prai_verg: 5,
            prai_art_imp: 6
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'cultures')).toBe(1)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'prairies zones arbustives')).toBe(0)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'forêt mixte')).toBe(2)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'zones humides')).toBe(3)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'vignes')).toBe(4)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'vergers')).toBe(5)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'sols artificiels imperméabilisés')).toBe(6)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'sols artificiels arbustifs')).toBe(0)
      // takes into account prairie subtype exceptions too
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arbustifs', 'sols artificiels arborés et buissonants')).toBe(2)
    })

    it('replaces an inital occupation of sols art arboré with forêt for all', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            for_cult: 1,
            for_prai: 2,
            for_zh: 3,
            for_vign: 4,
            for_verg: 5,
            for_art_imp: 6,
            for_art_enh: 7
          }
        ]
      })
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'cultures')).toBe(1)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'prairies zones arbustives')).toBe(2)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'forêt mixte')).toBe(0)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'zones humides')).toBe(3)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'vignes')).toBe(4)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'vergers')).toBe(5)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'sols artificiels imperméabilisés')).toBe(6)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'sols artificiels arbustifs')).toBe(7)
      expect(getAnnualGroundCarbonFlux({ commune }, 'sols artificiels arborés et buissonants', 'sols artificiels arborés et buissonants')).toBe(0)
    })

    it('returns all carbon flux in tc/(ha.year) for ground cultures', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            zh_cult: 3,
            for_cult: -10
          }
        ]
      })
      const fluxes = getFluxReferenceValues({ commune: { insee: '1001', zpc: '1_1', epci: '200007177' } })
      const groundFluxes = fluxes.filter(f => f.reservoir === 'sol')
      const cultureFluxes = groundFluxes.filter(f => f.to === 'cultures')
      // 1 zones humides + 4 forest subtypes + 3 0s (exceptions covered in above tests) + 1 SA arb which uses forest
      expect(cultureFluxes.length).toBe(9)
    })
  })

  const areaChangePath = '../dataByCommune/clc18-change.csv.json'
  it('returns change in surface area for given ground types from data file divided by 6, the number of years between studies', () => {
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
          commune: '01234',
          code12: '323',
          code18: '212',
          area: '7'
        },
        {
          commune: '01234',
          code12: '323',
          code18: '999', // uninteresting code for this change
          area: '100'
        },
        {
          commune: '09999', // uninteresting commune for this request
          code12: '323',
          code18: '211',
          area: '100'
        }
      ]
    })
    expect(getAnnualSurfaceChangeFromData({ commune: { insee: '01234' } }, 'prairies zones arborées', 'cultures')).toBe(2)
    expect(getAnnualSurfaceChangeFromData({ commune: { insee: '01234' } }, 'prairies zones arbustives', 'cultures')).toBe(0)
  })

  describe('sols artificiels area changes', () => {
    const communeLocation = { commune: { insee: '01234' } }
    // NB: in constants arbustifs and impermeable are the same codes
    describe('when final occupation is impermeable', () => {
      it('always returns 0 when initial occupation is shrubby', () => {
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              'sols artificiels arbustifs': {
                'sols artificiels imperméabilisés': 50
              }
            }
          }
        }
        const fromShrubby = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'sols artificiels arbustifs', 'sols artificiels imperméabilisés')
        expect(fromShrubby).toBe(0)
      })

      it('returns CLC change data when, for the same initial occupation, there is a large change to sols art with trees', () => {
        const from = 'cultures'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arborés et buissonants': 100
              }
            }
          }
        }
        const fromCultures = getAnnualSurfaceChange(communeLocationWithChanges, {}, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(50)
      })

      it('returns yearly CLC change data when, for the same initial occupation, there is a large change to sols art with trees, with custom portion', () => {
        const from = 'cultures'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arborés et buissonants': 100
              }
            }
          }
        }
        const fromCultures = getAnnualSurfaceChange(communeLocationWithChanges, { proportionSolsImpermeables: 0.34 }, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(50)
      })

      it('returns the impermeable portion of the sum of changes to impermeable and to sols art with trees, with custom portion', () => {
        const from = 'cultures'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arborés et buissonants': 100
              }
            }
          }
        }
        const fromCultures = getAnnualSurfaceChange(communeLocationWithChanges, { proportionSolsImpermeables: 0.33 }, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(49.5)
      })

      it('returns the impermeable portion of the sum of changes to impermeable and to sols art with trees', () => {
        const from = 'cultures'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arborés et buissonants': 10
              }
            }
          }
        }
        const fromCultures = getAnnualSurfaceChange(communeLocationWithChanges, {}, from, 'sols artificiels imperméabilisés')
        expect(fromCultures).toBe(48)
      })
    })
    // TODO: test if doubling up on changes to shrubby and impermeable since they use the same CLC codes
    describe('when final occupation is shrubby', () => {
      it('always returns 0 when initial occupation is impermeable', () => {
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                // these two share CLC codes so will always have the same value
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arbustifs': 50
              }
            }
          }
        }
        const toShrubby = getAnnualSurfaceChange(communeLocationWithChanges, 'sols artificiels imperméabilisés', 'sols artificiels arbustifs')
        expect(toShrubby).toBe(0)
      })
      // TODO: what about if has data overrides?

      it('for forest subtypes, if the change to sols art trees is smaller than the green portion of remaining sols art, return the green portion of remaining sols art', () => {
        const from = 'forêt mixte'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              'forêt mixte': {
                'sols artificiels arborés et buissonants': 1,
                // these two share CLC codes so will always have the same value
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arbustifs': 50
              }
            }
          }
        }
        // proportion green = 0.2; change sols art = 50
        // => threshold = 0.2 * 50 = 10
        const fromForestMixed = getAnnualSurfaceChange(communeLocationWithChanges, {}, from, 'sols artificiels arbustifs')
        expect(fromForestMixed).toBeCloseTo(10, 0)
      })

      it('for forest subtypes, if the change to sols art trees is smaller than the green portion of remaining sols art, return the green portion of remaining sols art, with custom portion', () => {
        const from = 'forêt mixte'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              'forêt mixte': {
                'sols artificiels arborés et buissonants': 1,
                // these two share CLC codes so will always have the same value
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arbustifs': 50
              }
            }
          }
        }
        // proportion green = 0.4; change sols art = 50
        // => threshold = 0.4 * 50 = 20
        const fromForestMixed = getAnnualSurfaceChange(communeLocationWithChanges, { proportionSolsImpermeables: 0.6 }, from, 'sols artificiels arbustifs')
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
      //   const fromForestMixed = getAnnualSurfaceChangeFromData(communeLocation, {}, from, 'sols artificiels arbustifs')
      //   expect(fromForestMixed).toBe(0)
      // })

      it('if the change to sols art trees is smaller than the green portion of the total change to sols art, return the green portion of the total change to sols art, minus the tree change', () => {
        const from = 'cultures'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                'sols artificiels arborés et buissonants': 1,
                // these two share CLC codes so will always have the same value
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arbustifs': 50
              }
            }
          }
        }
        // proportion green = 0.4; change sols art = 50
        // => threshold = 0.2 * 50 = 10 (10 - 1)
        const fromCultures = getAnnualSurfaceChange(communeLocationWithChanges, {}, from, 'sols artificiels arbustifs')
        expect(fromCultures).toBeCloseTo(9, 0)
      })

      it('if the change to sols art trees is smaller than the green portion of the total change to sols art, return the green portion of the total change to sols art, minus the tree change, with custom proportion', () => {
        const from = 'cultures'
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                'sols artificiels arborés et buissonants': 1,
                // these two share CLC codes so will always have the same value
                'sols artificiels imperméabilisés': 50,
                'sols artificiels arbustifs': 50
              }
            }
          }
        }
        // proportion green = 0.4; change sols art = 50
        // => threshold = 0.4 * 50 = 20 (20 - 1)
        const fromCultures = getAnnualSurfaceChange(communeLocationWithChanges, { proportionSolsImpermeables: 0.6 }, from, 'sols artificiels arbustifs')
        expect(fromCultures).toBeCloseTo(19, 0)
      })
    })

    describe('when final occupation is sols art trees', () => {
      it('returns 0 if the initial area is sols art arbustifs, prairies arborés, prairies arbustifs, vergers, vignes, or zones humides', () => {
        const toObj = {
          'sols artificiels arborés et buissonants': 10
        }
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              'sols artificiels imperméabilisés': toObj,
              'prairies zones arborées': toObj,
              'prairies zones arbustives': toObj,
              vergers: toObj,
              vignes: toObj,
              'zones humides': toObj
            }
          }
        }
        const to = 'sols artificiels arborés et buissonants'
        const fromSolsArtArbustifs = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'sols artificiels arbustifs', to)
        expect(fromSolsArtArbustifs).toBe(0)
        const fromPraiArbo = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'prairies zones arborées', to)
        expect(fromPraiArbo).toBe(0)
        const fromPraiArbu = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'prairies zones arbustives', to)
        expect(fromPraiArbu).toBe(0)
        const fromVergers = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'vergers', to)
        expect(fromVergers).toBe(0)
        const fromVignes = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'vignes', to)
        expect(fromVignes).toBe(0)
        const fromZonesHumides = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'zones humides', to)
        expect(fromZonesHumides).toBe(0)
      })

      it('returns CLC yearly change for remaining initial types', () => {
        const communeLocationWithChanges = {
          commune: {
            insee: '01234',
            changes: {
              cultures: {
                'sols artificiels arborés et buissonants': 10
              }
            }
          }
        }
        const fromCultures = getAnnualSurfaceChange(communeLocationWithChanges, {}, 'cultures', 'sols artificiels arborés et buissonants')
        expect(fromCultures).toBe(10)
      })
    })
  })

  describe('for forests', () => {
    it('provides data per-subtype', () => {
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            for_vign: -2,
            cult_for: 3
          }
        ]
      })
      const fluxes = getFluxReferenceValues({ commune: { insee: '1001', zpc: '1_1', epci: '200007177' } })
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
      jest.doMock('../dataByCommune/flux-zpc.csv.json', () => {
        return [
          {
            zpc: '1_1',
            for_vign: -2,
            prai_for: 3
          }
        ]
      })
      const fluxes = getFluxReferenceValues({ commune: { insee: '1001', zpc: '1_1', epci: '200007177' } })
      const toVineyards = fluxes.find((f) => f.from === 'forêt mixte' && f.to === 'vignes')
      expect(toVineyards.yearsForFlux).toBe(20)
      const toLeafy = fluxes.find((f) => f.from === 'prairies zones arborées' && f.to === 'forêt feuillu')
      expect(toLeafy.yearsForFlux).toBe(20)
    })

    it('adds litter changes for forest subtype -> other ground type changes', () => {
      const allFlux = getFluxReferenceValues({ commune: { insee: '1001', zpc: '1_1', epci: '200007177' } })
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
