const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { epciList, communeList } = require(path.join(rootFolder, './data'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { getAnnualFluxes } = require(path.join(rootFolder, './calculations/flux'))
const { GroundTypes, Colours, AgriculturalPractices } = require(path.join(rootFolder, './calculations/constants'))
const { parseOptionsFromQuery, getLocationDetail } = require('./shared')
const { getCommunes } = require(path.join(rootFolder, './data/communes'))

async function territoryHandler (req, res) {
  const location = await getLocationDetail(req, res)
  if (!location) {
    const epcis = await epciList()
    const communes = communeList()
    res.status(404)
    res.render('404-epci', {
      epcis,
      communes,
      attemptedSearch: req.params.epci
    })
    return
  }

  const options = parseOptionsFromQuery(req.query)
  const stocks = getStocks(location, options)
  const flux = getAnnualFluxes(location, options)

  const { fluxDetail, agriculturalPracticeDetail } = formatFluxForDisplay(flux)
  const singleLocation = location.epci || location.commune

  let pageTitle = singleLocation?.nom
  const epciCount = location.epcis?.length
  const communeCount = location.communes?.length
  if (epciCount || communeCount) {
    pageTitle = 'Regroupement'
    const epcis = epciCount ? `de ${epciCount} EPCI${epciCount > 1 ? 's' : ''}` : ''
    const communes = communeCount ? `de ${communeCount} commune${communeCount > 1 ? 's' : ''}` : ''
    if (epcis) {
      pageTitle += ' ' + epcis
      if (communes) pageTitle += ' et'
    }
    if (communes) pageTitle += ' ' + communes
  }
  let resetQueryStr
  if (singleLocation) {
    resetQueryStr = options.stocksHaveModifications || options.fluxHaveModifications ? '?' : undefined
  } else {
    resetQueryStr = '?' + location.epcis.map(c => `epcis[]=${c.code}`).join('&')
    const communeStr = location.communes.map(c => `communes[]=${c.insee}`).join('&')
    resetQueryStr += (location.communes.length ? '&' : '') + communeStr
  }
  res.render('territoire', {
    pageTitle,
    tab: req.params.tab || 'stocks',
    singleLocation,
    communes: location.communes,
    epcis: location.epcis,
    userWarnings: userWarnings(location),
    groundTypes: getSortedGroundTypes(stocks),
    allGroundTypes: GroundTypes,
    // these are the types that can be modified to customise the stocks calculations
    stocksGroundTypes: GroundTypes.filter(gt => !gt.children && gt.stocksId !== 'produits bois').sort((a, b) => {
      if (a.name > b.name) return 1
      else if (a.name === b.name) return 0
      else return -1
    }),
    stocks,
    charts: stocks && charts(stocks),
    formatNumber (number, fractionDigits = 0) {
      return number.toLocaleString('fr-FR', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      })
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
    sortedFluxKeys: getSortedFluxKeys(flux),
    fluxCharts: fluxCharts(flux),
    fluxDetail,
    fluxIds: GroundTypes.filter(gt => gt.altFluxId || gt.fluxId).map(gt => gt.altFluxId || gt.fluxId),
    stockTotal: stocks?.total,
    stockTotalEquivalent: stocks?.totalEquivalent,
    fluxTotal: flux?.total,
    agriculturalPractices: AgriculturalPractices,
    agriculturalPracticeDetail,
    resetQueryStr,
    sharingQueryStr: req.search,
    getTabUrl: (tabName, withQuery) => {
      let url = req.path
      if (tabName) url = `/regroupement/${tabName}`
      return url + withQuery ? req.search : ''
    },
    beges: req.query.beges,
    perimetre: req.query.perimetre,
    forestBiomassSummaryByType: flux?.biomassSummary,
    ...options
  })
}

function formatFluxForDisplay (flux) {
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
        if (!fluxDetail[f.to]) fluxDetail[f.to] = []
        // biomass growth in forests is displayed elsewhere
        if (f.growth === undefined) fluxDetail[f.to].push(f)
      }
    }
  })
  // order the details by initial occupation
  Object.keys(fluxDetail).forEach((k) => {
    fluxDetail[k].sort((a, b) => {
      const aName = GroundTypes.find((gt) => gt.stocksId === a.from)?.name
      const bName = GroundTypes.find((gt) => gt.stocksId === b.from)?.name
      if (aName < bName) return -1
      else if (aName === bName) return 0
      else return 1
    })
  })
  return { fluxDetail, agriculturalPracticeDetail }
}

function getSortedGroundTypes (stocks) {
  const parentTypes = GroundTypes.filter(type => !type.parentType)
  parentTypes.sort((a, b) => {
    const stockA = stocks[a.stocksId].totalStock
    const stockB = stocks[b.stocksId].totalStock
    if (stockA < stockB) return 1
    else if (stockA === stockB) return 0
    else return -1
  })
  return parentTypes
}

function getSortedFluxKeys (flux) {
  const parentTypes = GroundTypes.filter(type => !type.parentType)
  parentTypes.sort((a, b) => {
    const fluxA = Math.abs(flux.summary[a.stocksId]?.totalSequestration || 0)
    const fluxB = Math.abs(flux.summary[b.stocksId]?.totalSequestration || 0)
    if (fluxA < fluxB) return 1
    else if (fluxA === fluxB) return 0
    else return -1
  })
  return parentTypes
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
            label: 'Flux (tCO2e/an)',
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
                text: 'Flux (tCO2e/an)',
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
            label: 'Flux (tCO2e/an)',
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
                text: 'Flux (tCO2e/an)',
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

function userWarnings (location) {
  const warnings = []
  const allCommunes = getCommunes(location)
  let requestedCommunesCount = (location.epci?.membres.length || 0) + (!!location.commune && 1) + (location.communes?.length || 0)
  location.epcis.forEach(epci => {
    requestedCommunesCount += epci.membres.length
  })
  if (requestedCommunesCount > allCommunes.length) {
    warnings.push('communesDeduplicated')
  }
  if (allCommunes.length < 10 && (!location.epci && !location.epcis?.length)) {
    // some EPCIs are <10 communes, don't show message for them
    warnings.push('tooFewCommunes')
  }
  const epcisFromSelectedCommunes = []
  for (const commune of allCommunes) {
    if (epcisFromSelectedCommunes.indexOf(commune.epci) === -1) {
      epcisFromSelectedCommunes.push(commune.epci)
    }
  }
  if (epcisFromSelectedCommunes.length > 1) {
    warnings.push('multipleEpcis')
  }
  return warnings
}

module.exports = {
  territoryHandler
}
