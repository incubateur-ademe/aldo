import { fichesActions, filtrerFiches, optionsFiltres } from './fiches-actions.ts'

describe('filtrerFiches', () => {
  it('renvoie toutes les fiches sans filtre', () => {
    expect(filtrerFiches(fichesActions, {})).toHaveLength(fichesActions.length)
  })

  it('combine les filtres', () => {
    const fiches = filtrerFiches(fichesActions, { secteur: 'Forêts', modalite: 'Appliquer la réglementation' })
    expect(fiches).toHaveLength(4)
    expect(fiches.every((f) => f.secteur === 'Forêts' && f.modalite === 'Appliquer la réglementation')).toBe(true)
  })

  it("retrouve une fiche par l'un de ses objectifs", () => {
    const fiches = filtrerFiches(fichesActions, { objectif: 'Protéger les stocks de carbone des terres agricoles' })
    expect(fiches).toHaveLength(5)
  })

  it('ignore les modalités vides dans les options', () => {
    expect(optionsFiltres.modalite).not.toContain('')
  })
})
