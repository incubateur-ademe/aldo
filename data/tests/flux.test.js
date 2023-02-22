const {
  getAnnualGroundCarbonFlux,
  getAllAnnualFluxes,
  getAnnualSurfaceChange,
  getForestLitterFlux
} = require('../flux')

// test('returns all carbon flux in tc/(ha.year) for biomass cultures', () => {
//   const fluxes = getAllAnnualFluxes({ epci: '200007177' })
//   const biomassFlux = fluxes.filter(f => f.reservoir === 'biomasse')
//   const cultureFluxes = biomassFlux.filter(f => f.to === 'cultures')
//   expect(cultureFluxes.length).toBe(9)
//   expect(fluxes[0]).toHaveProperty('from')
//   expect(fluxes[0]).toHaveProperty('to')
//   expect(fluxes[0]).toHaveProperty('annualFlux')
// })

// test('returns expected biomass flux for forests', () => {
//   const fluxes = getAllAnnualFluxes({ epci: '200007177' })
//   const biomassFlux = fluxes.filter(f => f.reservoir === 'biomasse')
//   const forestFluxes = biomassFlux.filter(f => f.to.startsWith('forêt '))
//   expect(forestFluxes.length).toBe(4)
// })

// test('returns expected area change for forest types', () => {
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt feuillu')).toBeCloseTo(2220, 0)
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt conifere')).toBeCloseTo(18, 0)
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt peupleraie')).toBeCloseTo(150, 0)
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt mixte')).toBeCloseTo(14, 0)
// })

// ---------- TODO: NEW TESTS

// the flux data module

// returns an array of flux items

// a flux entry:
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

