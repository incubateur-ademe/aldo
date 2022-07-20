const path = require('path')
const { getAnnualFluxes } = require('../../calculations/flux')
const rootFolder = path.join(__dirname, '../../')
const { epciList, getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { GroundTypes, Colours, AgriculturalPractices } = require(path.join(rootFolder, './calculations/constants'))

async function territoryHandler (req, res) {
  const tab = req.params.tab || 'stocks'
  const epci = await getEpci(req.query.epci) || {}
  const epcis = await epciList()
  let stocks, flux
  const fluxDetail = {}
  const agriculturalPracticeDetail = {}
  const agroforestryStock = {}
  const woodCalculation = req.query['répartition_produits_bois'] || 'récolte'
  let proportionSolsImpermeables = req.query['répartition_art_imp']
  proportionSolsImpermeables = proportionSolsImpermeables ? (proportionSolsImpermeables / 100).toPrecision(2) : undefined
  let stocksHaveModifications = false
  let fluxHaveModifications = false
  const agriculturalPracticesEstablishedAreas = {}
  if (epci.code) {
    // stocks area overrides
    const areaOverrides = {}
    Object.keys(req.query).filter(key => key.startsWith('surface_')).forEach(key => {
      const groundType = key.split('surface_')[1].replace(/_/g, ' ')
      areaOverrides[groundType] = parseFloat(req.query[key])
      if (!isNaN(areaOverrides[groundType])) {
        stocksHaveModifications = true
      }
    })
    // flux area overrides
    const areaChangeOverrides = {}
    Object.keys(req.query).filter(key => key.startsWith('change_')).forEach(key => {
      const groundType = key.split('change_')[1]
      areaChangeOverrides[groundType] = parseFloat(req.query[key])
      if (!isNaN(areaChangeOverrides[groundType])) {
        fluxHaveModifications = true
      }
    })
    // agricultural practices area additions
    Object.keys(req.query).filter(key => key.startsWith('ap_')).forEach(key => {
      const practice = key.split('ap_')[1]
      const id = AgriculturalPractices.find(ap => ap.url === practice)?.id
      agriculturalPracticesEstablishedAreas[id] = parseFloat(req.query[key])
      if (!isNaN(agriculturalPracticesEstablishedAreas[practice])) {
        fluxHaveModifications = true
      }
    })
    // agroforestry area and density additions
    Object.keys(req.query).filter(key => key.startsWith('af_area_')).forEach(key => {
      const groundType = key.split('af_area_')[1].replace(/_/g, ' ')
      agroforestryStock[groundType] = {
        area: parseFloat(req.query[key])
      }
    })
    Object.keys(req.query).filter(key => key.startsWith('af_density_')).forEach(key => {
      const groundType = key.split('af_density_')[1].replace(/_/g, ' ')
      const density = parseFloat(req.query[key])
      if (!agroforestryStock[groundType]) {
        agroforestryStock[groundType] = { density }
      } else {
        agroforestryStock[groundType].density = density
        stocksHaveModifications = true // both area and density need to be defined to impact original totalStock
      }
    })
    const options = {
      areas: areaOverrides,
      areaChanges: areaChangeOverrides,
      woodCalculation,
      proportionSolsImpermeables,
      agriculturalPracticesEstablishedAreas,
      agroforestryStock
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
    tab,
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
    stocksHaveModifications,
    fluxHaveModifications,
    proportionSolsImpermeables,
    fluxIds,
    stockTotal: stocks?.total,
    fluxTotal: flux?.total,
    agriculturalPractices: AgriculturalPractices,
    agriculturalPracticesEstablishedAreas,
    agriculturalPracticeDetail,
    agroforestryStock,
    // TODO: ideally have the reset URL return to the tab the button was clicked from
    resetUrl: stocksHaveModifications || fluxHaveModifications ? `${req._parsedUrl.pathname}?epci=${req.query.epci}` : undefined
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
    reservoir: {
      title: 'Répartition du stock de carbone par réservoir, toutes occupations du sol confondues',
      data: JSON.stringify({
        type: 'pie',
        data: {
          // ideally would put % into tooltip label but can't get the override function to work
          labels: Object.keys(stocks.percentageByReservoir).map(key => '% ' + key),
          datasets: [{
            label: 'Répartition du stock de carbone par réservoir',
            // TODO: use a mapping for key to display name instead
            data: Object.keys(stocks.percentageByReservoir).map(key => stocks.percentageByReservoir[key]),
            backgroundColor: chartBackgroundColors,
            borderColor: chartBorderColors,
            borderWidth: 2
          }]
        }
      })
    },
    groundType: pieChart('Répartition du stock de carbone par occupation du sol, tous réservoirs confondus', stocksPercentageLabels, stocksPercentageValues),
    groundAndLitter: pieChart('Répartition du stock de carbone par occupation du sol dans les réservoirs Sols & Litières', stocksPercentageLabels, groundAndLitterStocksValues),
    biomass: pieChart('Répartition du stock de carbone par occupation du sol dans le réservoir Biomasse', stocksPercentageLabels, biomassStocksValues),
    density: {
      title: 'Stocks de référence par unité de surface et par occupation du sol',
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
            },
            x: {
              title: {
                text: 'Typologie d’occupation du sol',
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
      title: 'Flux de carbone (tCO2e/an) par réservoir, toutes occupations du sol confondues',
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
        'Flux de carbone (tCO2e/an) par occupation du sol, tous réservoirs confondus',
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
