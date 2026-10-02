// provides an util for parsing URL options into a dictionary
const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { AgriculturalPractices } = require(path.join(rootFolder, './calculations/constants'))
const { Occupations, Projects, DEFAULT_PROJECT } = require(path.join(rootFolder, './calculations/catenr/constants'))
const { getEpci, getCommune } = require(path.join(rootFolder, './calculations/locations'))

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
  return {
    areas: areaOverrides,
    areaChanges: areaChangeOverrides,
    woodCalculation,
    agriculturalPracticesEstablishedAreas,
    fluxHaveModifications,
    stocksHaveModifications
  }
}

// Les saisies de l'outil CAT'ENR sont portées par l'URL, comme les autres
// personnalisations d'ALDO. Les paramètres sont préfixés par `cat_` et utilisent
// des codes courts (cf. calculations/catenr/constants.js) pour limiter leur longueur.
function parseCatenrFromQuery (query) {
  const number = (value) => {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  }
  const percentage = (value) => {
    const parsed = number(value)
    return parsed === undefined ? undefined : parsed / 100
  }
  const occupation = (code) => Occupations.find((o) => o.code === code)?.id

  // Les codes des lignes sont distincts d'une technologie à l'autre : les saisies
  // photovoltaïques et éoliennes peuvent donc coexister dans l'URL, seules celles
  // de la technologie sélectionnée étant lues.
  const projectType = Projects.some((p) => p.id === query.cat_type) ? query.cat_type : DEFAULT_PROJECT
  const project = Projects.find((p) => p.id === projectType)

  const rows = {}
  let hasModifications = false
  project.rows.forEach((definition) => {
    const prefix = `cat_${definition.code}_`
    const row = {
      area: number(query[prefix + 's']),
      wetlandShare: percentage(query[prefix + 'zh']),
      age: number(query[prefix + 'age']),
      biomassStock: number(query[prefix + 'bio']),
      initialOccupation: occupation(query[prefix + 'i']),
      finalOccupation: occupation(query[prefix + 'f'])
    }
    if (Object.values(row).some((value) => value !== undefined)) {
      hasModifications = true
    }
    rows[definition.id] = row
  })

  // Données descriptives du parc (nombre d'éoliennes, surface au sol des fondations) :
  // elles ne participent pas au calcul de la variation des stocks, comme dans le
  // tableur (cellules F19 et F30 de l'onglet « 2.Eolien Caractéristiques »).
  const commonFields = ['cat_duree', 'cat_surface', 'cat_nb', 'cat_fond']
  return {
    projectType,
    lifespan: number(query.cat_duree),
    totalArea: number(query.cat_surface),
    turbineCount: number(query.cat_nb),
    foundationArea: number(query.cat_fond),
    rows,
    hasModifications: hasModifications || commonFields.some((field) => query[field] !== undefined)
  }
}

async function getLocationDetail (req, res) {
  // TODO: remove option for single epci and single commune
  if (req.params.epci) {
    const epci = getEpci(req.params.epci, true)
    if (epci) return { epci }
  } else if (req.params.commune) {
    const commune = getCommune(req.params.commune, true)
    if (commune) return { commune }
  } else if (req.query.communes || req.query.epcis) {
    const location = { communes: [], epcis: [] }
    if (req.query.communes && Array.isArray(req.query.communes)) {
      location.communes = req.query.communes.map((c) => getCommune(c, true))
    }
    if (req.query.epcis && Array.isArray(req.query.epcis)) {
      location.epcis = req.query.epcis.map((c) => getEpci(c, true))
    }
    if (location.communes.length || location.epcis.length) {
      return location
    }
  }
}

module.exports = {
  parseOptionsFromQuery,
  parseCatenrFromQuery,
  getLocationDetail
}
