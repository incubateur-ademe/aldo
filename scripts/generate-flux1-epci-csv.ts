import fs from 'node:fs'
import path from 'node:path'
import { getAnnualFluxes } from '../calculations/flux/index.ts'
import { getCommunes } from '../data/communes.ts'
import { getEpcis, getEPCIBaseMeta, epciMetaRow } from './generate-epci-utils.ts'
import { buildFlux1Headers, flux1Columns, flux1Result } from './generate-flux1-csv.ts'
import { csvValue } from './shared.ts'

function parseQuotedHeaders (line: string) {
  const matches = line.match(/"((?:[^"]|"")*)"/g) || []
  return matches.map((m) => m.slice(1, -1).replace(/""/g, '"'))
}

// Les paires avec colonne tCO2e sont lues dans le fichier flux1.csv déjà généré
function getPairsWithCo2eFromReference (referencePath: string) {
  const firstLine = fs.readFileSync(referencePath, 'utf8').split('\n')[0] ?? ''
  const headers = parseQuotedHeaders(firstLine)
  const pairs = new Set<string>()
  headers.forEach((header) => {
    if (!header.endsWith('_tCO2e_an-1')) return
    pairs.add(header.replace(/_tCO2e_an-1$/, ''))
  })
  return pairs
}

function generate (outputPath: string, referencePath: string) {
  const epcis = getEpcis()
  const total = epcis.length

  // 1er passage : colonnes tCO2e du fichier communal, complétées par les
  // paires ayant un flux non nul pour au moins un EPCI.
  const pairsWithCo2e = getPairsWithCo2eFromReference(referencePath)
  console.log(`Traitement de ${total} EPCI…`)
  const results = epcis.map((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    return flux1Result(getAnnualFluxes(getCommunes({ epci })), pairsWithCo2e)
  })
  process.stdout.write(`\r  ${total}/${total}\n`)

  // 2e passage : écriture des lignes
  const headers = buildFlux1Headers(pairsWithCo2e)
  const lines = [headers.map((h) => '"' + h + '"').join(',')]
  epcis.forEach((epci, index) => {
    const row = [
      ...epciMetaRow(getEPCIBaseMeta(epci)),
      ...flux1Columns(results[index]!, pairsWithCo2e)
    ]
    lines.push(row.map((v) => csvValue(v, true)).join(','))
  })

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} EPCI  |  Colonnes : ${headers.length}`)
}

// Usage : node scripts/generate-flux1-epci-csv.ts [chemin-de-sortie] [chemin-flux1.csv]
generate(
  process.argv[2] || path.join(process.cwd(), 'flux1-epci.csv'),
  process.argv[3] || path.join(process.cwd(), 'flux1.csv')
)
