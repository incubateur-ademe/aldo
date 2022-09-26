
const express = require('express')
const router = express.Router()
const path = require('path')
const rootFolder = path.join(__dirname, '../')
const { epciList } = require(path.join(rootFolder, './calculations/epcis'))
const { territoryHandler } = require('./handlers/territory')
const { excelExportHandler } = require('./handlers/excelExport')

router.get('/', async (req, res) => {
  if (req.query.epci) {
    res.redirect('/epci/' + req.query.epci)
  } else {
    res.render('landing', {
      epcis: await epciList()
    })
  }
})

router.get('/epci/:epci', territoryHandler)
router.get('/epci/:epci/tableur', excelExportHandler)
router.get('/epci/:epci/:tab', territoryHandler)

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
