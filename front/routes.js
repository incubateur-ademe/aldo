
const express = require('express')
const router = express.Router()
const path = require('path')
const rootFolder = path.join(__dirname, '../')
const { epciList, getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { GroundTypes } = require(path.join(rootFolder, './calculations/constants'))

router.get('/', async (req, res) => {
  res.render('landing', {
    epcis: await epciList()
  })
})

router.get('/territoire', async (req, res) => {
  const epci = await getEpci(req.query.epci) || {}
  let stocks = {}
  if (epci.code) {
    stocks = await getStocks({ epci })
  } else {
    res.status(404)
  }
  // TODO: add at least 4 more colours
  const chartBackgroundColors = [
    '#C9FCAC', // green-bourgeon-950
    '#E9EDFE', // blue-ecume-950
    '#FEE7FC', // purple-glycine-950
    '#F7EBE5', // brown-caramel-950
    '#fceeac', // green-tilleul-verveine-950
    '#fee9e5', // orange-terre-battue-950
    '#c3fad5', // green-emeraude-950
    '#fee9e6', // pink-macaron-950
    '#bafaee', // green-menthe-950
    '#feecc2', // yellow-tournesol-950
    '#c7f6fc', // green-archipel-950
    '#fee9e7', // pink-tuile-950
    '#f7ece4', // brown-opera-950
    '#e6eefe', // blue-cumulus-950
    '#feebd0', // yellow-moutard-950
  ]
  const chartBorderColors = [
    '#68A532', // green-bourgeon-main-640
    '#465F9D', // blue-ecume-main-400
    '#A55A80', // purple-glycine-main-494
    '#C08C65', // brown-caramel-main-648
    '#B7A73F', // green-tilleul-verveine-main-707
    '#E4794A', // orange-terre-battue-main-645
    '#00A95F', // green-emeraude-main-632
    '#E18B76', // pink-macaron-main-689
    '#009081', // green-menthe-main-548
    '#C8AA39', // yellow-tournesol-main-731
    '#009099', // green-archipel-main-557
    '#CE614A', // pink-tuile-main-556
    '#BD987A', // brown-opera-main-680
    '#417DC4', // blue-cumulus-main-526
    '#C3992A', // yellow-moutarde-main-679
  ]
  res.render('territoire', {
    pageTitle: `${epci.nom || 'EPCI pas trouvé'}`,
    epcis: await epciList(),
    epci,
    groundTypes: GroundTypes,
    stocks,
    charts: {
      reservoir: {
        title: 'Répartition du stock par reservoir',
        data: JSON.stringify({
          type: 'pie',
          data: {
            labels: Object.keys(stocks.byReservoir),
            datasets: [{
              label: 'Répartition du stock par reservoir',
              // TODO: use a mapping for key to display name instead
              data: Object.keys(stocks.byReservoir).map(key => stocks.byReservoir[key]),
              backgroundColor: chartBackgroundColors,
              borderColor: chartBorderColors,
              borderWidth: 2
            }]
          }
          // optional options object
        })
      },
      density: {
        title: 'Stocks de référence par unité de surface',
        data: JSON.stringify({
          type: 'bar',
          data: {
            labels: Object.keys(stocks.byDensity),
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
    },
    formatNumber (number) {
      return Math.round(number).toLocaleString('fr-FR')
    }
  })
})

// TODO: complete and add the following back in
// router.get('/contact', (req, res) => {
//   res.render('contact', {
//     pageTitle: 'Contact'
//   })
// })

// router.get('/accessibilite', (req, res) => {
//   res.render('accessibilite', {
//     pageTitle: 'Accessibilité'
//   })
// })

// router.get('/mentions-legales', (req, res) => {
//   res.render('legalNotice', {
//     pageTitle: 'Mentions légales',
//     contactEmail: 'mon-produit@beta.gouv.fr'
//   })
// })

module.exports = router
