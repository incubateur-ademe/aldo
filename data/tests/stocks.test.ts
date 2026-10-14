import { buildCommuneMap } from '../communes.ts'
import {
  getCarbonDataForCommuneAndComposition,
  getBiomassCarbonDensity,
  getFranceStocksWoodProducts,
  getForestLitterCarbonDensity,
  getAreaFromDataOptimized
} from '../stocks.ts'
import type { StocksId } from '../../calculations/constants.ts'
import type { CitepaSurfaceRow, IgnRow, SurfaceForetRow } from '../csv.ts'

// Les mocks de JSON ne s'appliquent qu'aux modules importés après vi.doMock :
// les tests qui en dépendent rechargent le module testé.
const load = () => import('../stocks.ts')

describe('The stocks data module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('given a commune and ground type, returns the carbon density in tC/ha according to the zone pédo-climatique (ZPC)', async () => {
    vi.doMock('../dataByCommune/stocks-zpc.csv.json', () => ({
      default: [
        {
          zpc: '1_1',
          cultures: '50'
        }
      ]
    }))
    const { getCarbonDensity } = await load()
    expect(getCarbonDensity({ insee: '01234', zpc: '1_1' }, 'cultures')).toBe(50)
  })

  it('returns area in hectares (ha) for ground type "cultures" and a commune', () => {
    const areas = [
      {
        insee_com: '01234',
        usage_2021: 'C',
        surfaces_ha: '10'
      },
      {
        insee_com: '01234',
        usage_2021: 'C_t',
        surfaces_ha: '10'
      },
      // the following should be ignored
      {
        insee_com: '01234',
        usage_2021: 'X_x',
        surfaces_ha: '99'
      },
      {
        insee_com: '9999',
        usage_2021: 'C',
        surfaces_ha: '99'
      }
    ] as CitepaSurfaceRow[]

    const areasByCommuneMap = buildCommuneMap({ communesRawData: areas })
    expect(getAreaFromDataOptimized({ commune: { insee: '01234' }, groundType: 'cultures', areasByCommuneMap })).toBe(20)
  })

  it('returns area in hectares (ha) for ground type "prairies zones herbacées" and a commune', () => {
    const areas = [
      {
        insee_com: '01234',
        usage_2021: 'P_h',
        surfaces_ha: '10'
      },
      {
        insee_com: '01234',
        usage_2021: 'P_h',
        surfaces_ha: '5'
      },
      // to be ignored
      {
        insee_com: '01235',
        usage_2021: '323',
        surfaces_ha: '99'
      }
    ] as CitepaSurfaceRow[]
    const areasByCommuneMap = buildCommuneMap({ communesRawData: areas })
    expect(getAreaFromDataOptimized({ commune: { insee: '01234' }, groundType: 'prairies zones herbacées', areasByCommuneMap })).toBe(15)
  })

  it('throws useful error when attempting to get area for ground type without type to CLC type mapping', () => {
    const areas = [
      {
        insee_com: '01234',
        usage_2021: 'P_h',
        surfaces_ha: '10'
      }
    ] as CitepaSurfaceRow[]
    const areasByCommuneMap = buildCommuneMap({ communesRawData: areas })
    let error
    try {
      getAreaFromDataOptimized({ commune: { insee: '01234' }, groundType: 'lake' as StocksId, areasByCommuneMap })
    } catch (e) {
      error = e
    }
    expect((error as Error).message).toBe("No CITEPA code mapping found for ground type 'lake'")
  })

  it('returns biomass carbon density (as tC/ha) given valid ground type and EPCI SIREN', async () => {
    vi.doMock('../dataByCommune/biomass-hors-forets.csv.json', () => ({
      default: [
        {
          INTER_REG: 'SUD-OUEST',
          'prairies zones arborées': '5'
        },
        {
          INTER_REG: 'NORD-OUEST',
          'prairies zones arborées': '10'
        }
      ]
    }))
    const { getBiomassCarbonDensity } = await load()
    expect(getBiomassCarbonDensity({ commune: { insee: '', region: '11' } }, 'prairies zones arborées')).toBe(10)
  })

  it('relies on a different biomass function for forest biomass', () => {
    expect(getBiomassCarbonDensity({ commune: { insee: '', region: '11' } }, 'forêt mixte')).toBeUndefined()
  })

  it('returns an array of area information per commune for an EPCI', async () => {
    const epci = '200000172'
    vi.doMock('../dataByCommune/surface-foret.csv.json', () => ({
      default: [
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
    }))
    const { getForestAreaData } = await load()
    const data = getForestAreaData({ epci: { code: epci } })
    expect(data.length).toBe(2)
  })

  it('returns an array of area for a combination of epcis and communes', async () => {
    vi.doMock('../dataByCommune/surface-foret.csv.json', () => ({
      default: [
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
    }))
    const { getForestAreaData } = await load()
    const data = getForestAreaData({
      epcis: [{ code: '200000172' }, { code: '249500513' }],
      communes: [{ insee: '1003' }, { insee: '2001' }]
    })
    expect(data.length).toBe(3)
  })

  it('returns the significant carbon data', async () => {
    vi.doMock('../dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json', () => ({
      default: [
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
    }))
    const { getSignificantCarbonData } = await load()
    const data = getSignificantCarbonData()
    expect(data.length).toBe(2)
  })

  it('for a matching groupser, returns data on the live and dead biomass carbon densities and wood product harvest for a given commune and composition', () => {
    const communeData = {
      code_groupeser: 'C5'
    } as SurfaceForetRow
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
    ] as IgnRow[]
    const data = getCarbonDataForCommuneAndComposition(communeData, carbonData, 'forêt feuillu')
    expect(data['carbone_(tC∙ha-1)']).toBe('10')
    expect(data['bois_mort_carbone_(tC∙ha-1)']).toBe('20')
    expect(data['prelevement_volume_(m3∙ha-1∙an-1)']).toBe('30')
  })

  it('for a matching greco, returns data on the live and dead biomass carbon densities and wood product harvest for a given commune and composition', () => {
    const communeData = {
      code_groupeser: 'C5',
      code_greco: 'C'
    } as SurfaceForetRow
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
    ] as IgnRow[]
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
    } as SurfaceForetRow
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
    ] as IgnRow[]
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
    } as SurfaceForetRow
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
    ] as IgnRow[]
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
    } as SurfaceForetRow
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
    ] as IgnRow[]
    const data = getCarbonDataForCommuneAndComposition(communeData, carbonData, 'forêt conifere')
    expect(data['carbone_(tC∙ha-1)']).toBe('10')
    expect(data['bois_mort_carbone_(tC∙ha-1)']).toBe('20')
    expect(data['prelevement_volume_(m3∙ha-1∙an-1)']).toBe('30')
  })

  it('returns live biomass carbon density for a relevant forest type, weighted by area communes for an EPCI', async () => {
    const epci = '200000172'
    vi.doMock('../dataByCommune/surface-foret.csv.json', () => ({
      default: [
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
    }))
    vi.doMock('../dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json', () => ({
      default: [
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
    }))
    const { getForestBiomassCarbonDensities } = await load()
    expect(getForestBiomassCarbonDensities({ epci: { code: epci } }, 'forêt mixte').live).toBe(3.5)
  })

  it('given an area of 0, returns a mean of the live biomass carbon densitie for a relevant forest type for an EPCI', async () => {
    const epci = '200000172'
    vi.doMock('../dataByCommune/surface-foret.csv.json', () => ({
      default: [
        {
          INSEE_COM: '1001',
          CODE_EPCI: epci,
          code_groupeser: 'A1',
          SUR_MIXTES: '0'
        },
        {
          INSEE_COM: '1002',
          CODE_EPCI: epci,
          code_rad13: 'CVL',
          SUR_MIXTES: '0'
        }
      ]
    }))
    vi.doMock('../dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json', () => ({
      default: [
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
    }))
    const { getForestBiomassCarbonDensities } = await load()
    expect(getForestBiomassCarbonDensities({ epci: { code: epci } }, 'forêt mixte').live).toBe(3)
  })

  it('returns dead biomass carbon density for a relevant forest type, weighted by area communes for an EPCI', async () => {
    const epci = '200000172'
    vi.doMock('../dataByCommune/surface-foret.csv.json', () => ({
      default: [
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
    }))
    vi.doMock('../dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json', () => ({
      default: [
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
    }))
    const { getForestBiomassCarbonDensities } = await load()
    expect(getForestBiomassCarbonDensities({ epci: { code: epci } }, 'forêt peupleraie').dead).toBe(3.5)
  })

  it('returns area of forest subtype (as ha) given a commune', () => {
    const areas = [
      {
        insee_com: '01234',
        usage_2021: 'F_p',
        surfaces_ha: '30'
      },
      {
        insee_com: '00001',
        usage_2021: 'F_p',
        surfaces_ha: '20'
      }
    ] as CitepaSurfaceRow[]

    const areasByCommuneMap = buildCommuneMap({ communesRawData: areas })
    expect(getAreaFromDataOptimized({ commune: { insee: '01234' }, groundType: 'forêt peupleraie', areasByCommuneMap })).toBe(30)
  })

  it('handles hedgerows area differently', () => {
    const areasByCommuneMap = buildCommuneMap({ communesRawData: [] as CitepaSurfaceRow[] })
    expect(getAreaFromDataOptimized({ commune: { insee: '01234' }, groundType: 'haies', areasByCommuneMap })).toBe(undefined)
  })

  describe('hedgerows', () => {
    it('returns length (km) and carbon density of hedgerows given a commune', async () => {
      // NB: this file is per-department not per-commune, unlike what the folder name suggests
      vi.doMock('../dataByCommune/carbone-haies.csv.json', () => ({
        default: [
          {
            dep: '2',
            C_tot_km: '10'
          },
          {
            dep: '3',
            C_tot_km: '50'
          }
        ]
      }))
      vi.doMock('../dataByCommune/haie-clc18.csv.json', () => ({
        default: [
          {
            INSEE_COM: '01234',
            TOTKM_HAIE: '20',
            INSEE_DEP: '2'
          },
          {
            INSEE_COM: '01235',
            TOTKM_HAIE: '10',
            INSEE_DEP: '3'
          },
          {
            INSEE_COM: '99999',
            TOTKM_HAIE: '99',
            INSEE_DEP: '9'
          }
        ]
      }))
      const { getHedgerowsDataForCommunes } = await load()
      const data = getHedgerowsDataForCommunes({ communes: [{ insee: '01234' }, { insee: '01235' }] })
      expect(data.length).toBe(2)
      const first = data[0]
      expect(first?.carbonDensity).toBe(10)
      expect(first?.length).toBe(20)
    })

    it('returns the default carbon density of hedgerows if there is no data for the location\'s department', async () => {
      vi.doMock('../dataByCommune/carbone-haies.csv.json', () => ({
        default: [
          {
            dep: '3',
            C_tot_km: '50'
          }
        ]
      }))
      vi.doMock('../dataByCommune/haie-clc18.csv.json', () => ({
        default: [
          {
            INSEE_COM: '01234',
            TOTKM_HAIE: '20',
            INSEE_DEP: '2'
          }
        ]
      }))
      const { getHedgerowsDataForCommunes } = await load()
      const data = getHedgerowsDataForCommunes({ communes: [{ insee: '01234' }, { insee: '01235' }] })
      const first = data[0]
      expect(first?.carbonDensity).toBe(101.347)
    })

    // TODO: could write test for the sum of hedgerow length byGroundType - expecting sum using CLC codes at level 1 (not child types)
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
    expect((error as Error).message).toBe("No forest litter carbon density found for forest subtype 'invalid'")
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
