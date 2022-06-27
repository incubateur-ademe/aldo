const path = require('path')
const { getAnnualFluxes } = require('../../calculations/flux')
const rootFolder = path.join(__dirname, '../../')
const { epciList, getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { GroundTypes, Colours, AgriculturalPractices } = require(path.join(rootFolder, './calculations/constants'))

async function territoryHandler (req, res) {
  const epci = await getEpci(req.query.epci) || {}
  const epcis = await epciList()
  let stocks, flux
  const fluxDetail = {}
  const agriculturalPracticeDetail = {}
  const woodCalculation = req.query['répartition_produits_bois'] || 'récolte'
  let proportionSolsImpermeables = req.query['répartition_art_imp']
  proportionSolsImpermeables = proportionSolsImpermeables ? (proportionSolsImpermeables / 100).toPrecision(2) : undefined
  let hasModifiedArea = false
  let hasModifiedAreaChange = false
  const agriculturalPracticesEstablishedAreas = {}
  if (epci.code) {
    const areaOverrides = {}
    Object.keys(req.query).filter(key => key.startsWith('surface_')).forEach(key => {
      const groundType = key.split('surface_')[1].replace(/_/g, ' ')
      areaOverrides[groundType] = parseFloat(req.query[key])
      if (!isNaN(areaOverrides[groundType])) {
        hasModifiedArea = true
      }
    })
    const areaChangeOverrides = {}
    Object.keys(req.query).filter(key => key.startsWith('change_')).forEach(key => {
      const groundType = key.split('change_')[1]
      areaChangeOverrides[groundType] = parseFloat(req.query[key])
      if (!isNaN(areaChangeOverrides[groundType])) {
        hasModifiedAreaChange = true
      }
    })
    Object.keys(req.query).filter(key => key.startsWith('ap_')).forEach(key => {
      const practice = key.split('ap_')[1]
      const id = AgriculturalPractices.find(ap => ap.url === practice)?.id
      agriculturalPracticesEstablishedAreas[id] = parseFloat(req.query[key])
      if (!isNaN(agriculturalPracticesEstablishedAreas[practice])) {
        hasModifiedAreaChange = true
      }
    })
    const options = {
      areas: areaOverrides,
      areaChanges: areaChangeOverrides,
      woodCalculation,
      proportionSolsImpermeables,
      agriculturalPracticesEstablishedAreas
    }
    stocks = await getStocks({ epci }, options)
    flux = getAnnualFluxes({ epci }, options)
    flux.allFlux.forEach(f => {
      if (f.value !== 0) {
        if (f.practice) {
          if (!agriculturalPracticeDetail[f.to]) {
            agriculturalPracticeDetail[f.to] = []
          }
          agriculturalPracticeDetail[f.to].push(f)
        } else {
          if (!fluxDetail[f.to]) {
            fluxDetail[f.to] = []
          }
          fluxDetail[f.to].push(f)
        }
      }
    })
  } else {
    res.status(404)
    res.render('404', {
      epcis
    })
    return
  }
  const groundTypes = GroundTypes.filter(type => !type.parentType)
  groundTypes.sort((a, b) => {
    const stockA = stocks[a.stocksId].totalStock
    const stockB = stocks[b.stocksId].totalStock
    if (stockA < stockB) return 1
    else if (stockA === stockB) return 0
    else return -1
  })
  const sortedFluxKeys = GroundTypes.filter(type => !type.parentType)
  sortedFluxKeys.sort((a, b) => {
    const fluxA = Math.abs(flux.summary[a.stocksId]?.totalSequestration || 0)
    const fluxB = Math.abs(flux.summary[b.stocksId]?.totalSequestration || 0)
    if (fluxA < fluxB) return 1
    else if (fluxA === fluxB) return 0
    else return -1
  })
  const fluxIds = []
  GroundTypes.forEach(gt => {
    if (gt.altFluxId || gt.fluxId) {
      fluxIds.push(gt.altFluxId || gt.fluxId)
    }
  })
  res.render('territoire', {
    pageTitle: `${epci.nom}`,
    epcis,
    epci,
    groundTypes,
    allGroundTypes: GroundTypes,
    stocks,
    charts: stocks && charts(stocks),
    formatNumber (number, sigFig = 0) {
      const multiplier = Math.pow(10, sigFig)
      const rounded = Math.round(number * multiplier) / multiplier
      if (rounded === 0) return 0 // without this get "-0"
      return rounded.toLocaleString('fr-FR')
    },
    round (number) {
      return Math.round(number)
    },
    pascalCase (text) {
      return text.replace(/ /g, '_')
    },
    simpleStocks: ['cultures', 'vignes', 'vergers', 'zones humides', 'haies'],
    woodCalculation,
    fluxSummary: flux?.summary,
    allFlux: flux?.allFlux,
    sortedFluxKeys,
    fluxCharts: fluxCharts(flux),
    fluxDetail,
    hasModifiedArea,
    hasModifiedAreaChange,
    proportionSolsImpermeables,
    fluxIds,
    stockTotal: stocks?.total,
    fluxTotal: flux?.total,
    agriculturalPractices: AgriculturalPractices,
    agriculturalPracticesEstablishedAreas,
    agriculturalPracticeDetail
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
            data: Object.keys(stocks.byDensity).map(key => Math.round(stocks.byDensity[key])),
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

function fluxCharts (flux) {
  const chartBackgroundColors = Object.values(Colours).map(c => c['950'])
  const chartBorderColors = Object.values(Colours).map(c => c.main)
  // intentionally filtering out 0 as well as undefined to save horizontal space.
  // since this data is also displayed in the table.
  const keys = Object.keys(flux.summary).filter(k => {
    const hasParent = !!GroundTypes.find(gt => gt.stocksId === k).parentType
    return !!flux.summary[k].totalSequestration && !hasParent
  })
  const labels = keys.map(key => GroundTypes.find(k => k.stocksId === key)?.name)
  const reservoirLabels = ['Sol et litière', 'Biomasse'] // produits bois
  const reservoirData = [0, 0]
  flux.allFlux.forEach(f => {
    if (f.reservoir === 'sol' || f.reservoir === 'litière') {
      reservoirData[0] += Math.round(f.co2e)
    } else if (f.reservoir === 'biomasse') {
      reservoirData[1] += Math.round(f.co2e)
    }
  })
  return {
    reservoir: {
      title: 'Repartition des flux (tCO2e/an)',
      data: JSON.stringify({
        type: 'bar',
        data: {
          labels: reservoirLabels,
          datasets: [{
            label: 'Flux (tCO2e/ha)',
            data: reservoirData,
            backgroundColor: chartBackgroundColors,
            borderColor: chartBorderColors,
            borderWidth: 2
          }]
        },
        options: {
          scales: {
            y: {
              title: {
                text: 'Flux (tCO2e/ha)',
                display: true
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              intersect: false
            }
          }
        }
      })
    },
    groundType: {
      title:
        'Flux en milliers de tCO2eq/an de l\'EPCI, par occupation du sol, ' +
        'Bases de changement CLC 2012-2018; Inventaire forestier 2012-2016',
      data: JSON.stringify({
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Flux (tCO2e/ha.an)',
            data: keys.map(key => Math.round(flux.summary[key].totalSequestration)),
            backgroundColor: getColours(labels, '950'),
            borderColor: getColours(labels, 'main'),
            borderWidth: 2
          }]
        },
        options: {
          scales: {
            y: {
              title: {
                text: 'Flux (tCO2e/ha.an)',
                display: true
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              intersect: false
            }
          }
        }
      })
    }
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
