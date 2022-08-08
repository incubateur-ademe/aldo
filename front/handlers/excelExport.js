const xl = require('excel4node')
const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { getAnnualFluxes } = require(path.join(rootFolder, './calculations/flux'))
const { GroundTypes } = require(path.join(rootFolder, './calculations/constants'))

async function excelExportHandler (req, res) {
  // prepare data
  const epci = await getEpci(req.query.epci) || {}
  if (!epci.code) {
    res.status(404)
    return
  }
  const options = {
    // areas: areaOverrides,
    // areaChanges: areaChangeOverrides,
    // woodCalculation,
    // proportionSolsImpermeables,
    // agriculturalPracticesEstablishedAreas,
    // agroforestryStock
  }
  const stocks = await getStocks({ epci }, options)
  const flux = getAnnualFluxes({ epci }, options)

  // prepare export
  const wb = new xl.Workbook()
  const ws = wb.addWorksheet('Tableau de bord')
  const borderStyle = {
    style: 'thin',
    color: 'black'
  }
  const outlinedCell = {
    left: borderStyle,
    right: borderStyle,
    top: borderStyle,
    bottom: borderStyle
  }
  const headerTextStyle = wb.createStyle({
    font: {
      bold: true
    },
    border: outlinedCell,
    alignment: {
      shrinkToFit: true
    }
  })
  const rowHeaderTextStyle = wb.createStyle({
    font: {
      bold: true
    },
    border: {
      left: borderStyle,
      right: borderStyle
    }
  })
  const number2dpStyle = wb.createStyle({
    numberFormat: '##0.00',
    border: outlinedCell
  })
  const integerStyle = wb.createStyle({
    numberFormat: '###,##0'
  })

  // easier to move around if everything is relative
  const firstColumn = 2
  const firstRow = 2
  // EPCI info block
  ws.cell(firstRow, firstColumn, undefined, firstColumn + 1, true) // B2 merged with C2
    .string('Nom de l\'EPCI')
    .style(headerTextStyle)
  ws.cell(firstRow, firstColumn + 2, undefined, firstColumn + 3, true)
    .string(epci.nom)
    .style({
      border: outlinedCell
    })
  ws.cell(firstRow + 1, firstColumn, undefined, firstColumn + 1, true) // B3
    .string('SIREN de l\'ECPI')
    .style(headerTextStyle)
  ws.cell(firstRow + 1, firstColumn + 2, undefined, firstColumn + 3, true)
    .string(epci.code)
    .style({
      border: outlinedCell
    })
  ws.cell(firstRow + 2, firstColumn, undefined, firstColumn + 1, true)
    .string('Lien')
    .style(headerTextStyle)
  ws.cell(firstRow + 2, firstColumn + 2, undefined, firstColumn + 3, true)
    .link(`https://${process.env.HOSTNAME}/territoire${req._parsedUrl.search}`, 'Outil Aldo en ligne')
    .style({
      border: outlinedCell
    })

  // Summary block
  const summaryRow = firstRow + 4
  ws.column(firstColumn + 1)
    .setWidth(19)
  ws.cell(summaryRow, firstColumn + 1)
    .string('Flux total (ktCO2e/an)')
    .style(headerTextStyle)
  ws.cell(summaryRow, firstColumn + 2)
    .number(flux?.total / 1000)
    .style(number2dpStyle)
  ws.column(firstColumn + 3)
    .setWidth(14.5)
  ws.cell(summaryRow, firstColumn + 3)
    .string('Stock total (MtC)')
    .style(headerTextStyle)
  ws.cell(summaryRow, firstColumn + 4, undefined, firstColumn + 5, true)
    .number(stocks?.total / 1000000)
    .style(number2dpStyle)

  // Table
  const tableStartRow = summaryRow + 2
  const tableStartColumn = firstColumn
  // header row
  ws.column(tableStartColumn)
    .setWidth(13)
  ws.cell(tableStartRow, tableStartColumn)
    .string('En détail :')
    .style({
      border: outlinedCell
    })
  ws.cell(tableStartRow, tableStartColumn + 1, undefined, tableStartColumn + 2, true)
    .string('Flux de carbone (tCO2e/an)')
    .style(headerTextStyle)
  ws.cell(tableStartRow, tableStartColumn + 3, undefined, tableStartColumn + 5, true)
    .string('Stock (tC)')
    .style(headerTextStyle)
  ws.column(tableStartColumn + 6)
    .setWidth(29.5)
  ws.cell(tableStartRow, tableStartColumn + 6)
    .string('Surface modifiée par l\'utilisateur ?')
    .style(headerTextStyle)

  const parentGroundTypes = GroundTypes.filter((gt) => !gt.parentType)
  parentGroundTypes.forEach((gt, idx) => {
    const groundTypeRow = tableStartRow + 1 + idx
    ws.cell(groundTypeRow, tableStartColumn)
      .string(gt.name)
      .style(rowHeaderTextStyle)
    // flux
    const fluxSummary = flux?.summary[gt.stocksId]
    // prepare directionCell before others so that still have border formatting when summary is undefined
    // comparing to 0.5 because number is rounded to integer
    const isSequestration = fluxSummary?.totalSequestration > 0.5
    const isEmission = fluxSummary?.totalSequestration < -0.5
    ws.column(tableStartColumn + 2)
      .setWidth(13)
    const directionCell = ws.cell(groundTypeRow, tableStartColumn + 2)
      .style({
        font: {
          color: isSequestration ? '#1f8d49' : '#e1000f'
        },
        border: {
          right: borderStyle
        }
      })
    if (fluxSummary !== undefined) {
      ws.cell(groundTypeRow, tableStartColumn + 1)
        .number(fluxSummary.totalSequestration || 0)
        .style(integerStyle)
      if (isSequestration || isEmission) {
        directionCell
          .string(isSequestration ? 'séquestration' : 'émission')
      }
    }
    // stocks
    const stock = stocks[gt.stocksId]
    ws.cell(groundTypeRow, tableStartColumn + 3)
      .number(stock.totalStock)
      .style(integerStyle)
    ws.column(tableStartColumn + 5)
      .setWidth(12)
    if (stock.stockPercentage > 1) {
      ws.cell(groundTypeRow, tableStartColumn + 4)
        .number(stock.stockPercentage / 100)
        .style({
          numberFormat: '# %'
        })
      ws.cell(groundTypeRow, tableStartColumn + 5)
        .string('du stock total')
    }
    // add border whether or not there is text
    ws.cell(groundTypeRow, tableStartColumn + 5)
      .style({
        border: {
          right: borderStyle
        }
      })
  })
  // add borders to bottom and right of table
  const lastTableRow = tableStartRow + parentGroundTypes.length
  const tableWidth = 6
  for (let col = tableStartColumn; col < tableStartColumn + tableWidth + 1; col++) {
    ws.cell(lastTableRow, col)
      .style({
        border: {
          bottom: borderStyle
        }
      })
  }
  const lastTableColumn = tableStartColumn + tableWidth
  const tableLength = tableStartRow + parentGroundTypes.length + 1
  for (let row = tableStartRow; row < tableLength; row++) {
    ws.cell(row, lastTableColumn)
      .style({
        border: {
          right: borderStyle
        }
      })
  }
  // TODO: column for surface modifié par l'utilisateur

  // thoughts for debugging user issues au cas où :
  // TODO: put export date somewhere?
  // TODO: save options in second worksheet?

  // // Set value of cell A1 to 100 as a number type styled with paramaters of style
  // ws.cell(1, 1)
  //   .number(100)
  //   .style(style)

  // // Set value of cell B1 to 200 as a number type styled with paramaters of style
  // ws.cell(1, 2)
  //   .number(200)
  //   .style(style)

  // // Set value of cell A2 to 'string' styled with paramaters of style

  // // Set value of cell A3 to true as a boolean type styled with paramaters of style but with an adjustment to the font size.
  // ws.cell(3, 1)
  //   .bool(true)
  //   .style(style)
  //   .style({ font: { size: 14 } })

  wb.write(`${epci.nom}.xlsx`, res)
}

module.exports = {
  excelExportHandler
}
