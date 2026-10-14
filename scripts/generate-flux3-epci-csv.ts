import fs from 'node:fs'
import path from 'node:path'

import { getEpcis, getEPCIBaseMeta, epciMetaRow } from './generate-epci-utils.ts'
import { aggregateForestBiomass, buildFlux3Headers, forestColumns, woodColumns } from './generate-flux3-csv.ts'
import { csvValue } from './shared.ts'

function generate (outputPath: string) {
  const headers = buildFlux3Headers()
  const epcis = getEpcis()
  const lines = [headers.join(',')]
  const total = epcis.length
  console.log(`Traitement de ${total} EPCI…`)

  epcis.forEach((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const location = { epci }
    const meta = getEPCIBaseMeta(epci)
    const forestBiomass = aggregateForestBiomass(location)
    const row = [...epciMetaRow(meta), ...forestColumns(forestBiomass), ...woodColumns(location)]
    lines.push(row.map((v) => csvValue(v)).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} EPCI  |  Colonnes : ${headers.length}`)
}

generate(process.argv[2] || path.join(process.cwd(), 'flux3-epci.csv'))
