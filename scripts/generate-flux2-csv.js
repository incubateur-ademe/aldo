/**
 * Génère le fichier flux2 (flux unitaires par commune)
 * correspondant au fichier DATA ADEME : aldo-flux-unitaire
 *
 * Les colonnes contiennent les flux de référence unitaires (tCO2e/ha) pour chaque
 * changement d'occupation du sol selon le réservoir (sol, biomasse, litière).
 *
 * Sources :
 *  - Sol        : data/dataByCommune/flux-zpc.csv (par ZPC)
 *  - Biomasse   : data/dataByCommune/biomass-hors-forets.csv (par inter-région)
 *                 + données IGN pour la déforestation (forêt → non-forêt)
 *  - Litière    : ±9 tC/ha × 44/12 = ±33 tCO2e/ha (paires impliquant une forêt, via getFluxReferenceValues)
 *
 * Usage : node scripts/generate-flux2-csv.js [chemin-de-sortie]
 * Par défaut : flux2.csv dans le répertoire courant
 */

const fs = require('fs')
const path = require('path')

const { GroundTypes } = require('../calculations/constants')
const {
  getFluxReferenceValues,
  cToCo2e
} = require('../data/flux')
const {
  getBiomassCarbonDensity,
  getForestBiomassCarbonDensities,
  getForestAreaData
} = require('../data/stocks')

// ---------------------------------------------------------------------------
// Codes INSEE des arrondissements (exclus du fichier de référence)
// ---------------------------------------------------------------------------
const ARRONDISSEMENT_CODES = new Set([
  '75101', '75102', '75103', '75104', '75105', '75106', '75107', '75108',
  '75109', '75110', '75111', '75112', '75113', '75114', '75115', '75116',
  '75117', '75118', '75119', '75120',
  '69381', '69382', '69383', '69384', '69385', '69386', '69387', '69388', '69389',
  '13201', '13202', '13203', '13204', '13205', '13206', '13207', '13208',
  '13209', '13210', '13211', '13212', '13213', '13214', '13215', '13216'
])

// ---------------------------------------------------------------------------
// Données partagées
// ---------------------------------------------------------------------------
const communesData = require('../data/dataByCommune/communes.json')
const forestAreaRaw = require('../data/dataByCommune/surface-foret.csv.json')
const regionToInterRegion = require('../data/dataByCommune/region-to-inter-region.json')

// Préchauffage des fichiers du moteur de calcul
require('../data/dataByCommune/flux-zpc.csv.json')
require('../data/dataByCommune/biomass-hors-forets.csv.json')
require('../data/dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json')

// ---------------------------------------------------------------------------
// Index géographique par commune
// ---------------------------------------------------------------------------
const forestMetaByCommune = {}
forestAreaRaw.forEach((row) => {
  const code = String(row.INSEE_COM).padStart(5, '0')
  if (!forestMetaByCommune[code]) {
    forestMetaByCommune[code] = {
      groupe_ser: row.code_groupeser || '',
      greco: row.code_greco || '',
      rad_13: row.code_rad13 || '',
      bassin_populicole: row.code_bassin_populicole || ''
    }
  }
})

// ---------------------------------------------------------------------------
// Types de sol utilisés pour les flux
// ---------------------------------------------------------------------------
const fluxGroundTypes = GroundTypes.filter((gt) => gt.altFluxId || gt.fluxId)
const forestSubtypeIds = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']

// ---------------------------------------------------------------------------
// Construction des en-têtes (même structure que le fichier de référence DATA ADEME)
//
// Pour chaque paire (from, to) hors forêt->forêt :
//   - toujours : _sol_tCO2e_ha-1 et _biomasse_tCO2e_ha-1
//   - si la paire implique une forêt ou sols arborés : _litiere_tCO2e_ha-1
//
// Les paires suivantes ont une colonne litière dans la référence DATA ADEME
// (légèrement différent de getForestLitterFlux actuel) :
//   - non-forêt → forêt (hors sols_arborés et sols_imperméabilisés en from)
//   - sols_imperméabilisés → forêt
//   - sols_arborés → forêt
//   - forêt → non-forêt (y compris forêt → sols_arborés)
// ---------------------------------------------------------------------------
const SOLS_ARBORÉS = 'sols artificiels arborés et buissonants'
const SOLS_IMP = 'sols artificiels imperméabilisés'

function hasLitiere (fromId, toId) {
  const fromIsForet = forestSubtypeIds.includes(fromId)
  const toIsForet = forestSubtypeIds.includes(toId)
  const fromIsSolsArb = fromId === SOLS_ARBORÉS
  const fromIsSolsImp = fromId === SOLS_IMP
  const toIsSolsArb = toId === SOLS_ARBORÉS

  // forêt → non-forêt (y compris sols arborés)
  if (fromIsForet && !toIsForet) return true
  // non-forêt (incl. sols_arb et sols_imp) → forêt
  if (!fromIsForet && toIsForet) return true
  // sols arborés → forêt (déjà couvert ci-dessus)
  // non-forêt → sols_arborés uniquement si from est sols_arb ou sols_imp
  if ((fromIsSolsArb || fromIsSolsImp) && toIsSolsArb) return false // pas dans ref
  return false
}

