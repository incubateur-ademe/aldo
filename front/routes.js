
const express = require('express')
const router = express.Router()
const path = require('path')
const rootFolder = path.join(__dirname, '../')
const { epciList, getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { GroundTypes, Colours } = require(path.join(rootFolder, './calculations/constants'))

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
  const chartBackgroundColors = Object.values(Colours).map(c => c['950'])
  const chartBorderColors = Object.values(Colours).map(c => c.main)
  res.render('territoire', {
    pageTitle: `${epci.nom || 'EPCI pas trouvé'}`,
    epcis: await epciList(),
    epci,
    groundTypes: GroundTypes.filter(type => !type.parentType),
    stocks,
    charts: {
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
