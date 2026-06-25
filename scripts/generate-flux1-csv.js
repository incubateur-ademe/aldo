/**
 * Génère le fichier flux1 (changements de surfaces et flux de carbone par commune)
 * correspondant au fichier DATA ADEME : aldo-flux-total-et-surfaces-converties.csv
 *
 * Usage : node scripts/generate-flux1-csv.js [chemin-de-sortie]
 * Par défaut le fichier est écrit dans le répertoire courant : flux1.csv
 */

const fs = require('fs')
const path = require('path')
const { getAnnualFluxes } = require('../calculations/flux/index')
const { GroundTypes } = require('../calculations/constants')

// ---------------------------------------------------------------------------
// Codes INSEE des arrondissements (non présents dans le fichier de référence)
// ---------------------------------------------------------------------------
const ARRONDISSEMENT_CODES = new Set([
  // Paris
  '75101', '75102', '75103', '75104', '75105', '75106', '75107', '75108',
  '75109', '75110', '75111', '75112', '75113', '75114', '75115', '75116',
  '75117', '75118', '75119', '75120',
  // Lyon
  '69381', '69382', '69383', '69384', '69385', '69386', '69387', '69388', '69389',
  // Marseille
  '13201', '13202', '13203', '13204', '13205', '13206', '13207', '13208',
  '13209', '13210', '13211', '13212', '13213', '13214', '13215', '13216'
])

// ---------------------------------------------------------------------------
// Données partagées (chargées une seule fois grâce au cache require)
// ---------------------------------------------------------------------------
const communesData = require('../data/dataByCommune/communes.json')
const forestAreaRaw = require('../data/dataByCommune/surface-foret.csv.json')
const regionToInterRegion = require('../data/dataByCommune/region-to-inter-region.json')

// Préchauffage des autres fichiers référencés par le moteur de calcul
require('../data/dataByCommune/flux-zpc.csv.json')
require('../data/dataByCommune/biomass-hors-forets.csv.json')
require('../data/dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json')

// ---------------------------------------------------------------------------
// Index de la géolocalisation forestière par commune (code INSEE sans leading 0)
// Quand une commune a plusieurs lignes (plusieurs SER), on prend la 1ère.
// ---------------------------------------------------------------------------
const forestMetaByCommune = {}
forestAreaRaw.forEach((row) => {
  // INSEE_COM dans surface-foret peut être sans zéro initial
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
// Types de sol utilisés pour les flux (même logique que l'export Excel)
// Ordre identique à la référence DATA ADEME
// ---------------------------------------------------------------------------
const fluxGroundTypes = GroundTypes.filter((gt) => gt.altFluxId || gt.fluxId)

// Paires de types de sol présentes dans le fichier de référence
// (les 12 paires forêt-vers-forêt sont absentes car traitées via la biomasse)
const forestSubtypeIds = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']


// ---------------------------------------------------------------------------
// Construction des en-têtes CSV
// ---------------------------------------------------------------------------
function buildHeaders () {
  const headers = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole',
    'population', 'flux_tCO2e_an-1'
  ]
  fluxGroundTypes.forEach((fromGt) => {
    fluxGroundTypes.forEach((toGt) => {
      if (fromGt.stocksId === toGt.stocksId) return
      // Sauter les paires forêt -> forêt (absentes du fichier de référence)
      if (forestSubtypeIds.includes(fromGt.stocksId) && forestSubtypeIds.includes(toGt.stocksId)) return
      const pairKey = `${fromGt.stocksId}_vers_${toGt.stocksId}`
      headers.push(`${pairKey}_surface_ha_an-1`)
      headers.push(`${pairKey}_tCO2e_an-1`)
    })
  })
  return headers
}

// ---------------------------------------------------------------------------
// Formatage d'une valeur CSV (QUOTE_ALL : toutes les valeurs entre guillemets)
// Le fichier de référence DATA ADEME utilise ce format.
// ---------------------------------------------------------------------------
function csvValue (v) {
  if (v === null || v === undefined || v === '') return '""'
  const str = String(v)
  return '"' + str.replace(/"/g, '""') + '"'
}

// ---------------------------------------------------------------------------
// Génération principale
// ---------------------------------------------------------------------------
function generate (outputPath) {
  const headers = buildHeaders()
  const communes = Object.values(communesData).filter((c) => !ARRONDISSEMENT_CODES.has(String(c.insee).padStart(5, '0')))
  const total = communes.length

  console.log(`Traitement de ${total} communes…`)

  const lines = [headers.map((h) => '"' + h + '"').join(',')]

  communes.forEach((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }

    // ------------------------------------------------------------------
    // Calcul des flux pour cette commune
    // ------------------------------------------------------------------
    let fluxResult
    try {
      fluxResult = getAnnualFluxes([commune])
    } catch (err) {
      console.warn(`\nErreur pour commune ${commune.insee}: ${err.message}`)
      fluxResult = { fluxCo2eByGroundType: {}, areas: {}, total: 0 }
    }

    const { fluxCo2eByGroundType, areas, total: communeTotal } = fluxResult

    // ------------------------------------------------------------------
    // Métadonnées géographiques
    // ------------------------------------------------------------------
    const inseeCode = String(commune.insee).padStart(5, '0')
    const forestMeta = forestMetaByCommune[inseeCode] || {}
    const interRegion = regionToInterRegion[String(commune.region)]?.interRegion || ''

    // ------------------------------------------------------------------
    // Construction de la ligne
    // ------------------------------------------------------------------
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
      commune.population || 0,
      communeTotal ?? ''
    ]

    fluxGroundTypes.forEach((fromGt) => {
      fluxGroundTypes.forEach((toGt) => {
        if (fromGt.stocksId === toGt.stocksId) return
        if (forestSubtypeIds.includes(fromGt.stocksId) && forestSubtypeIds.includes(toGt.stocksId)) return

        const surface = areas[fromGt.stocksId]?.[toGt.stocksId]?.area
        row.push(surface !== undefined && surface !== null ? surface : 0)

        const co2e = fluxCo2eByGroundType[fromGt.stocksId]?.[toGt.stocksId]
        row.push(co2e ?? '')
      })
    })

    lines.push(row.map(csvValue).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} communes  |  Colonnes : ${headers.length}`)
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
const outputFile = process.argv[2] || path.join(process.cwd(), 'flux1.csv')
generate(outputFile)
