const { getAnnualFluxes } = require('./index')
const { getEpci } = require('../locations')
const { getCommunes } = require('../../data/communes')

describe('Flux module integration tests', () => {
  const communes = getCommunes({ epci: getEpci('200007177', true) })
  test('returns expected number of entries for cultures ground changes', () => {
    // only return fluxes != 0
    const allFlux = getAnnualFluxes(communes).allFlux
    const culturesFlux = allFlux.filter(f => f.to === 'cultures')
    const cGround = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'sol')
    expect(cGround.length).toBe(29)
  })

  // data-dependent tests
  test('returns expected flux for each prairies -> cultures ground changes', () => {
    const allFlux = getAnnualFluxes(communes).allFlux
    const culturesFlux = allFlux.filter(f => f.to === 'cultures' && f.reservoir === 'sol')
    const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
    const cPrairies = prairies.filter(f => f.gas === 'C' && !!f.area)
    expect(cPrairies.reduce((acc, pFlux) => acc + pFlux.value, 0)).toBeCloseTo(-3081.24, 2)
  })

  test('returns expected flux for each prairies -> cultures N2O changes', () => {
    const allFlux = getAnnualFluxes(communes).allFlux
    const culturesFlux = allFlux.filter(f => f.to === 'cultures')
    const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
    const n2oPrairies = prairies.filter(f => f.gas === 'N2O')
    expect(n2oPrairies.reduce((acc, pFlux) => acc + pFlux.value, 0)).toBeCloseTo(-4.34, 1)
  })

  // TODO: add a forest litter value test if find EPCI with numbers !== 0

  test('returns all relevant carbon emissions for cultures', () => {
    const summary = getAnnualFluxes(communes).summary
    expect(summary.cultures.totalCarbonSequestration).toBeCloseTo(-3322.17, 1)
  })

  test('returns correct total for vergers and vignes', () => {
    let summary = getAnnualFluxes(communes).summary
    expect(summary.vergers.totalSequestration).toBeCloseTo(158.34, 0)
    summary = getAnnualFluxes(getCommunes({ epci: getEpci('200015162', true) })).summary
    expect(summary.vignes.totalSequestration).toBeCloseTo(-1963.45, 0)
    // the following value is wrong in the spreadsheet, so my calculations break.
    summary = getAnnualFluxes(getCommunes({ epci: getEpci('200040798', true) })).summary
    expect(summary.vignes).toBeUndefined()
  })

  test('returns correct total for zones humides', () => {
    let summary = getAnnualFluxes(getCommunes({ epci: getEpci('200042992', true) })).summary
    expect(summary['zones humides'].totalSequestration).toBeCloseTo(2978.86, 0)
    summary = getAnnualFluxes(getCommunes({ epci: getEpci('200055887', true) })).summary
    expect(summary['zones humides'].totalSequestration).toBeCloseTo(538.58, 0)
  })

  test('option to set an area changed to 0', () => {
    const epci = getEpci('245700398', true)
    let flux = getAnnualFluxes(getCommunes({ epci }))
    let summary = flux.summary
    const originalFlux = summary.cultures.totalSequestration
    expect(originalFlux).not.toBe(0)

    const areaChanges = {
      prai_herb_cult: 0
    }
    flux = getAnnualFluxes(getCommunes({ epci }), { areaChanges })
    summary = flux.summary
    // Setting prai_herb_cult to 0 reduces the cultures flux (less negative = less sequestration)
    expect(summary.cultures.totalSequestration).toBeGreaterThan(originalFlux)
  })
})
