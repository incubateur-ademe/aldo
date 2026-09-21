const { getCatenrPv } = require('./index')
const { getCommune } = require('../locations')
const { parseCatenrFromQuery } = require('../../front/handlers/shared')

// Commune de référence du ticket #134 : 03238 Saint-Hilaire (ZPC 2_1).
const location = { commune: getCommune('03238', true) }

function inputs (rows, extra = {}) {
  return { lifespan: 25, totalArea: 10, rows, ...extra }
}

describe('outil CAT\'ENR - photovoltaïque', () => {
  test('sans surface saisie, aucune donnée et des trajectoires nulles', () => {
    const result = getCatenrPv(location, inputs({}))
    expect(result.hasData).toBe(false)
    expect(result.initialTotal).toBe(0)
    expect(result.trajectories.projetProbable.every((value) => value === 0)).toBe(true)
  })

  test('état initial : stock du sol de la ZPC converti en tCO2e', () => {
    // cultures en ZPC 2_1 = 50 tC/ha dans stocks-zpc.csv, biomasse et litière nulles
    const result = getCatenrPv(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    expect(result.initialTotal).toBeCloseTo(50 * 44 / 12, 6)
    expect(result.trajectories.projetProbable[0]).toBeCloseTo(183.3333, 3)
  })

  test('imperméabilisation : perte immédiate dès l\'année 1, puis stock stable', () => {
    // flux cult_art_imp en ZPC 2_1 = -20 tC/ha, cinétique CAT'ENR = 0 (perte immédiate)
    const result = getCatenrPv(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const projet = result.trajectories.projetProbable
    expect(projet[1]).toBeCloseTo(30 * 44 / 12, 6)
    expect(projet[50]).toBeCloseTo(projet[1], 6)
  })

  test('scénario de référence : occupation inchangée, donc stock constant', () => {
    const result = getCatenrPv(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const reference = result.trajectories.referenceProbable
    expect(reference[0]).toBeCloseTo(reference[50], 6)
  })

  test('mise en herbe : stockage progressif au rythme du flux ALDO sur 20 ans', () => {
    // cult_prai en ZPC 2_1 = 0,37 tC/ha/an sur 20 ans, soit 27,1333 tCO2/ha au total.
    // La cinétique CAT'ENR est de 51,02 ans : le rythme annuel reste de 1/20e du flux.
    const result = getCatenrPv(location, inputs({
      'entre-panneaux': { area: 1, initialOccupation: 'cultures', finalOccupation: 'prairies zones herbacées' }
    }))
    const projet = result.trajectories.projetProbable
    const annualSoilFlux = 0.37 * 20 * 44 / 12 / 20
    // année 1 : rien (flux non immédiat), puis un pas par an
    expect(projet[1]).toBeCloseTo(projet[0], 6)
    expect(projet[3] - projet[2]).toBeCloseTo(annualSoilFlux, 4)
  })

  test('les surfaces en zone humide utilisent les stocks de sols humides', () => {
    const dry = getCatenrPv(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const wet = getCatenrPv(location, inputs({
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
    expect(getCatenrPv(location, inputs(rows, { totalArea: 10 })).surfaceCheck).toMatchObject({
      sum: 10,
      isValid: true,
      message: 'Surfaces : OK'
    })
    expect(getCatenrPv(location, inputs(rows, { totalArea: 12 })).surfaceCheck.isValid).toBe(false)
  })

  test('les temporalités affichées suivent la durée de vie saisie', () => {
    const result = getCatenrPv(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }, { lifespan: 30 }))
    const lifespanRow = result.stocks.find((stock) => stock.id === 'duree-de-vie')
    expect(lifespanRow.year).toBe(30)
    expect(lifespanRow.value).toBeCloseTo(result.trajectories.projetProbable[30], 6)
  })

  test('la variation compare le scénario projet au scénario de référence', () => {
    const result = getCatenrPv(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    const at20 = result.variations.find((variation) => variation.id === '20-ans')
    expect(at20.value).toBeCloseTo((30 - 50) * 44 / 12, 6)
  })

  test('scénario de référence optimiste : une prairie évolue vers la strate arborée', () => {
    const result = getCatenrPv(location, inputs({
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
    const result = getCatenrPv(location, inputs({
      'entre-panneaux': { area: 1, initialOccupation: 'cultures', finalOccupation: 'prairies zones herbacées' }
    }))
    expect(result.trajectories.projetPessimiste[1]).toBeCloseTo(30 * 44 / 12, 6)
    expect(result.trajectories.projetPessimiste[50])
      .toBeLessThan(result.trajectories.projetProbable[50])
  })

  test('la trajectoire couvre bien 51 valeurs (années 0 à 50)', () => {
    const result = getCatenrPv(location, inputs({
      fondations: { area: 1, initialOccupation: 'cultures', finalOccupation: 'sols artificiels imperméabilisés' }
    }))
    expect(result.trajectories.projetProbable).toHaveLength(51)
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
    const result = getCatenrPv(location, parsed)
    expect(result.hasData).toBe(true)
    expect(result.initialTotal).toBeCloseTo(50 * 44 / 12, 6)
  })
})
