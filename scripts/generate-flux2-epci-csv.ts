import path from 'node:path'

import { getEpcis, getCommunesForEpci, getEPCIBaseMeta, epciMetaRow } from './generate-epci-utils.ts'
import { buildFlux2Headers, computeUnitFluxes, flux2Columns, writeWithoutEmptyColumns } from './generate-flux2-csv.ts'
import type { CsvCell } from './shared.ts'

function generate (outputPath: string) {
  const headers = buildFlux2Headers()
  const epcis = getEpcis()
  const total = epcis.length
  const rows: CsvCell[][] = []

  console.log(`Traitement de ${total} EPCI…`)
  epcis.forEach((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const communes = getCommunesForEpci(epci)
    const location = { epci, commune: communes[0] }
    const unitFluxMap = computeUnitFluxes(location)
    const meta = getEPCIBaseMeta(epci)
    rows.push([
      ...epciMetaRow(meta),
      ...flux2Columns(unitFluxMap)
    ])
  })
  process.stdout.write(`\r  ${total}/${total}\n`)
  writeWithoutEmptyColumns(outputPath, headers, rows, 'EPCI')
}

generate(process.argv[2] || path.join(process.cwd(), 'flux2-epci.csv'))
