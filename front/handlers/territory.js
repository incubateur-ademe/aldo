const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { epciList } = require(path.join(rootFolder, './data'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { getAnnualFluxes } = require(path.join(rootFolder, './calculations/flux'))
const { GroundTypes, Colours, AgriculturalPractices } = require(path.join(rootFolder, './calculations/constants'))
const { parseOptionsFromQuery } = require('./options')

async function territoryHandler (req, res) {
  const epcis = await epciList()
  const epci = await getEpci(req.params.epci, true) || {}
  if (!epci.code) {
    res.status(404)
    res.render('404-epci', {
      epcis,
      attemptedSearch: req.params.epci
    })
    return
  }
  const options = parseOptionsFromQuery(req.query)
  const stocks = await getStocks({ epci }, options)
  const flux = getAnnualFluxes({ epci }, options)
  const fluxDetail = {}
  const agriculturalPracticeDetail = {}
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
  // ordering for display greatest stocks/flux (seq or emission) descending
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
  // these are the types that can be modified to customise the stocks calculations
  const stocksGroundTypes = GroundTypes.filter(gt => !gt.children && gt.stocksId !== 'produits bois')
  stocksGroundTypes.sort((a, b) => {
    if (a.name > b.name) return 1
    else if (a.name === b.name) return 0
    else return -1
  })
  const resetQueryStr = options.stocksHaveModifications || options.fluxHaveModifications ? '?' : undefined
  // this sharingQueryStr query will be passed to excel export link. Need to make it as short as possible because excel bugs out at long links
  let sharingQueryStr = '?'
  Object.keys(req.query).forEach(queryParam => {
    if (req.query[queryParam] && queryParam !== 'epci') {
      sharingQueryStr += `&${queryParam}=${req.query[queryParam]}`
    }
  })
  // TODO: double check numbers, esp annualFluxEquivalent vs co2e
  // aggregate forest biomass data which is by commune, not EPCI
  const forestBiomassSummaryByType = []
  const forestSubtypes = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']
  for (const subtype of forestSubtypes) {
    const subtypeFluxes =
      flux.allFlux.filter((flux) => flux.to === subtype && flux.reservoir === 'biomasse')
    const summary = {
      to: subtype,
      area: sumByProperty(subtypeFluxes, 'area'),
      co2e: sumByProperty(subtypeFluxes, 'co2e')
    }
    const fluxProperties = [
      'growth',
      'mortality',
      'timberExtraction',
      'fluxMeterCubed',
      'conversionFactor',
      'annualFluxEquivalent'
    ]
    for (const property of fluxProperties) {
      // the property of interest can have quite different values for different geo locations
      // and the surface area within that location can be quite different
      // so use a weighted sum, not an average, to get closer to a reasonable 'average' value
      summary[property] = weightedAverage(subtypeFluxes, property, 'area')
    }
    forestBiomassSummaryByType.push(summary)
  }
  res.render('territoire', {
    pageTitle: `${epci.nom}`,
    tab: req.params.tab || 'stocks',
    epcis,
    epci,
    groundTypes,
    allGroundTypes: GroundTypes,
    stocksGroundTypes,
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
    simpleStocks: ['cultures', 'vignes', 'vergers', 'zones humides'],
    fluxSummary: flux?.summary,
    allFlux: flux?.allFlux,
    sortedFluxKeys,
    fluxCharts: fluxCharts(flux),
    fluxDetail,
    fluxIds,
    stockTotal: stocks?.total,
    stockTotalEquivalent: stocks?.totalEquivalent,
    fluxTotal: flux?.total,
    agriculturalPractices: AgriculturalPractices,
    agriculturalPracticeDetail,
    baseUrl: `/epci/${epci.code}`,
    resetQueryStr,
    sharingQueryStr,
    beges: req.query.beges,
    perimetre: req.query.perimetre,
    forestBiomassSummaryByType,
    ...options
  })
}

function sumByProperty (objArray, key) {
  let sum = 0
  objArray.forEach((obj) => {
    sum += obj[key]
  })
  return sum
}

function weightedAverage (objArray, key, keyForWeighting) {
  let weightedSum = 0
  objArray.forEach((obj) => {
    weightedSum += obj[key] * obj[keyForWeighting]
  })
  const total = sumByProperty(objArray, keyForWeighting)
  // this will break if total is 0...
  return weightedSum / total
}

function charts (stocks) {
  const chartBackgroundColors = Object.values(Colours).map(c => c['950'])
  const chartBorderColors = Object.values(Colours).map(c => c.main)
  const stocksPercentageLabels = []
  const stocksPercentageValues = []
  const biomassValues = []
  const groundValues = []
  const forestLitterValues = []
  const groundAndLitterStocksValues = []
  const biomassStocksValues = []
  Object.keys(stocks).forEach(key => {
    if (stocks[key].stockPercentage >= 0) {
      stocksPercentageLabels.push(GroundTypes.find(gt => gt.stocksId === key).name)
      stocksPercentageValues.push(stocks[key].stockPercentage)
      groundAndLitterStocksValues.push(stocks[key].groundAndLitterStockPercentage)
      biomassStocksValues.push(stocks[key].biomassStockPercentage)
      biomassValues.push(Math.round(stocks[key].biomassStock / 1000))
      groundValues.push(Math.round(stocks[key].groundStock / 1000))
      forestLitterValues.push(Math.round(stocks[key].forestLitterStock / 1000))
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
      note: 'Les stocks de référence pour les sols sont issus de données du Réseau de Mesures de la Qualité de Sols (RMQS) du GIS-SOL entre 2001 et 2011 et calculés par occupation du sol et par grande région pédoclimatique. La zone pédoclimatique majoritaire est affectée à l\'EPCI conformément aux travaux du CITEPA. Les stocks de référence à l\'ha dans la biomasse de forêt sont issus de l\'inventaire forestier de l\'IGN entre 2011 et 2020 et calculés par typologie de forêt et par grande région écologique.',
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
    },
    groundTypeStacked: {
      title: 'Ventilation du stock carbone par occupation du sol (tous réservoirs inclus)',
      data: JSON.stringify({
        type: 'bar',
        data: {
          labels: stocksPercentageLabels,
          datasets: [
            {
              label: 'Sol',
              data: groundValues,
              backgroundColor: Colours.tournesol['950'],
              borderColor: Colours.tournesol.main,
              borderWidth: 2
            },
            {
              label: 'Biomasse',
              data: biomassValues,
              backgroundColor: Colours.emeraude['950'],
              borderColor: Colours.emeraude.main,
              borderWidth: 2
            },
            {
              label: 'Litière',
              data: forestLitterValues,
              backgroundColor: Colours.opera['950'],
              borderColor: Colours.opera.main,
              borderWidth: 2
            }
          ]
        },
        options: {
          scales: {
            y: {
              title: {
                text: 'Stocks de carbone (ktCO2e)',
                display: true
              },
              stacked: true
            },
            x: {
              title: {
                text: 'Typologie d’occupation du sol',
                display: true
              },
              stacked: true
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
      note: 'Les flux de référence pour les changements d’occupation des sols sont issus de données du Réseau de Mesures de la Qualité des Sols (RMQS) du GIS-SOL entre 2001 et 2011 et calculés par occupation du sol et par grande région pédoclimatique. La zone pédoclimatique majoritaire est affectée à l\'EPCI conformément aux travaux du CITEPA. Les flux de référence à l’ha dans la biomasse de forêt sont issus de l’inventaire forestier de l’IGN entre 2011 et 2020 et calculés par typologie de forêt et par grande région écologique. Les flux de référence pour les pratiques agricoles stockantes sont des valeurs moyennes nationales (travaux INRAE 2013).',
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
