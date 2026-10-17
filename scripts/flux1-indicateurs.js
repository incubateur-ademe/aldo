// Indicateurs de séquestration nette ajoutés au fichier flux1 (cf. issue #192).
// Le flux total (flux_tCO2e_an-1) est la somme de ces trois indicateurs.

const AGRICULTURAL_GROUND_TYPES = [
  'cultures',
  'prairies zones arborées',
  'prairies zones herbacées',
  'prairies zones arbustives',
  'vergers',
  'vignes'
]

const INDICATEUR_HEADERS = [
  'sequestration_foret_et_produits_bois_tCO2e_an-1',
  'sequestration_terres_agricoles_et_prairies_tCO2e_an-1',
  'sequestration_autres_sols_tCO2e_an-1'
]

// Répartit les flux selon le type de sol d'arrivée :
//  - forêt et produits bois : conversions vers forêt + accroissement biologique
//    forêt + produits bois (récolte)
//  - terres agricoles et prairies : conversions vers cultures, prairies, vergers, vignes
//  - autres sols : toutes les autres conversions (zones humides, sols artificiels)
function getIndicateursSequestration (allFlux) {
  let forest = 0
  let agricultural = 0
  let other = 0
  allFlux.forEach((flux) => {
    const co2e = flux.co2e || 0
    if (flux.to.startsWith('forêt ') || flux.to === 'produits bois') {
      forest += co2e
    } else if (AGRICULTURAL_GROUND_TYPES.includes(flux.to)) {
      agricultural += co2e
    } else {
      other += co2e
    }
  })
  return [forest, agricultural, other]
}

module.exports = {
  INDICATEUR_HEADERS,
  getIndicateursSequestration
}
