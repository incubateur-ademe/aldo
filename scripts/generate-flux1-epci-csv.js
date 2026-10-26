const fs = require('fs')
const path = require('path')
const { getAnnualFluxes } = require('../calculations/flux/index')
const { GroundTypes } = require('../calculations/constants')
const { INDICATEUR_HEADERS, getIndicateursSequestration } = require('./flux1-indicateurs')
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

function buildHeaders (pairsWithCo2e) {
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
      if (pairsWithCo2e.has(pairKey)) headers.push(`${pairKey}_tCO2e_an-1`)
    })
  })
  headers.push(...INDICATEUR_HEADERS)
  return headers
}

function csvValue (v) {
  if (v === null || v === undefined || v === '') return '""'
  const str = String(v)
  return '"' + str.replace(/"/g, '""') + '"'
}

function generate (outputPath) {
  const epcis = getEpcis()
  const total = epcis.length

  // 1er passage : colonnes tCO2e du fichier communal, complétées par les
  // paires ayant un flux non nul pour au moins un EPCI.
  const pairsWithCo2e = getPairsWithCo2eFromReference()
  console.log(`Traitement de ${total} EPCI…`)
  const results = epcis.map((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const { allFlux, fluxCo2eByGroundType, areas, total: epciTotal } = getAnnualFluxes(getCommunes({ epci }))
    Object.entries(fluxCo2eByGroundType).forEach(([from, tos]) => {
      Object.entries(tos).forEach(([to, co2e]) => {
        if (co2e) pairsWithCo2e.add(`${from}_vers_${to}`)
      })
    })
    return { fluxCo2eByGroundType, areas, epciTotal, indicateurs: getIndicateursSequestration(allFlux) }
  })
  process.stdout.write(`\r  ${total}/${total}\n`)

  // 2e passage : écriture des lignes
  const headers = buildHeaders(pairsWithCo2e)
  const lines = [headers.map((h) => '"' + h + '"').join(',')]

  epcis.forEach((epci, index) => {
    const { fluxCo2eByGroundType, areas, epciTotal, indicateurs } = results[index]
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
        if (pairsWithCo2e.has(pairKey)) {
          const co2e = fluxCo2eByGroundType[fromGt.stocksId]?.[toGt.stocksId]
          row.push(co2e ?? '')
        }
      })
    })
    row.push(...indicateurs)

    lines.push(row.map(csvValue).join(','))
  })

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} EPCI  |  Colonnes : ${headers.length}`)
}

const outputFile = process.argv[2] || path.join(process.cwd(), 'flux1-epci.csv')
generate(outputFile)
