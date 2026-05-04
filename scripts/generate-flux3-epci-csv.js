const fs = require('fs')
const path = require('path')

const { getForestBiomassFluxesByCommune, cToCo2e } = require('../data/flux')
const { getFluxWoodProducts } = require('../calculations/flux/woodProducts')
const { getEpcis, getEPCIBaseMeta } = require('./generate-epci-utils')

const FOREST_SUBTYPES = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']

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
    if (ft === 'forêt peupleraie') {
      headers.push(`${ft}_aflux_total_unitaire_tCO2e_ha-1_an-1`)
    } else {
      headers.push(`${ft}_flux_total_unitaire_tCO2e_ha-1_an-1`)
    }
    headers.push(`${ft}_flux_tCO2e_an-1`)
  })
  headers.push('bo_recolte_flux_tCO2e_an-1')
  headers.push('bi_recolte_flux_tCO2e_an-1')
  headers.push('total_recolte_flux_tCO2e_an-1')
  headers.push('bo_consommation_flux_tCO2e_an-1')
  headers.push('bi_consommation_flux_tCO2e_an-1')
  headers.push('total_consommation_flux_tCO2e_an-1')
  return headers
}

function aggregateForestBiomass (location) {
  const rows = getForestBiomassFluxesByCommune(location)
  const result = {}
  FOREST_SUBTYPES.forEach((ft) => {
    const typeRows = rows.filter((r) => r.to === ft)
    const totalArea = typeRows.reduce((s, r) => s + r.area, 0)
    if (totalArea === 0 || typeRows.length === 0) {
      result[ft] = { surface: 0, growth: 0, mortality: 0, timber: 0, bilan: 0, conv: 0, fluxUnitaireTCO2e: 0, fluxTotalTCO2e: 0 }
      return
    }
    const w = (field) => typeRows.reduce((s, r) => s + r[field] * r.area, 0) / totalArea
    const weightedAnnualFlux = w('annualFlux')
    result[ft] = {
      surface: totalArea,
      growth: w('growth'),
      mortality: w('mortality'),
      timber: w('timberExtraction'),
      bilan: w('fluxMeterCubed'),
      conv: w('conversionFactor'),
      fluxUnitaireTCO2e: cToCo2e(weightedAnnualFlux),
      fluxTotalTCO2e: typeRows.reduce((s, r) => s + r.annualFluxEquivalent * r.area, 0)
    }
  })
  return result
}

function csvValue (v) {
  if (v === null || v === undefined || v === '') return ''
  const str = String(v)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"'
  return str
}

function generate (outputPath) {
  const headers = buildHeaders()
  const epcis = getEpcis()
  const lines = [headers.join(',')]
  const total = epcis.length
  console.log(`Traitement de ${total} EPCI…`)

  epcis.forEach((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const location = { epci }
    const meta = getEPCIBaseMeta(epci)
    const forestBiomass = aggregateForestBiomass(location)

    const recolte = getFluxWoodProducts(location)
    const consom = getFluxWoodProducts(location, 'consommation')
    const boRecolte = recolte.find((r) => r.category === 'bo')?.co2e ?? 0
    const biRecolte = recolte.find((r) => r.category === 'bi')?.co2e ?? 0
    const boConsom = consom.find((r) => r.category === 'bo')?.co2e ?? 0
    const biConsom = consom.find((r) => r.category === 'bi')?.co2e ?? 0

    const row = [
      meta.insee, meta.nom, meta.epci, meta.departement, meta.region, meta.zpc,
      meta.inter_region, meta.groupe_ser, meta.greco, meta.rad_13, meta.bassin_populicole, meta.population
    ]
    FOREST_SUBTYPES.forEach((ft) => {
      const d = forestBiomass[ft]
      row.push(d.surface, d.growth, d.mortality, d.timber, d.bilan, d.conv, d.fluxUnitaireTCO2e, d.fluxTotalTCO2e)
    })
    row.push(boRecolte, biRecolte, boRecolte + biRecolte, boConsom, biConsom, boConsom + biConsom)
    lines.push(row.map(csvValue).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} EPCI  |  Colonnes : ${headers.length}`)
}

const outputFile = process.argv[2] || path.join(process.cwd(), 'flux3-epci.csv')
generate(outputFile)
