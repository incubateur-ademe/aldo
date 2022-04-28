const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { epciList, getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { GroundTypes, Colours } = require(path.join(rootFolder, './calculations/constants'))

async function territoryHandler (req, res) {
  const epci = await getEpci(req.query.epci) || {}
  const epcis = await epciList()
  let stocks
  const woodCalculation = req.query['répartition_produits_bois'] || 'récolte'
  if (epci.code) {
    const areaOverrides = {}
    Object.keys(req.query).filter(key => key.startsWith('surface_')).forEach(key => {
      const groundType = key.split('surface_')[1].replace(/_/g, ' ')
      areaOverrides[groundType] = parseFloat(req.query[key])
    })
    const options = {
      areas: areaOverrides,
      woodCalculation
    }
    stocks = await getStocks({ epci }, options)
  } else {
    res.status(404)
    res.render('404', {
      epcis
    })
    return
  }
  const groundTypes = GroundTypes.filter(type => !type.parentType)
  groundTypes.sort((a, b) => {
    const stockA = stocks[a.stocksId].stock
    const stockB = stocks[b.stocksId].stock
    if (stockA < stockB) return 1
    else if (stockA === stockB) return 0
    else return -1
  })
  res.render('territoire', {
    pageTitle: `${epci.nom}`,
    epcis,
    epci,
    groundTypes,
    allGroundTypes: GroundTypes,
    stocks,
    charts: stocks && charts(stocks),
    formatNumber (number) {
      return Math.round(number).toLocaleString('fr-FR')
    },
    round (number) {
      return Math.round(number)
    },
    pascalCase (text) {
      return text.replace(/ /g, '_')
    },
    simpleStocks: ['cultures', 'vignes', 'vergers', 'zones humides', 'haies'],
    woodCalculation
  })
}

function charts (stocks) {
  const chartBackgroundColors = Object.values(Colours).map(c => c['950'])
  const chartBorderColors = Object.values(Colours).map(c => c.main)
  const stocksPercentageLabels = []
  const stocksPercentageValues = []
  const groundAndLitterStocksValues = []
  const biomassStocksValues = []
  Object.keys(stocks).forEach(key => {
    if (stocks[key].stockPercentage >= 0) {
      stocksPercentageLabels.push(GroundTypes.find(gt => gt.stocksId === key).name)
      stocksPercentageValues.push(stocks[key].stockPercentage)
      groundAndLitterStocksValues.push(stocks[key].groundAndLitterStockPercentage)
      biomassStocksValues.push(stocks[key].biomassStockPercentage)
    }
  })
  const stocksDensityLabels = Object.keys(stocks.byDensity).map(key => GroundTypes.find(k => k.stocksId === key)?.name)
  return {
    groundType: pieChart('Répartition des stocks de carbone par occupation du sol', stocksPercentageLabels, stocksPercentageValues),
    reservoir: {
      title: 'Répartition du stock par reservoir',
      data: JSON.stringify({
        type: 'pie',
        data: {
          // ideally would put % into tooltip label but can't get the override function to work
          labels: Object.keys(stocks.percentageByReservoir).map(key => '% ' + key),
          datasets: [{
            label: 'Répartition du stock par reservoir',
            // TODO: use a mapping for key to display name instead
            data: Object.keys(stocks.percentageByReservoir).map(key => stocks.percentageByReservoir[key]),
            backgroundColor: chartBackgroundColors,
            borderColor: chartBorderColors,
            borderWidth: 2
          }]
        }
      })
    },
    density: {
      title: 'Stocks de référence par unité de surface',
      data: JSON.stringify({
        type: 'bar',
        data: {
          labels: stocksDensityLabels,
          datasets: [{
            label: 'Stocks de référence (tC/ha)',
            data: Object.keys(stocks.byDensity).map(key => stocks.byDensity[key]),
            backgroundColor: getColours(stocksDensityLabels, '950'),
            borderColor: getColours(stocksDensityLabels, 'main'),
            borderWidth: 2
          }]
        },
        options: {
          scales: {
            y: {
              title: {
                text: 'Stocks de référence (tC/ha)',
                display: true
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      })
    },
    groundAndLitter: pieChart('Répartition des stocks de carbone dans les sols et litière par occupation du sol', stocksPercentageLabels, groundAndLitterStocksValues),
    biomass: pieChart('Répartition des stocks de carbone dans la biomasse par occupation du sol', stocksPercentageLabels, biomassStocksValues)
  }
}

function getColours (groundTypeLabels, colorType) {
  return groundTypeLabels.map(type => {
    const colorKey = GroundTypes.find(gt => gt.name === type).color || 'opera'
    return Colours[colorKey][colorType]
  })
}

function pieChart (title, labels, values) {
  return {
    title,
    data: JSON.stringify({
      type: 'pie',
      data: {
        labels: labels.map(key => '% ' + key),
        datasets: [{
          label: title,
          data: values,
          backgroundColor: getColours(labels, '950'),
          borderColor: getColours(labels, 'main'),
          borderWidth: 2
        }]
      }
    })
  }
}

module.exports = {
  territoryHandler
}
