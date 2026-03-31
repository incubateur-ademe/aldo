/**
 * Génère le fichier flux3 (accroissement biomasse forêt + produits bois)
 * correspondant au fichier DATA ADEME :
 *   aldo-flux-annuels-lies-a-laccroissement-net-de-la-biomasse-en-forets
 *
 * Pour chaque commune, par type forestier (mixte, feuillu, conifère, peupleraie) :
 *   - surface (ha)
 *   - accroissement biologique unitaire (m3 BFT/ha/an)
 *   - mortalité biologique unitaire (m3 BFT/ha/an)
 *   - prélèvements de bois unitaires (m3 BFT/ha/an)
 *   - bilan total unitaire (m3 BFT/ha/an)
 *   - facteur de conversion (tC/m3 BFT)
 *   - flux unitaire d'accroissement (tCO2e/ha/an)
 *   - flux d'accroissement (tCO2e/an)
 * Puis les flux annuels de produits bois récolte & consommation (tCO2e/an).
 *
 * Sources :
 *  - Biomasse forêt  : data/dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv
 *  - Surfaces forêt  : data/dataByCommune/surface-foret.csv
 *  - Produits bois   : calculations/flux/woodProducts.js
 *
 * Usage : node scripts/generate-flux3-csv.js [chemin-de-sortie]
 * Par défaut : flux3.csv dans le répertoire courant
 */

const fs = require('fs')
const path = require('path')

const { getForestBiomassFluxesByCommune, cToCo2e } = require('../data/flux')
const { getFluxWoodProducts } = require('../calculations/flux/woodProducts')

// ---------------------------------------------------------------------------
// Codes INSEE des arrondissements (exclus)
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

// Préchauffage des fichiers
require('../data/dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json')
require('../data/dataByEpci/proportion-usage-bois-par-region.csv.json')

// ---------------------------------------------------------------------------
// Index géographique par commune (forêt)
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
// Types de forêt dans l'ordre de la référence DATA ADEME
// ---------------------------------------------------------------------------
const FOREST_SUBTYPES = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']

// ---------------------------------------------------------------------------
// Construction des en-têtes (structure identique à la référence)
// ---------------------------------------------------------------------------
function buildHeaders () {
  const headers = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole', 'population'
  ]
  FOREST_SUBTYPES.forEach((ft) => {
    headers.push(`${ft}_surface_ha`)
    headers.push(`${ft}_accroissement_biologique_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_mortalite_biologique_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_prelevements_de_bois_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_bilan_total_unitaire_m3_BFT_ha-1_an-1`)
    headers.push(`${ft}_facteur_de_conversion_tC_m3_BFT-1`)
    headers.push(`${ft}_accroissement_biologique_flux_unitaire_tCO2e_ha-1_an-1`)
    headers.push(`${ft}_accroissement_biologique_flux_tCO2e_an-1`)
  })
  headers.push('bo_recolte_flux_tCO2e_an-1')
  headers.push('bi_recolte_flux_tCO2e_an-1')
  headers.push('total_recolte_flux_tCO2e_an-1')
  headers.push('bo_consommation_flux_tCO2e_an-1')
  headers.push('bi_consommation_flux_tCO2e_an-1')
  headers.push('total_consommation_flux_tCO2e_an-1')
  return headers
}

// ---------------------------------------------------------------------------
// Agrégation des données biomasse forêt pour une commune
//
// getForestBiomassFluxesByCommune peut retourner plusieurs lignes par
// type forestier (une par zone IGN d'appartenance). On effectue une
// moyenne pondérée par surface pour obtenir des valeurs unitaires.
// ---------------------------------------------------------------------------
function aggregateForestBiomass (location) {
  const rows = getForestBiomassFluxesByCommune(location)
  const result = {}
  FOREST_SUBTYPES.forEach((ft) => {
    const typeRows = rows.filter((r) => r.to === ft)
    const totalArea = typeRows.reduce((s, r) => s + r.area, 0)
    if (totalArea === 0 || typeRows.length === 0) {
      result[ft] = {
        surface: 0,
        growth: 0,
        mortality: 0,
        timber: 0,
        bilan: 0,
        conv: 0,
        fluxUnitaireTCO2e: 0,
        fluxTotalTCO2e: 0
      }
      return
    }
    const w = (field) => typeRows.reduce((s, r) => s + r[field] * r.area, 0) / totalArea

    const weightedAnnualFlux = w('annualFlux')
    const fluxUnitaireTCO2e = cToCo2e(weightedAnnualFlux)
    const fluxTotalTCO2e = typeRows.reduce((s, r) => s + r.annualFluxEquivalent * r.area, 0)

    result[ft] = {
      surface: totalArea,
      growth: w('growth'),
      mortality: w('mortality'),
      timber: w('timberExtraction'),
      bilan: w('fluxMeterCubed'),
      conv: w('conversionFactor'),
      fluxUnitaireTCO2e,
      fluxTotalTCO2e
    }
  })
  return result
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
  const lines = [headers.join(',')]

  communes.forEach((commune, index) => {
    if (index % 500 === 0) {
      process.stdout.write(`\r  ${index}/${total}`)
    }

    const location = { commune }
    const inseeCode = String(commune.insee).padStart(5, '0')
    const forestMeta = forestMetaByCommune[inseeCode] || {}
    const interRegion = regionToInterRegion[String(commune.region)]?.interRegion || ''

    // --- Biomasse forêt ---
    let forestBiomass
    try {
      forestBiomass = aggregateForestBiomass(location)
    } catch (err) {
      console.warn(`\nErreur biomasse pour ${inseeCode}: ${err.message}`)
      forestBiomass = Object.fromEntries(FOREST_SUBTYPES.map((ft) => [ft, {
        surface: 0, growth: 0, mortality: 0, timber: 0,
        bilan: 0, conv: 0, fluxUnitaireTCO2e: 0, fluxTotalTCO2e: 0
      }]))
    }

    // --- Produits bois ---
    let boRecolte = 0; let biRecolte = 0
    let boConsom = 0; let biConsom = 0
    try {
      const recolte = getFluxWoodProducts(location)
      boRecolte = recolte.find((r) => r.category === 'bo')?.co2e ?? 0
      biRecolte = recolte.find((r) => r.category === 'bi')?.co2e ?? 0
      const consom = getFluxWoodProducts(location, 'consommation')
      boConsom = consom.find((r) => r.category === 'bo')?.co2e ?? 0
      biConsom = consom.find((r) => r.category === 'bi')?.co2e ?? 0
    } catch (err) {
      console.warn(`\nErreur produits bois pour ${inseeCode}: ${err.message}`)
    }

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

    FOREST_SUBTYPES.forEach((ft) => {
      const d = forestBiomass[ft]
      row.push(d.surface)
      row.push(d.growth)
      row.push(d.mortality)
      row.push(d.timber)
      row.push(d.bilan)
      row.push(d.conv)
      row.push(d.fluxUnitaireTCO2e)
      row.push(d.fluxTotalTCO2e)
    })

    row.push(boRecolte)
    row.push(biRecolte)
    row.push(boRecolte + biRecolte)
    row.push(boConsom)
    row.push(biConsom)
    row.push(boConsom + biConsom)

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
const outputFile = process.argv[2] || path.join(process.cwd(), 'flux3.csv')
generate(outputFile)
