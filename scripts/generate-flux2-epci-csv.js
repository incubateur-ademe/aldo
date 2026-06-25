const fs = require('fs')
const path = require('path')

const { GroundTypes } = require('../calculations/constants')
const {
  getFluxReferenceValues,
  cToCo2e,
  getAnnualSurfaceChange
} = require('../data/flux')
const {
  getBiomassCarbonDensity,
  getForestBiomassCarbonDensities,
  getForestAreaData
} = require('../data/stocks')
const { getEpcis, getCommunesForEpci, getEPCIBaseMeta } = require('./generate-epci-utils')

const fluxGroundTypes = GroundTypes.filter((gt) => gt.altFluxId || gt.fluxId)
const forestSubtypeIds = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']
const SOLS_ARBORES = 'sols artificiels arborés et buissonants'

function hasLitiere (fromId, toId) {
  const fromIsForet = forestSubtypeIds.includes(fromId)
  const toIsForet = forestSubtypeIds.includes(toId)
  if (fromIsForet && !toIsForet) return true
  if (!fromIsForet && toIsForet) return true
  if (fromId === SOLS_ARBORES && toId === SOLS_ARBORES) return false
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

// Accumule un échantillon (valeur unitaire d'une commune) pour une paire de
// changement. La moyenne pondérée n'utilise que les communes ayant un flux et
// une surface convertie non nuls — c'est exactement ce que fait Aldo pour
// afficher le flux unitaire à l'échelle EPCI (front/handlers/territory.js :
// moyenne de annualFluxEquivalent pondérée par la surface, après exclusion des
// entrées dont value === 0).
function addSample (acc, key, value, area) {
  let sample = acc.get(key)
  if (!sample) {
    sample = { weightedSum: 0, areaSum: 0, simpleSum: 0, count: 0 }
    acc.set(key, sample)
  }
  if (value !== 0 && area > 0) {
    sample.weightedSum += value * area
    sample.areaSum += area
  }
  sample.simpleSum += value
  sample.count += 1
}

// Calcule les flux unitaires (tCO2e/ha) à l'échelle d'un EPCI en agrégeant ses
// communes. Pour chaque paire (from, to, réservoir) on fait la moyenne des
// valeurs communales pondérée par la surface convertie, reproduisant la valeur
// affichée par Aldo. Lorsqu'aucune commune de l'EPCI n'a de changement pour la
// paire, on retombe sur une moyenne simple des valeurs unitaires communales
// (même logique de repli que replaceWithOverride dans le moteur de calcul).
function computeUnitFluxes (communes) {
  const acc = new Map()
  const excludeIds = ['haies', 'produits bois']
  const childGroundTypes = GroundTypes.filter((gt) => !gt.children && !excludeIds.includes(gt.stocksId))

  communes.forEach((commune) => {
    const location = { commune }

    const refFluxes = getFluxReferenceValues(location)
    refFluxes.forEach((f) => {
      if (!f.from || !f.to) return
      const unitValue = cToCo2e(f.annualFlux * (f.yearsForFlux || 1))
      if (unitValue === undefined || unitValue === null) return
      const area = getAnnualSurfaceChange(location, {}, f.from, f.to) || 0
      addSample(acc, `${f.from}||${f.to}||${f.reservoir}`, unitValue, area)
    })

    const areaData = getForestAreaData(location)
    forestSubtypeIds.forEach((fromId) => {
      const forestBiomassDensities = getForestBiomassCarbonDensities(location, fromId, areaData)
      const initialBiomassDensity = forestBiomassDensities.live + forestBiomassDensities.dead
      childGroundTypes.forEach((toGt) => {
        const toId = toGt.stocksId
        if (fromId === toId || forestSubtypeIds.includes(toId)) return
        const annualFlux = getBiomassCarbonDensity(location, toId) - initialBiomassDensity
        if (annualFlux === undefined || annualFlux === null) return
        const area = getAnnualSurfaceChange(location, {}, fromId, toId) || 0
        addSample(acc, `${fromId}||${toId}||biomasse`, cToCo2e(annualFlux), area)
      })
    })
  })

  const unitFluxMap = new Map()
  acc.forEach((sample, key) => {
    const value = sample.areaSum > 0
      ? sample.weightedSum / sample.areaSum
      : (sample.count ? sample.simpleSum / sample.count : null)
    if (value !== null) unitFluxMap.set(key, value)
  })
  return unitFluxMap
}

function csvValue (v) {
  if (v === null || v === undefined || v === '') return ''
  const str = String(v)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function generate (outputPath) {
  const headers = buildHeaders()
  const epcis = getEpcis()
  const total = epcis.length
  const rows = []

  console.log(`Traitement de ${total} EPCI…`)
  epcis.forEach((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const communes = getCommunesForEpci(epci)
    const unitFluxMap = computeUnitFluxes(communes)
    const meta = getEPCIBaseMeta(epci)

    const row = [
      meta.insee, meta.nom, meta.epci, meta.departement, meta.region, meta.zpc,
      meta.inter_region, meta.groupe_ser, meta.greco, meta.rad_13, meta.bassin_populicole, meta.population
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
  rows.forEach((row) => lines.push(row.map((v) => csvValue(v ?? '')).join(',')))

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${rows.length} EPCI  |  Colonnes : ${headers.length}`)
}

const outputFile = process.argv[2] || path.join(process.cwd(), 'flux2-epci.csv')
generate(outputFile)