// portion impermeable is overrideable (to another number and to 0)

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
    expect(getAnnualGroundCarbonFlux({ epci: '200007177' }, 'prairies zones arborées', 'cultures')).toBe(-2)
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
    const fluxes = getAllAnnualFluxes({ epci: '200007177' })
    const groundFluxes = fluxes.filter(f => f.reservoir === 'sol')
    const cultureFluxes = groundFluxes.filter(f => f.to === 'cultures')
    // 1 vineyard + 4 forest subtypes
    expect(cultureFluxes.length).toBe(5)
  })

  const areaChangePath = '../dataByEpci/clc18-change.csv.json'
  test('returns change in surface area for given ground types from data file divided by 6, the number of years between studies', () => {
    const siren = '200007177'
    jest.doMock(areaChangePath, () => {
      return [
        {
          siren,
          // from constants.json:
          // prairies zones arborées = 323
          // cultures = 211, 212...
          '323-211': '20',
          '323-212': '4.6',
          '323-999': '100'
        }
      ]
    })
    expect(getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arborées', 'cultures')).toBeCloseTo(4.1, 1)
    expect(getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arbustives', 'cultures')).toBe(0)
  })

  // test('returns expected area change for sols artificiels', () => {
  //   const siren = '200007177'
  //   jest.doMock(areaChangePath, () => {
  //     return [
  //       {
  //         siren,
  //         // from constants.json:
  //         // prairies zones arborées = 323
  //         // cultures = 211, 212...
  //         '211-211': '20',
  //         '323-212': '4.6',
  //         '323-999': '100'
  //       }
  //     ]
  //   })
  //   expect(getAnnualSurfaceChange({ epci: siren }, {}, 'cultures', 'sols artificiels imperméabilisés')).toBeCloseTo(1.69, 2)
  //   expect(getAnnualSurfaceChange({ epci: siren }, {}, 'cultures', 'sols artificiels arbustifs')).toBeCloseTo(0.42, 2)
  // })

  describe('sols artificiels area changes', () => {
    // NB: in constants arbustifs and impermeable are the same codes
    describe('when final occupation is impermeable', () => {
      // it('always returns 0 when initial occupation is shrubby')
      // mock data for the two to have a change, check that it is 0
      // TODO: what about if has data overrides?
  
      // it('returns CLC change data when, for the same initial occupation, there is a large change to sols art with trees')
      // it('returns CLC change data when, for the same initial occupation, there is a large change to sols art with trees, with custom portion')
  
      // it('returns the impermeable portion of the sum of changes to impermeable and to sols art with trees')
      // it('returns the impermeable portion of the sum of changes to impermeable and to sols art with trees, with custom portion')
    })

    describe('when final occupation is shrubby', () => {
      // it('always returns 0 when initial occupation is impermeable')
      // mock data for the two to have a change, check that it is 0
      // TODO: what about if has data overrides?

      // it('for forest subtypes, if the change to sols art trees is smaller than the green portion of the shrubby change, return the green portion of the shrubby change')
      // it('for forest subtypes, if the change to sols art trees is smaller than the green portion of the shrubby change, return the green portion of the shrubby change, with custom portion')

      // it('if the change to sols art trees is smaller than the green portion of the tree and shrubby change, return the green portion of the tree and shrubby change, minus the tree change')
      // it('if the change to sols art trees is smaller than the green portion of the tree and shrubby change, return the green portion of the tree and shrubby change, minus the tree change, with custom portion')
    })

    describe('when final occupation is sols art trees', () => {
      it('returns 0 if the initial area is sols art arbustifs, prairies arborés, prairies arbusifs, vergers, vignes, or zones humides', () => {
        const siren = '200007177'
        jest.doMock(areaChangePath, () => {
          return [
            {
              siren,
              // from constants.json:
              // sols art arborés = 141
              '111-141': '60', // to sols art arbustifs
              '323-141': '60', // to prai_arbo
              '322-141': '60', // to prai_arbu
              '222-141': '60', // to vergers
              '221-141': '60', // to vignes
              '411-141': '60' // to zones humides
            }
          ]
        })
        const to = 'sols artificiels arborés et buissonants'
        const toSolsArtArbustifs = getAnnualSurfaceChange({ epci: siren }, {}, 'sols artificiels arbustifs', to)
        expect(toSolsArtArbustifs).toBe(0)
        const toPraiArbo = getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arborées', to)
        expect(toPraiArbo).toBe(0)
        const toPraiArbu = getAnnualSurfaceChange({ epci: siren }, {}, 'prairies zones arbustives', to)
        expect(toPraiArbu).toBe(0)
        const toVergers = getAnnualSurfaceChange({ epci: siren }, {}, 'vergers', to)
        expect(toVergers).toBe(0)
        const toVignes = getAnnualSurfaceChange({ epci: siren }, {}, 'vignes', to)
        expect(toVignes).toBe(0)
        const toZonesHumides = getAnnualSurfaceChange({ epci: siren }, {}, 'zones humides', to)
        expect(toZonesHumides).toBe(0)
      })

      it('returns CLC yearly change for remaining initial types', () => {
        const siren = '200007177'
        jest.doMock(areaChangePath, () => {
          return [
            {
              siren,
              // from constants.json:
              // sols art arborés = 141
              '244-141': '60' // to cultures
            }
          ]
        })
        const toCultures = getAnnualSurfaceChange({ epci: siren }, {}, 'cultures', 'sols artificiels arborés et buissonants')
        expect(toCultures).toBe(10)
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
      const fluxes = getAllAnnualFluxes({ epci: '200007177' })
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
      const fluxes = getAllAnnualFluxes({ epci: '200007177' })
      const toVineyards = fluxes.find((f) => f.from === 'forêt mixte' && f.to === 'vignes')
      expect(toVineyards.yearsForFlux).toBe(20)
      const toLeafy = fluxes.find((f) => f.from === 'prairies zones arborées' && f.to === 'forêt feuillu')
      expect(toLeafy.yearsForFlux).toBe(20)
    })

    it('adds litter changes for forest subtype -> other ground type changes', () => {
      const allFlux = getAllAnnualFluxes({ epci: '200007177' })
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
