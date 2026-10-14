import fs from 'node:fs'
import path from 'node:path'

import { getStocks } from '../calculations/stocks/index.ts'
import { getAnnualWoodProductsHarvest } from '../data/stocks.ts'
import { getPopulationTotal } from '../data/index.ts'
import { getCommunes } from '../data/communes.ts'
import { getEpcis, getEPCIBaseMeta, epciMetaRow } from './generate-epci-utils.ts'
import { buildStocksHeaders, stocksColumns } from './generate-stocks-csv.ts'
import { csvValue } from './shared.ts'

const FRANCE_POPULATION = getPopulationTotal()

function generate (outputPath: string) {
  const headers = buildStocksHeaders()
  const epcis = getEpcis()
  const total = epcis.length
  const lines = [headers.join(',')]

  console.log(`Traitement de ${total} EPCI…`)
  epcis.forEach((epci, index) => {
    if (index % 100 === 0) process.stdout.write(`\r  ${index}/${total}`)
    const meta = getEPCIBaseMeta(epci)
    const population = meta.population || 0
    const ratioPopFrance = population / FRANCE_POPULATION
    const communes = getCommunes({ epci })
    const stocks = getStocks(communes, {})
    const woodHarvest = getAnnualWoodProductsHarvest({ epci })

    const row = [
      ...epciMetaRow(meta),
      ...stocksColumns(stocks, woodHarvest, ratioPopFrance)
    ]
    lines.push(row.map((v) => csvValue(v)).join(','))
  })

  process.stdout.write(`\r  ${total}/${total}\n`)
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`Fichier généré : ${outputPath}`)
  console.log(`Lignes : ${lines.length - 1} EPCI  |  Colonnes : ${headers.length}`)
}

generate(process.argv[2] || path.join(process.cwd(), 'stocks-epci.csv'))
