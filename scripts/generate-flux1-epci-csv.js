const fs = require('fs')
const path = require('path')
const { getAnnualFluxes } = require('../calculations/flux/index')
const { GroundTypes } = require('../calculations/constants')
const { getCommunes } = require('../data/communes')
const { getEpcis, getEPCIBaseMeta } = require('./generate-epci-utils')

const fluxGroundTypes = GroundTypes.filter((gt) => gt.altFluxId || gt.fluxId)
const forestSubtypeIds = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']

function parseQuotedHeaders (line) {
  const matches = line.match(/"((?:[^"]|"")*)"/g) || []
  return matches.map((m) => m.slice(1, -1).replace(/""/g, '"'))
}

function getPairsWithCo2eFromReference () {
  const referencePath = path.join(__dirname, '../flux1.csv')
  const firstLine = fs.readFileSync(referencePath, 'utf8').split('\n')[0]
  const headers = parseQuotedHeaders(firstLine)
  const pairs = new Set()
  headers.forEach((header) => {
    if (!header.endsWith('_tCO2e_an-1')) return
    pairs.add(header.replace(/_tCO2e_an-1$/, ''))
  })
  return pairs
}

const PAIRS_WITH_CO2E = getPairsWithCo2eFromReference()

function buildHeaders () {
  const headers = [
    'insee', 'nom', 'epci', 'departement', 'region', 'zpc',
    'inter_region', 'groupe_ser', 'greco', 'rad_13', 'bassin_populicole',
    'population', 'flux_tCO2e_an-1'
  ]
  fluxGroundTypes.forEach((fromGt) => {
    fluxGroundTypes.forEach((toGt) => {
      if (fromGt.stocksId === toGt.stocksId) return
      if (forestSubtypeIds.includes(fromGt.stocksId) && forestSubtypeIds.includes(toGt.stocksId)) return
      const pairKey = `${fromGt.stocksId}_vers_${toGt.stocksId}`
      headers.push(`${pairKey}_surface_ha_an-1`)
      if (PAIRS_WITH_CO2E.has(pairKey)) headers.push(`${pairKey}_tCO2e_an-1`)
    })
  })
  return headers
}

function csvValue (v) {
  if (v === null || v === undefined || v === '') return '""'
  const str = String(v)
  return '"' + str.replace(/"/g, '""') + '"'
}

function generate (outputPath) {
  const headers = buildHeaders()
  const epcis = getEpcis()
  const total = epcis.length
  const lines = [headers.map((h) => '"' + h + '"').join(',')]

  console.log(`Traitement de ${total} EPCI…`)
  epcis.forEach((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const communes = getCommunes({ epci })
    const fluxResult = getAnnualFluxes(communes)
    const { fluxCo2eByGroundType, areas, total: epciTotal } = fluxResult
    const meta = getEPCIBaseMeta(epci)

    const row = [
      meta.insee, meta.nom, meta.epci, meta.departement, meta.region, meta.zpc,
      meta.inter_region, meta.groupe_ser, meta.greco, meta.rad_13, meta.bassin_populicole,
      meta.population, epciTotal ?? ''
    ]

    fluxGroundTypes.forEach((fromGt) => {
      fluxGroundTypes.forEach((toGt) => {
        if (fromGt.stocksId === toGt.stocksId) return
        if (forestSubtypeIds.includes(fromGt.stocksId) && forestSubtypeIds.includes(toGt.stocksId)) return
        const pairKey = `${fromGt.stocksId}_vers_${toGt.stocksId}`
        const surface = areas[fromGt.stocksId]?.[toGt.stocksId]?.area
        row.push(surface !== undefined && surface !== null ? surface : 0)
        if (PAIRS_WITH_CO2E.has(pairKey)) {
          const co2e = fluxCo2eByGroundType[fromGt.stocksId]?.[toGt.stocksId]
          row.push(co2e ?? '')
        }
      })
    })
    lines.push(row.map(csvValue).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} EPCI  |  Colonnes : ${headers.length}`)
}

const outputFile = process.argv[2] || path.join(process.cwd(), 'flux1-epci.csv')
generate(outputFile)
