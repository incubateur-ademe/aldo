const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { epciList, getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { GroundTypes, Colours } = require(path.join(rootFolder, './calculations/constants'))

async function territoryHandler (req, res) {
  const epci = await getEpci(req.query.epci) || {}
  let stocks = {}
  if (epci.code) {
    const areaOverrides = {}
    Object.keys(req.query).filter(key => key.startsWith('surface_')).forEach(key => {
      const groundType = key.split('surface_')[1].replace(/_/g, ' ')
      areaOverrides[groundType] = parseFloat(req.query[key])
    })
    const options = {
      area: areaOverrides,
      woodCalculation: req.query['répartition_produits_bois'] || 'récolte'
    }
    stocks = await getStocks({ epci }, options)
  } else {
    res.status(404)
  }
  res.render('territoire', {
    pageTitle: `${epci.nom || 'EPCI pas trouvé'}`,
    epcis: await epciList(),
    epci,
    groundTypes: GroundTypes.filter(type => !type.parentType),
    stocks,
    charts: charts(stocks),
    formatNumber (number) {
      return Math.round(number).toLocaleString('fr-FR')
    }
  })
}

function charts (stocks) {
  const chartBackgroundColors = Object.values(Colours).map(c => c['950'])
  const chartBorderColors = Object.values(Colours).map(c => c.main)
  const stocksPercentageLabels = []
  const stocksPercentageValues = []
  Object.keys(stocks).forEach(key => {
    if (stocks[key].stockPercentage >= 0) {
      stocksPercentageLabels.push(GroundTypes.find(gt => gt.stocksId === key).name)
      stocksPercentageValues.push(stocks[key].stockPercentage)
    }
  })
  return {
    groundType: {
      // TODO: ask why produits bois is not included, and why forest is level 2 but prairies level 1
      title: 'Répartition des stocks de carbone par occupation du sol',
      data: JSON.stringify({
        type: 'pie',
        data: {
          labels: stocksPercentageLabels.map(key => '% ' + key),
          datasets: [{
            label: 'Répartition des stocks de carbone par occupation du sol',
            // TODO: use a mapping for key to display name instead
            data: stocksPercentageValues,
            backgroundColor: chartBackgroundColors,
            borderColor: chartBorderColors,
            borderWidth: 2
          }]
        }
      })
    },
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
          labels: Object.keys(stocks.byDensity).map(key => GroundTypes.find(k => k.stocksId === key)?.name),
          datasets: [{
            label: 'Stocks de référence (tC/ha)',
            data: Object.keys(stocks.byDensity).map(key => stocks.byDensity[key]),
            backgroundColor: chartBackgroundColors,
            borderColor: chartBorderColors,
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
    }
  }
}

module.exports = {
  territoryHandler
}