function buildHeaders () {
  const headers = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole', 'population'
  ]
  fluxGroundTypes.forEach((fromGt) => {
    fluxGroundTypes.forEach((toGt) => {
      const fromId = fromGt.stocksId
      const toId = toGt.stocksId
      if (fromId === toId) return
      if (forestSubtypeIds.includes(fromId) && forestSubtypeIds.includes(toId)) return
      const pairKey = `${fromId}_vers_${toId}`
      headers.push(`${pairKey}_sol_tCO2e_ha-1`)
      headers.push(`${pairKey}_biomasse_tCO2e_ha-1`)
      if (hasLitiere(fromId, toId)) {
        headers.push(`${pairKey}_litiere_tCO2e_ha-1`)
      }
    })
  })
  return headers
}

// ---------------------------------------------------------------------------
// Calcul des flux unitaires pour une commune
// Retourne un Map : "{from}||{to}||{reservoir}" → valeur tCO2e/ha
// ---------------------------------------------------------------------------
function computeUnitFluxes (location) {
  const unitFluxMap = new Map()

  // --- Sol, biomasse (non-forêt), litière via getFluxReferenceValues ---
  const refFluxes = getFluxReferenceValues(location)
  refFluxes.forEach((f) => {
    if (!f.from || !f.to) return // forêt biomasse growth (pas de "from")
    const key = `${f.from}||${f.to}||${f.reservoir}`
    const unitValue = cToCo2e(f.annualFlux * (f.yearsForFlux || 1))
    if (unitValue !== undefined && unitValue !== null) {
      unitFluxMap.set(key, unitValue)
    }
  })

  // --- Biomasse déforestation (forêt → non-forêt) via données IGN ---
  const areaData = getForestAreaData(location)
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes.filter((gt) => !gt.children && !excludeIds.includes(gt.stocksId))

  forestSubtypeIds.forEach((fromId) => {
    const forestBiomassDensities = getForestBiomassCarbonDensities(location, fromId, areaData)
    const initialBiomassDensity = forestBiomassDensities.live + forestBiomassDensities.dead

    childGroundTypes.forEach((toGt) => {
      const toId = toGt.stocksId
      if (fromId === toId || forestSubtypeIds.includes(toId)) return

      const annualFlux = getBiomassCarbonDensity(location, toId) - initialBiomassDensity
      if (annualFlux !== undefined && annualFlux !== null) {
        unitFluxMap.set(`${fromId}||${toId}||biomasse`, cToCo2e(annualFlux))
      }
    })
  })

  return unitFluxMap
}

// ---------------------------------------------------------------------------
// Formatage CSV
// ---------------------------------------------------------------------------
function csvValue (v) {
  if (v === null || v === undefined || v === '') return ''
  const str = String(v)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// ---------------------------------------------------------------------------
// Génération principale
// ---------------------------------------------------------------------------
function generate (outputPath) {
  const headers = buildHeaders()
  const communes = Object.values(communesData).filter(
    (c) => !ARRONDISSEMENT_CODES.has(String(c.insee).padStart(5, '0'))
  )
  const total = communes.length

  console.log(`Traitement de ${total} communes…`)
  const rows = [] // tableau de tableaux (valeurs brutes)

  communes.forEach((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }

    const location = { commune }
    let unitFluxMap
    try {
      unitFluxMap = computeUnitFluxes(location)
    } catch (err) {
      console.warn(`\nErreur pour commune ${commune.insee}: ${err.message}`)
      unitFluxMap = new Map()
    }

    const inseeCode = String(commune.insee).padStart(5, '0')
    const forestMeta = forestMetaByCommune[inseeCode] || {}
    const interRegion = regionToInterRegion[String(commune.region)]?.interRegion || ''

    const row = [
      inseeCode,
      commune.nom,
      commune.epci || '',
      commune.departement || '',
      commune.region || '',
      commune.zpc || '',
      interRegion,
      forestMeta.groupe_ser,
      forestMeta.greco,
      forestMeta.rad_13,
      forestMeta.bassin_populicole,
      commune.population || 0
    ]

    fluxGroundTypes.forEach((fromGt) => {
      fluxGroundTypes.forEach((toGt) => {
        const fromId = fromGt.stocksId
        const toId = toGt.stocksId
        if (fromId === toId) return
        if (forestSubtypeIds.includes(fromId) && forestSubtypeIds.includes(toId)) return

        row.push(unitFluxMap.get(`${fromId}||${toId}||sol`) ?? '')
        row.push(unitFluxMap.get(`${fromId}||${toId}||biomasse`) ?? '')
        if (hasLitiere(fromId, toId)) {
          row.push(unitFluxMap.get(`${fromId}||${toId}||litière`) ?? '')
        }
      })
    })

    rows.push(row)
  })

  process.stdout.write(`\r  ${total}/${total}\n`)

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(row.map((v) => csvValue(v ?? '')).join(','))
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${rows.length} communes  |  Colonnes : ${headers.length}`)
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
const outputFile = process.argv[2] || path.join(process.cwd(), 'flux2.csv')
generate(outputFile)
