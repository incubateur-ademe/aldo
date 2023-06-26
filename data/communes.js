const communesData = require('./dataByCommune/communes.json')
const zpcByCommune = require('./dataByCommune/zpc.csv.json')
const { getAnnualSurfaceChangeFromData } = require('./flux')
const { getAreaFromData } = require('./stocks')
const { GroundTypes } = require('../calculations/constants')

function getCommunes (location) {
  // handle the location options
  const epcis = location.epcis || []
  if (location.epci) epcis.push(location.epci)
  const epciCommuneCodes = []
  epcis.forEach((epci) => epciCommuneCodes.push(...epci.communes))
  const allCommunes = []
  addCommunesIfUnique(allCommunes, epciCommuneCodes)

  const remainingCommunes = location.communes || []
  if (location.commune) remainingCommunes.push(location.commune)
  addCommunesIfUnique(allCommunes, remainingCommunes)

  addArrondissements(allCommunes)

  return allCommunes
}

function addCommunesIfUnique (communes, communesToAdd) {
  communesToAdd.forEach((commune) => {
    const insee = commune.insee || commune // can pass list of commune objects or insee codes
    const alreadyIncluded = communes.some((c) => c.insee === insee)
    if (!alreadyIncluded) communes.push(commune.insee ? commune : communesData[insee])
  })
}

function addArrondissements (communes) {
  let arrondissementsToAdd = []
  communes.forEach((commune) => {
    commune.zpc = zpcByCommune.find((zpcData) => zpcData.insee === commune.insee)?.zpc
    let arrondissements = COMMUNES_WITH_ARRONDISSEMENTS[commune.insee]
    if (arrondissements) {
      arrondissements = arrondissements.map((aInsee) => communesData[aInsee])
      arrondissementsToAdd = arrondissementsToAdd.concat(arrondissements)
    }
  })
  arrondissementsToAdd.forEach((a) => communes.push(a))
}

// adds data about:
// - arrondissements
// - ZPC
function completeData (communes) {
  let arrondissementsToAdd = []
  communes.forEach((commune) => {
    commune.zpc = zpcByCommune.find((zpcData) => zpcData.insee === commune.insee)?.zpc
    let arrondissements = COMMUNES_WITH_ARRONDISSEMENTS[commune.insee]
    if (arrondissements) {
      // TODO: reassess if EPCI is requried if move biomass region to here too
      arrondissements = arrondissements.map((aInsee) => {
        return { insee: aInsee, zpc: commune.zpc, epci: commune.epci }
      })
      arrondissementsToAdd = arrondissementsToAdd.concat(arrondissements)
    }
  })
  const allCommunes = communes.concat(arrondissementsToAdd)
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes
    .filter((gt) => !gt.children && !excludeIds.includes(gt.stocksId))
  allCommunes.forEach((commune) => {
    const changes = {}
    const clc18 = {}
    childGroundTypes.forEach((fromGt) => {
      changes[fromGt.stocksId] = {}
      clc18[fromGt.stocksId] = getAreaFromData({ commune }, fromGt.stocksId)
      childGroundTypes.forEach((toGt) => {
        if (fromGt.stocksId === toGt.stocksId) return
        const area = getAnnualSurfaceChangeFromData({ commune }, fromGt.stocksId, toGt.stocksId)
        if (area) changes[fromGt.stocksId][toGt.stocksId] = area
      })
    })
    commune.changes = changes
    commune.clc18 = clc18
  })
  return allCommunes
}

// some communes have arrondissements which are administratively communes but will be referred to as arrondissements in this code.
// We want the user to be able to select communes, not arrondissements. In general, the UI should only show communes.
// The data, however, is at mixed levels.
// CLC 18 and forest area data is at arrondissement level.
// ZPC is at commune level.
const COMMUNES_WITH_ARRONDISSEMENTS = {
  // Lyon
  69123: [
    '69381', '69382', '69383', '69384', '69385', '69386',
    '69387', '69388', '69389'
  ],
  // Marseille
  13055: [
    '13201', '13202', '13203', '13204', '13205', '13206',
    '13207', '13208', '13209', '13210',
    '13211', '13212', '13213', '13214', '13215', '13216'
  ],
  // Paris
  75056: [
    '75101', '75102', '75103', '75104', '75105', '75106',
    '75107', '75108', '75109', '75110',
    '75111', '75112', '75113', '75114', '75115', '75116',
    '75117', '75118', '75119', '75120'
  ]
}

module.exports = {
  getCommunes,
  completeData
}
