// data/flux.comparison.test.js

// Fixtures définies en premier (seront accessibles dans beforeAll)
const AREA_DATA = [
  {
    INSEE_COM: '12345',
    CODE_EPCI: 'E001',
    code_groupeser: 'A1',
    code_greco: 'A',
    code_rad13: 'ARA',
    code_bassin_populicole: 'Nord-Est',
    SUR_FEUILLUS: '100',
    SUR_RESINEUX: '200',
    SUR_MIXTES: '0',
    SUR_PEUPLERAIES: '0'
  }
]

// Dataset 2022 : A1 résout pour Feuillu et Conifere, France fallback pour Mixte et Peupleraie
const CARBON_DATA_2022 = [
  { code_localisation: 'A1', composition: 'Feuillu', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '2.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.5',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '1.0', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.5' },
  { code_localisation: 'A1', composition: 'Conifere', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '3.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.3',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '2.0', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.7' },
  { code_localisation: 'France', composition: 'Feuillu', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Conifere', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Mixte', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Peupleraie', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' }
]

// Dataset 2026 : mêmes codes de localisation, valeurs différentes
const CARBON_DATA_2026 = [
  { code_localisation: 'A1', composition: 'Feuillu', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '2.5', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.6',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '1.2', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.7' },
  { code_localisation: 'A1', composition: 'Conifere', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '3.5', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.4',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '2.2', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.9' },
  { code_localisation: 'France', composition: 'Feuillu', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Conifere', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Mixte', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Peupleraie', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' }
]

// Dataset 2026 avec localisation différente pour déclencher le warning
const CARBON_DATA_2026_DIFFERENT_LOCA = [
  // Pas de A1 pour Conifere → cascade va fallback vers France
  { code_localisation: 'A1', composition: 'Feuillu', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '2.5', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.6',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '1.2', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.7' },
  { code_localisation: 'France', composition: 'Feuillu', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Conifere', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Mixte', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' },
  { code_localisation: 'France', composition: 'Peupleraie', surface_ic: 's',
    'production_carbone_(tC∙ha-1∙an-1)': '1.0', 'mortalite_carbone_(tC∙ha-1∙an-1)': '0.2',
    'prelevement_carbone_(tC∙ha-1∙an-1)': '0.5', 'bilan_carbone_(tC∙ha-1∙an-1)': '0.3' }
]

describe('getForestBiomassComparisonByCommune', () => {
  let getForestBiomassComparisonByCommune

  // jest.doMock (non-hoisted) + resetModules permet aux factories de référencer les const ci-dessus
  beforeAll(() => {
    jest.resetModules()
    jest.doMock('./dataByCommune/surface-foret.csv.json', () => AREA_DATA)
    jest.doMock('./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2022.csv.json', () => CARBON_DATA_2022)
    jest.doMock('./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json', () => CARBON_DATA_2026)
    getForestBiomassComparisonByCommune = require('./flux').getForestBiomassComparisonByCommune
  })

  afterAll(() => {
    jest.resetModules()
  })

  describe('cas limite : pas de commune ni EPCI', () => {
    it('retourne hasForestData false pour un regroupement', () => {
      const result = getForestBiomassComparisonByCommune({ communes: [], epcis: [] })
      expect(result).toEqual({ hasForestData: false })
    })
  })

  describe('cas limite : territoire sans forêt', () => {
    it('retourne hasForestData false si toutes les surfaces sont nulles', () => {
      const result = getForestBiomassComparisonByCommune({ commune: { insee: '99999' } })
      expect(result).toEqual({ hasForestData: false })
    })
  })

  describe('cas nominal : commune avec forêt', () => {
    let result
    beforeAll(() => {
      result = getForestBiomassComparisonByCommune({ commune: { insee: '12345' } })
    })

    it('retourne hasForestData true', () => {
      expect(result.hasForestData).toBe(true)
    })

    it('calcule accroissement 2022 par moyenne pondérée surface', () => {
      // Feuillu: 100ha × 2.0 + Conifere: 200ha × 3.0 = 800 / 300 = 2.667 tC/ha/an → ×44/12
      expect(result.data2022.accroissement).toBeCloseTo(2.667 * 44 / 12, 1)
    })

    it('calcule accroissement 2026 par moyenne pondérée surface', () => {
      // Feuillu: 100 × 2.5 + Conifere: 200 × 3.5 = 950 / 300 = 3.167 tC/ha/an → ×44/12
      expect(result.data2026.accroissement).toBeCloseTo(3.167 * 44 / 12, 1)
    })

    it('calcule mortalité 2022', () => {
      // Feuillu: 100 × 0.5 + Conifere: 200 × 0.3 = 110 / 300 = 0.367
      expect(result.data2022.mortalite).toBeCloseTo(0.367 * 44 / 12, 1)
    })

    it('calcule prélèvement 2022', () => {
      // Feuillu: 100 × 1.0 + Conifere: 200 × 2.0 = 500 / 300 = 1.667
      expect(result.data2022.prelevement).toBeCloseTo(1.667 * 44 / 12, 1)
    })

    it('calcule bilan 2022', () => {
      // Feuillu: 100 × 0.5 + Conifere: 200 × 0.7 = 190 / 300 = 0.633
      expect(result.data2022.bilan).toBeCloseTo(0.633 * 44 / 12, 1)
    })

    it('expose le code de localisation de la composition dominante (Conifere, 200ha)', () => {
      expect(result.localisationCode2022).toBe('A1')
      expect(result.localisationCode2026).toBe('A1')
    })

    it('hasWarning false quand les codes sont identiques', () => {
      expect(result.hasWarning).toBe(false)
    })

    it('fonctionne aussi via EPCI : même résultat que par commune (E001 contient 12345)', () => {
      const epciResult = getForestBiomassComparisonByCommune({ epci: { code: 'E001' } })
      expect(epciResult.hasForestData).toBe(true)
      // Feuillu: 100ha × 2.0 + Conifere: 200ha × 3.0 = 800 / 300 = 2.667 tC/ha/an → ×44/12
      expect(epciResult.data2022.accroissement).toBeCloseTo(2.667 * 44 / 12, 1)
    })
  })

  describe('warning : localisations différentes entre datasets', () => {
    let fnWithDifferentLoca

    beforeAll(() => {
      // Réinitialiser le registry et charger une nouvelle instance de flux.js avec un dataset 2026
      // où A1/Conifere est absent → cascade fallback vers France → code diffère de 2022 (A1)
      jest.resetModules()
      jest.doMock('./dataByCommune/surface-foret.csv.json', () => AREA_DATA)
      jest.doMock('./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2022.csv.json', () => CARBON_DATA_2022)
      jest.doMock('./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json',
        () => CARBON_DATA_2026_DIFFERENT_LOCA)
      fnWithDifferentLoca = require('./flux').getForestBiomassComparisonByCommune
    })

    // Note : quand le code diverge (A1 → France), le level diverge aussi nécessairement
    // (groupeser → France), donc la condition OR dans resolveLocalisation couvre les deux
    // branches simultanément. Un test code-only suffit à valider les deux.
    it('hasWarning true quand 2026 résout à un code différent de 2022 pour au moins une composition', () => {
      const result = fnWithDifferentLoca({ commune: { insee: '12345' } })
      expect(result.hasWarning).toBe(true)
    })
  })
})
