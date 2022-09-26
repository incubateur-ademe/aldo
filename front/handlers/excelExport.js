const xl = require('excel4node')
const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { getAnnualFluxes } = require(path.join(rootFolder, './calculations/flux'))
const { GroundTypes, AgriculturalPractices } = require(path.join(rootFolder, './calculations/constants'))
const { parseOptionsFromQuery } = require('./options')

async function excelExportHandler (req, res) {
  // prepare data
  const epci = await getEpci(req.params.epci, true) || {}
  if (!epci.code) {
    res.status(404)
    return
  }
  const options = parseOptionsFromQuery(req.query)
  const stocks = await getStocks({ epci }, options)
  const flux = getAnnualFluxes({ epci }, options)

  // prepare export
  const wb = new xl.Workbook()
  const ws = wb.addWorksheet('Tableau de bord')
  const inputBlue = '#4472C4'
  const number2dpStyle = wb.createStyle({
    numberFormat: '##0.00',
    font: {
      color: inputBlue
    }
  })
  const integerStyle = wb.createStyle({
    numberFormat: '###,##0',
    font: {
      color: inputBlue
    }
  })
  const dataStyle = wb.createStyle({
    font: {
      color: inputBlue
    }
  })

  // easier to move around if everything is relative
  let row = 1
  const startColumn = 1
  const secondColumn = startColumn + 1
  const thirdColumn = startColumn + 2
  ws.cell(row, startColumn)
    .string('Description')
  row++
  ws.cell(row, secondColumn)
    .string('Nom')
  ws.cell(row, thirdColumn)
    .string(epci.nom)
    .style(dataStyle)
  row++
  ws.cell(row, secondColumn)
    .string('SIREN')
  ws.cell(row, thirdColumn)
    .string(epci.code)
    .style(dataStyle)
  row++
  ws.cell(row, secondColumn)
    .string('Lien')
  ws.cell(row, thirdColumn)
    .link(`${process.env.PROTOCOL.toLowerCase()}://${process.env.HOSTNAME}/epci/${epci.code}?${req._parsedUrl.search}`, 'Outil Aldo en ligne')
  row++
  ws.cell(row, secondColumn)
    .string('Date d\'export')
  ws.cell(row, thirdColumn)
    .date(new Date())
    .style(dataStyle)
  row++
  ws.cell(row, secondColumn)
    .string('Communes')
  if (epci.membres?.length) {
    epci.membres.forEach(commune => {
      ws.cell(row, thirdColumn)
        .string(commune)
        .style(dataStyle)
      row++
    })
  }

  // user configuration
  row++
  ws.cell(row, startColumn).string('Configuration utilisateur')
  row++
  ws.cell(row, secondColumn)
    .string('Choix de l\'hypothèse sur la répartition du produit bois')
    .style(dataStyle)
  ws.cell(row, thirdColumn).string(options.woodCalculation).style(dataStyle)
  row++
  ws.cell(row, secondColumn)
    .string('Hypothèses de répartition des surfaces entre sols artificiels (% sols imperméabilisés)')
    .style(dataStyle)
  ws.cell(row, thirdColumn).number(options.proportionSolsImpermeables * 100).style(integerStyle)
  row++
  Object.entries(options.agriculturalPracticesEstablishedAreas).forEach(([practice, area]) => {
    const practiceInfo = AgriculturalPractices.find((ap) => ap.id === practice)
    if (practiceInfo.name) {
      ws.cell(row, secondColumn).string(practiceInfo.name).style(dataStyle)
      ws.cell(row, thirdColumn).number(area).style(integerStyle)
      row++
    }
  })
  row++

  // stocks
  ws.cell(row, startColumn).string('Résultats stocks de carbone')
  row++
  ws.cell(row, secondColumn).string('Occupation du sol')
  ws.cell(row, thirdColumn).string('Surface (ha)')
  ws.cell(row, thirdColumn + 1).string('Stocks carbone (tC)')
  ws.cell(row, thirdColumn + 2).string('Stocks (%)')
  ws.cell(row, thirdColumn + 3).string('Modifié par l\'utilisateur ?')
  row++

  const parentGroundTypes = GroundTypes.filter((gt) => !gt.parentType)
  const stockCellColumn = 'D'
  let forestStockCell = null
  const agriGroundStockCells = []
  const otherGroundStockCells = []
  let woodStockCell = null
  parentGroundTypes.forEach((gt, idx) => {
    ws.cell(row, secondColumn).string(gt.name)
    const stock = stocks[gt.stocksId]
    if (stock.area) {
      ws.cell(row, thirdColumn).number(stock.area).style(integerStyle)
    }
    if (stock.totalStock) {
      ws.cell(row, thirdColumn + 1).number(stock.totalStock).style(integerStyle)
    }
    if (stock.stockPercentage) {
      ws.cell(row, thirdColumn + 2).number(stock.stockPercentage).style(integerStyle)
    }
    ws.cell(row, thirdColumn + 3)
      .formula(stock.areaModified ? '=TRUE()' : '=FALSE()') // bool(true) wasn't working when tested in LibreOffice
      .style(dataStyle)
    const cell = stockCellColumn + row.toString()
    if (gt.stocksId === 'forêts') forestStockCell = cell
    else if (gt.stocksId === 'produits bois') woodStockCell = cell
    else if (gt.stocksId === 'sols artificiels' || gt.stocksId === 'zones humides') {
      otherGroundStockCells.push(cell)
    } else {
      agriGroundStockCells.push(cell)
    }
    row++
  })
  row++

  // flux
  ws.cell(row, startColumn).string('Résultats flux de carbone')
  row++
  ws.cell(row, secondColumn).string('Occupation du sol finale')
  ws.cell(row, thirdColumn).string('Séquestration (tCO2e / an)')
  ws.cell(row, thirdColumn + 2).string('Modifié par l\'utilisateur ?')
  row++

  parentGroundTypes.forEach((gt, idx) => {
    if (gt.stocksId === 'haies') return
    ws.cell(row, secondColumn).string(gt.name)
    const fluxSummary = flux?.summary[gt.stocksId]
    if (fluxSummary) {
      const sequestration = fluxSummary.totalSequestration
      ws.cell(row, thirdColumn).number(sequestration || 0).style(integerStyle)
      // comparing to 0.5 because number is rounded to integer
      const isSequestration = sequestration > 0.5
      const isEmission = sequestration < -0.5
      const directionCell = ws.cell(row, thirdColumn + 1)
        .style({
          font: {
            color: isSequestration ? '#1f8d49' : '#e1000f'
          }
        })
      if (isSequestration || isEmission) {
        directionCell
          .string(isSequestration ? 'séquestration' : 'émission')
      }
      ws.cell(row, thirdColumn + 2)
        .formula(fluxSummary.areaModified ? '=TRUE()' : '=FALSE()')
        .style(dataStyle)
    }
    row++
  })

  // Resultats_format_Cadre_de_depot_PCAET
  row++
  ws.cell(row, startColumn).string('Resultats_format_Cadre_de_depot_PCAET')
  row++
  ws.cell(row, secondColumn).string('Partie 2 - Données sur la séquestration de dioxyde de carbone')
  row++
  ws.cell(row, secondColumn).string('Diagnostic en tenant compte des changements d’affectation des terres (Facultatif pour le cadre de dépôt)')
  row++
  ws.cell(row, secondColumn).string('Estimation de la séquestration nette de dioxyde de carbone en TeqCO2')
  ws.cell(row, thirdColumn).string('Séquestration nette de dioxyde de carbone en TeqCO2')
  ws.cell(row, thirdColumn + 1).string('Année de référence')
  row++
  const cToCo2e = '44 / 12'
  ws.cell(row, secondColumn).string('Forêt')
  ws.cell(row, thirdColumn).formula(`${cToCo2e} * ${forestStockCell}`).style(integerStyle)
  ws.cell(row, thirdColumn + 1).number(2018).style(dataStyle)
  row++
  ws.cell(row, secondColumn).string('Sols agricoles (terres cultivées et prairies)')
  ws.cell(row, thirdColumn).formula(`${cToCo2e} * (${agriGroundStockCells.join(' + ')})`).style(integerStyle)
  ws.cell(row, thirdColumn + 1).number(2018).style(dataStyle)
  row++
  ws.cell(row, secondColumn).string('Autres sols')
  ws.cell(row, thirdColumn).formula(`${cToCo2e} * (${otherGroundStockCells.join(' + ')})`).style(integerStyle)
  ws.cell(row, thirdColumn + 1).number(2018).style(dataStyle)
  row++
  const italics = wb.createStyle({
    font: {
      italics: true
    }
  })
  const blueItalics = wb.createStyle({
    font: {
      italics: true,
      color: inputBlue
    }
  })
  const blueItalicsInteger = wb.createStyle({
    numberFormat: '###,##0',
    font: {
      italics: true,
      color: inputBlue
    }
  })
  ws.cell(row, secondColumn).string('Produits bois (hors cadre de dépôt)').style(italics)
  ws.cell(row, thirdColumn).formula(`${cToCo2e} * ${woodStockCell}`).style(blueItalicsInteger)
  ws.cell(row, thirdColumn + 1).number(2018).style(blueItalics)
  row++

  // Occupation du sol (ha) du territoire en 2018 :
  row++
  ws.cell(row, startColumn).string('Occupation du sol (ha) du territoire en 2018 :')
  row++
  const childGroundTypes = GroundTypes.filter((gt) => !gt.chilren)
  childGroundTypes.forEach((gt, idx) => {
    ws.cell(row, secondColumn).string(gt.name)
    const stock = stocks[gt.stocksId]
    if (stock.area) {
      ws.cell(row, thirdColumn).number(stock.area).style(integerStyle)
    }
    row++
  })
  row++

  // Changements d'occupation du sol annuel moyen (ha/an) du territoire entre 2012 et 2018 :
  row++
  ws.cell(row, startColumn).string('Changements d\'occupation du sol annuel moyen (ha/an) du territoire entre 2012 et 2018 :')
  row++
  ws.cell(row, thirdColumn).string('Occupation de sol finale')
  row++
  ws.cell(row, secondColumn).string('Occupation de sol initiale')
  const fluxGroundTypes = []
  GroundTypes.forEach(gt => {
    if (gt.altFluxId || gt.fluxId) {
      fluxGroundTypes.push(gt)
    }
  })
  fluxGroundTypes.forEach((gt, idx) => {
    ws.cell(row, thirdColumn + idx).string(gt.name)
  })
  row++
  fluxGroundTypes.forEach((gtInitial, idx) => {
    ws.cell(row, secondColumn).string(gtInitial.name)
    fluxGroundTypes.forEach((gtFinal, idxFinal) => {
      const thisFlux = flux.allFlux.filter(f => f.from === gtInitial.stocksId && f.to === gtFinal.stocksId && f.gas === 'C')
      if (thisFlux.length && thisFlux[0].area) {
        ws.cell(row, thirdColumn + idxFinal).number(thisFlux[0].area).style(number2dpStyle)
      }
    })
    row++
  })
  // Flux unitaire de référence (tCO2e/ha/an) du territoire :
  row++
  ws.cell(row, startColumn).string('Flux unitaire de référence (tCO2e/ha/an) du territoire :')
  row++
  ws.cell(row, thirdColumn).string('Occupation de sol finale')
  row++
  ws.cell(row, secondColumn).string('Occupation de sol initiale')
  fluxGroundTypes.forEach((gt, idx) => {
    ws.cell(row, thirdColumn + idx).string(gt.name)
  })
  row++
  fluxGroundTypes.forEach((gtInitial, idx) => {
    ws.cell(row, secondColumn).string(gtInitial.name)
    fluxGroundTypes.forEach((gtFinal, idxFinal) => {
      const thisFlux = flux.allFlux.filter(f => f.from === gtInitial.stocksId && f.to === gtFinal.stocksId && f.gas === 'C')
      if (thisFlux.length && thisFlux[0].flux) {
        ws.cell(row, thirdColumn + idxFinal).number(thisFlux[0].flux).style(integerStyle)
      }
    })
    row++
  })

  // Flux de carbone annuel moyen (tCO2e/an) du territoire entre 2012 et 2018 :
  row++
  ws.cell(row, startColumn).string('Flux de carbone annuel moyen (tCO2e/an) du territoire entre 2012 et 2018 :')
  row++
  ws.cell(row, thirdColumn).string('Occupation de sol finale')
  row++
  ws.cell(row, secondColumn).string('Occupation de sol initiale')
  fluxGroundTypes.forEach((gt, idx) => {
    ws.cell(row, thirdColumn + idx).string(gt.name)
  })
  row++
  fluxGroundTypes.forEach((gtInitial, idx) => {
    ws.cell(row, secondColumn).string(gtInitial.name)
    fluxGroundTypes.forEach((gtFinal, idxFinal) => {
      const thisFlux = flux.allFlux.filter(f => f.from === gtInitial.stocksId && f.to === gtFinal.stocksId && f.gas === 'C')
      if (thisFlux.length && thisFlux[0].co2e) {
        ws.cell(row, thirdColumn + idxFinal).number(thisFlux[0].co2e).style(integerStyle)
      }
    })
    row++
  })

  wb.write(`${epci.nom}.xlsx`, res)
}

module.exports = {
  excelExportHandler
}
