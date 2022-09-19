// provides an util for parsing URL options into a dictionary
const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { AgriculturalPractices } = require(path.join(rootFolder, './calculations/constants'))

function parseOptionsFromQuery (query) {
  // check request to determine if any area overrides have been specified for stocks and flux
  let stocksHaveModifications = false
  let fluxHaveModifications = false
  const areaOverrides = {}
  Object.keys(query).filter(key => key.startsWith('surface_')).forEach(key => {
    const groundType = key.split('surface_')[1].replace(/_/g, ' ')
    areaOverrides[groundType] = parseFloat(query[key])
    if (!isNaN(areaOverrides[groundType])) {
      stocksHaveModifications = true
    }
  })
  const areaChangeOverrides = {}
  Object.keys(query).filter(key => key.startsWith('change_')).forEach(key => {
    const groundType = key.split('change_')[1]
    areaChangeOverrides[groundType] = parseFloat(query[key])
    if (!isNaN(areaChangeOverrides[groundType])) {
      fluxHaveModifications = true
    }
  })
  // check if there are agricultural practices area additions
  const agriculturalPracticesEstablishedAreas = {}
  Object.keys(query).filter(key => key.startsWith('ap_')).forEach(key => {
    const practice = key.split('ap_')[1]
    const id = AgriculturalPractices.find(ap => ap.url === practice)?.id
    agriculturalPracticesEstablishedAreas[id] = parseFloat(query[key])
    if (!isNaN(agriculturalPracticesEstablishedAreas[practice])) {
      fluxHaveModifications = true
    }
  })

  // prepare configuration to be passed to stocks and flux fetching
  const woodCalculation = query['répartition_produits_bois'] || 'récolte'
  let proportionSolsImpermeables = query['répartition_art_imp'] || 80
  proportionSolsImpermeables = proportionSolsImpermeables ? (proportionSolsImpermeables / 100).toPrecision(2) : undefined
  return {
    areas: areaOverrides,
    areaChanges: areaChangeOverrides,
    woodCalculation,
    proportionSolsImpermeables,
    agriculturalPracticesEstablishedAreas,
    fluxHaveModifications,
    stocksHaveModifications
  }
}

module.exports = {
  parseOptionsFromQuery
}
