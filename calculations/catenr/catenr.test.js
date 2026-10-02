const { getCatenr } = require('./index')
const { getCommune } = require('../locations')
const { parseCatenrFromQuery } = require('../../front/handlers/shared')

// Commune de référence du ticket #134 : 03238 Saint-Hilaire (ZPC 2_1).
const location = { commune: getCommune('03238', true) }

function inputs (rows, extra = {}) {
  return { lifespan: 25, totalArea: 10, rows, ...extra }
}

function eolienInputs (rows, extra = {}) {
  return { projectType: 'eolien', lifespan: 25, rows, ...extra }
}

describe('outil CAT\'ENR - photovoltaïque', () => {
  test('sans surface saisie, aucune donnée et des trajectoires nulles', () => {
    const result = getCatenr(location, inputs({}))
    expect(result.hasData).toBe(false)
    expect(result.initialTotal).toBe(0)
    expect(result.trajectories.projetProbable.every((value) => value === 0)).toBe(true)
  })

  test('état initial : stock du sol de la ZPC converti en tCO2e', () => {
    // cultures en ZPC 2_1 = 50 tC/ha dans stocks-zpc.csv, biomasse et litière nulles
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    expect(result.initialTotal).toBeCloseTo(50 * 44 / 12, 6)
    expect(result.trajectories.projetProbable[0]).toBeCloseTo(183.3333, 3)
  })

  test('imperméabilisation : perte immédiate dès l\'année 1, puis stock stable', () => {
    // flux cult_art_imp en ZPC 2_1 = -20 tC/ha, cinétique CAT'ENR = 0 (perte immédiate)
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const projet = result.trajectories.projetProbable
    expect(projet[1]).toBeCloseTo(30 * 44 / 12, 6)
    expect(projet[50]).toBeCloseTo(projet[1], 6)
  })

  test('scénario de référence : occupation inchangée, donc stock constant', () => {
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const reference = result.trajectories.referenceProbable
    expect(reference[0]).toBeCloseTo(reference[50], 6)
  })

  test('mise en herbe : stockage progressif au rythme du flux ALDO sur 20 ans', () => {
    // cult_prai en ZPC 2_1 = 0,37 tC/ha/an sur 20 ans, soit 27,1333 tCO2/ha au total.
    // La cinétique CAT'ENR est de 51,02 ans : le rythme annuel reste de 1/20e du flux.
    const result = getCatenr(location, inputs({
      'entre-panneaux': { area: 1, initialOccupation: 'cultures', finalOccupation: 'prairies zones herbacées' }
    }))
    const projet = result.trajectories.projetProbable
    const annualSoilFlux = 0.37 * 20 * 44 / 12 / 20
    // année 1 : rien (flux non immédiat), puis un pas par an
    expect(projet[1]).toBeCloseTo(projet[0], 6)
    expect(projet[3] - projet[2]).toBeCloseTo(annualSoilFlux, 4)
  })

  test('les surfaces en zone humide utilisent les stocks de sols humides', () => {
    const dry = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const wet = getCatenr(location, inputs({
      fondations: { area: 1, wetlandShare: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    // zones humides = 125 tC/ha pour toutes les ZPC
    expect(wet.initialTotal).toBeCloseTo(125 * 44 / 12, 6)
    expect(wet.initialTotal).toBeGreaterThan(dry.initialTotal)
  })

  test('contrôle de cohérence des surfaces : somme hors OLD contre surface du parc', () => {
    const rows = {
      fondations: { area: 1 },
      'entre-panneaux': { area: 7 },
      'emprises-libres': { area: 2 },
      old: { area: 4 }
    }
    expect(getCatenr(location, inputs(rows, { totalArea: 10 })).surfaceCheck).toMatchObject({
      sum: 10,
      isValid: true,
      message: 'Surfaces : OK'
    })
    expect(getCatenr(location, inputs(rows, { totalArea: 12 })).surfaceCheck.isValid).toBe(false)
  })

  test('les temporalités affichées suivent la durée de vie saisie', () => {
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }, { lifespan: 30 }))
    const lifespanRow = result.stocks.find((stock) => stock.id === 'duree-de-vie')
    expect(lifespanRow.year).toBe(30)
    expect(lifespanRow.value).toBeCloseTo(result.trajectories.projetProbable[30] * 12 / 44, 6)
  })

  test('la variation compare le scénario projet au scénario de référence', () => {
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const at20 = result.variations.find((variation) => variation.id === '20-ans')
    expect(at20.value).toBeCloseTo(30 - 50, 6)
  })

  test('les tableaux de synthèse sont en tC, les trajectoires en tCO2e', () => {
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    expect(result.trajectories.projetProbable[0]).toBeCloseTo(50 * 44 / 12, 6)
    expect(result.stocks[0].value).toBeCloseTo(50, 6)
  })

  test('le scénario de référence a son propre tableau de stocks', () => {
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    expect(result.referenceStocks.map((stock) => stock.id)).toEqual(result.stocks.map((stock) => stock.id))
    const at20 = result.referenceStocks.find((stock) => stock.id === '20-ans')
    // cultures conservées : stock constant
    expect(at20.value).toBeCloseTo(50, 6)
    expect(at20.pessimistic).toBeCloseTo(50, 6)
    expect(at20.optimistic).toBeCloseTo(50, 6)
  })

  test('des surfaces incohérentes bloquent la présentation des résultats', () => {
    const rows = {
      fondations: { area: 1, initialOccupation: 'cultures' },
      'entre-panneaux': { area: 9, initialOccupation: 'cultures' }
    }
    expect(getCatenr(location, inputs(rows, { totalArea: 10 })).isBlocked).toBe(false)
    expect(getCatenr(location, inputs(rows, { totalArea: 12 })).isBlocked).toBe(true)
    // sans saisie, rien à bloquer
    expect(getCatenr(location, inputs({}, { totalArea: 12 })).isBlocked).toBe(false)
    // l'éolien n'a pas de contrôle de cohérence
    expect(getCatenr(location, eolienInputs({ 'fondations-socle': { area: 1 } })).isBlocked).toBe(false)
  })

  test('scénario de référence optimiste : une prairie évolue vers la strate arborée', () => {
    const result = getCatenr(location, inputs({
      'emprises-libres': {
        area: 1,
        initialOccupation: 'prairies zones herbacées',
        finalOccupation: 'prairies zones herbacées'
      }
    }))
    const { referenceProbable, referenceOptimiste } = result.trajectories
    expect(referenceOptimiste[50]).toBeGreaterThan(referenceProbable[50])
  })

  test('scénario projet pessimiste : les emprises artificialisées deviennent imperméabilisées', () => {
    // « Espace entre les panneaux » (composant « Espaces entre les panneaux ») bascule
    // en sols nus dans l'hypothèse pessimiste, alors que le cas probable est une prairie.
    const result = getCatenr(location, inputs({
      'entre-panneaux': { area: 1, initialOccupation: 'cultures', finalOccupation: 'prairies zones herbacées' }
    }))
    expect(result.trajectories.projetPessimiste[1]).toBeCloseTo(30 * 44 / 12, 6)
    expect(result.trajectories.projetPessimiste[50])
      .toBeLessThan(result.trajectories.projetProbable[50])
  })

  test('la trajectoire couvre bien 51 valeurs (années 0 à 50)', () => {
    const result = getCatenr(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    expect(result.trajectories.projetProbable).toHaveLength(51)
  })
})

describe("outil CAT'ENR - éolien terrestre", () => {
  test('sans technologie précisée, le photovoltaïque reste la valeur par défaut', () => {
    expect(getCatenr(location, inputs({})).project.id).toBe('pv')
    expect(getCatenr(location, { ...inputs({}), projectType: 'inconnu' }).project.id).toBe('pv')
  })

  test('les emprises décrites sont celles de l\'onglet « 2.Eolien Caractéristiques »', () => {
    const result = getCatenr(location, eolienInputs({}))
    expect(result.project.id).toBe('eolien')
    expect(result.rows.map((row) => row.id)).toEqual([
      'fondations-socle',
      'fondations-assiette',
      'voiries-infrastructures',
      'raccordement',
      'defavorabilisation',
      'old',
      'surface-sous-gestion'
    ])
  })

  test('aucun contrôle de cohérence des surfaces, le tableur n\'en prévoit pas pour l\'éolien', () => {
    expect(getCatenr(location, eolienInputs({})).surfaceCheck).toBeNull()
    expect(getCatenr(location, inputs({})).surfaceCheck).not.toBeNull()
  })

  test('le calcul est identique à celui du photovoltaïque à emprise équivalente', () => {
    const result = getCatenr(location, eolienInputs({
      'fondations-socle': {
        area: 1,
        initialOccupation: 'cultures',
        finalOccupation: 'sols artificiels imperméabilisés'
      }
    }))
    expect(result.initialTotal).toBeCloseTo(50 * 44 / 12, 6)
    expect(result.trajectories.projetProbable[1]).toBeCloseTo(30 * 44 / 12, 6)
  })

  test('scénario projet pessimiste : les emprises des plateformes deviennent des sols nus', () => {
    // « Fondations - Emprise de l'assiette » est un composant « Emprises des
    // plateformes » : le tableur (Listes!K5:L5) bascule ces surfaces en sols nus.
    const result = getCatenr(location, eolienInputs({
      'fondations-assiette': {
        area: 1,
        initialOccupation: 'cultures',
        finalOccupation: 'prairies zones herbacées'
      }
    }))
    expect(result.trajectories.projetPessimiste[1]).toBeCloseTo(30 * 44 / 12, 6)
    expect(result.trajectories.projetPessimiste[50])
      .toBeLessThan(result.trajectories.projetProbable[50])
  })

  test('les temporalités affichées suivent la durée de vie saisie', () => {
    const result = getCatenr(location, eolienInputs({
      'fondations-socle': { area: 1, initialOccupation: 'cultures' }
    }, { lifespan: 30 }))
    const lifespanRow = result.stocks.find((stock) => stock.id === 'duree-de-vie')
    expect(lifespanRow.year).toBe(30)
    expect(lifespanRow.value).toBeCloseTo(result.trajectories.projetProbable[30] * 12 / 44, 6)
  })
})

describe("lecture des paramètres d'URL de l'outil CAT'ENR", () => {
  test('sans paramètre, aucune modification', () => {
    const parsed = parseCatenrFromQuery({})
    expect(parsed.hasModifications).toBe(false)
    expect(parsed.lifespan).toBeUndefined()
    expect(parsed.rows.fondations.area).toBeUndefined()
  })

  test('les codes courts sont traduits en occupations des sols', () => {
    const parsed = parseCatenrFromQuery({
      cat_duree: '25',
      cat_surface: '12.5',
      cat_fo_s: '0.8',
      cat_fo_zh: '25',
      cat_fo_i: 'formix',
      cat_fo_age: '30',
      cat_fo_f: 'saimp'
    })
    expect(parsed.hasModifications).toBe(true)
    expect(parsed.lifespan).toBe(25)
    expect(parsed.totalArea).toBe(12.5)
    expect(parsed.rows.fondations).toMatchObject({
      area: 0.8,
      wetlandShare: 0.25,
      age: 30,
      initialOccupation: 'forêt mixte',
      finalOccupation: 'sols artificiels imperméabilisés'
    })
  })

  test('un code inconnu est ignoré plutôt que de fausser le calcul', () => {
    const parsed = parseCatenrFromQuery({ cat_ep_i: 'inconnu' })
    expect(parsed.rows['entre-panneaux'].initialOccupation).toBeUndefined()
  })

  test('les saisies d\'URL sont bien reprises par le calcul', () => {
    const parsed = parseCatenrFromQuery({ cat_fo_s: '1', cat_fo_i: 'cult', cat_fo_f: 'saimp' })
    const result = getCatenr(location, parsed)
    expect(result.hasData).toBe(true)
    expect(result.initialTotal).toBeCloseTo(50 * 44 / 12, 6)
  })

  test('la technologie est lue dans cat_type, le photovoltaïque par défaut', () => {
    expect(parseCatenrFromQuery({}).projectType).toBe('pv')
    expect(parseCatenrFromQuery({ cat_type: 'eolien' }).projectType).toBe('eolien')
    expect(parseCatenrFromQuery({ cat_type: 'hydrolien' }).projectType).toBe('pv')
  })

  test('les saisies éoliennes ont leurs propres codes et coexistent avec celles du PV', () => {
    const query = {
      cat_type: 'eolien',
      cat_nb: '6',
      cat_fond: '0.5',
      cat_fo_s: '3',
      cat_efs_s: '1.2',
      cat_efs_i: 'prherb',
      cat_efs_f: 'saimp'
    }
    const eolien = parseCatenrFromQuery(query)
    expect(eolien.turbineCount).toBe(6)
    expect(eolien.foundationArea).toBe(0.5)
    expect(eolien.rows['fondations-socle']).toMatchObject({
      area: 1.2,
      initialOccupation: 'prairies zones herbacées',
      finalOccupation: 'sols artificiels imperméabilisés'
    })
    // la saisie photovoltaïque reste disponible si l'on revient à cette technologie
    const pv = parseCatenrFromQuery({ ...query, cat_type: 'pv' })
    expect(pv.rows.fondations.area).toBe(3)
    expect(pv.rows['fondations-socle']).toBeUndefined()
  })

  test('renseigner le nombre d\'éoliennes suffit à considérer le formulaire modifié', () => {
    expect(parseCatenrFromQuery({ cat_type: 'eolien' }).hasModifications).toBe(false)
    expect(parseCatenrFromQuery({ cat_type: 'eolien', cat_nb: '6' }).hasModifications).toBe(true)
  })
})
