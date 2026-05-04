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

function computeUnitFluxes (location) {
  const unitFluxMap = new Map()
  const refFluxes = getFluxReferenceValues(location)
  refFluxes.forEach((f) => {
    if (!f.from || !f.to) return
    const key = `${f.from}||${f.to}||${f.reservoir}`
    const unitValue = cToCo2e(f.annualFlux * (f.yearsForFlux || 1))
    if (unitValue !== undefined && unitValue !== null) {
      unitFluxMap.set(key, unitValue)
    }
  })

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
    const location = { epci, commune: communes[0] }
    const unitFluxMap = computeUnitFluxes(location)
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

  const metaCols = 12
  const emptyCols = new Set()
  for (let c = metaCols; c < headers.length; c++) {
    let allEmpty = true
    for (const row of rows) {
      if (row[c] !== '' && row[c] !== undefined && row[c] !== null) {
        allEmpty = false
        break
      }
    }
    if (allEmpty) emptyCols.add(c)
  }

  const keepIndices = []
  for (let c = 0; c < headers.length; c++) if (!emptyCols.has(c)) keepIndices.push(c)
  const lines = [keepIndices.map((c) => headers[c]).join(',')]
  rows.forEach((row) => lines.push(keepIndices.map((c) => csvValue(row[c] ?? '')).join(',')))

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${rows.length} EPCI  |  Colonnes : ${keepIndices.length}`)
}

const outputFile = process.argv[2] || path.join(process.cwd(), 'flux2-epci.csv')
generate(outputFile)
