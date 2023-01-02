
const express = require('express')
const router = express.Router()
const path = require('path')
const rootFolder = path.join(__dirname, '../')
const { epciList } = require(path.join(rootFolder, './data'))
const sendinblue = require(path.join(rootFolder, './sendinblue'))
const { territoryHandler } = require('./handlers/territory')
const { excelExportHandler } = require('./handlers/excelExport')

router.get('/', async (req, res) => {
  if (req.query.epci) {
    res.redirect('/epci/' + req.query.epci)
  } else {
    res.render('landing', {
      epcis: epciList(),
      isHomepage: true
    })
  }
})

router.get('/epci/:epci', territoryHandler)
router.get('/epci/:epci/tableur', excelExportHandler)
router.get('/epci/:epci/:tab', territoryHandler)

router.get('/contact', (req, res) => {
  res.render('contact', {
    pageTitle: 'Contact',
    status: req.query.statut
  })
})

router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body
  sendinblue({
    to: [{
      email: process.env.ALDO_EMAIL
    }],
    replyTo: { email },
    subject,
    templateId: Number(process.env.SIB_CONTACT_TEMPLATE),
    params: { NOM: name, email, subject, MESSAGE: message }
  }).then(() => {
    res.redirect('/contact?statut=succès')
  }).catch((error) => {
    console.error(
      'Error sending contact form.\nStatus: ',
      error.status,
      '\nError:\n',
      error.response.text
    )
    res.redirect('/contact?statut=' + error.status)
  })
})

router.get('*', async (req, res) => {
  const epcis = await epciList()
  res.status(404)
  res.render('404', {
    epcis
  })
})

// TODO: complete and add the following back in
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
