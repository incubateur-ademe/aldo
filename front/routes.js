
const express = require('express')
const router = express.Router()
const path = require('path')
const rootFolder = path.join(__dirname, '../')
const { epciList, communeList } = require(path.join(rootFolder, './data'))
const sendinblue = require(path.join(rootFolder, './sendinblue'))
const { territoryHandler } = require('./handlers/territory')
const { excelExportHandler } = require('./handlers/excelExport')
const { dbPromise } = require('../db/conn')

router.get('/', async (req, res) => {
  res.render('landing', {
    epcis: epciList(),
    communes: communeList(),
    isHomepage: true
  })
})

router.get('/dbtest', async (req, res) => {
  const db = await dbPromise
  const collection = await db.collection('zpc')
  const results = await collection.find({ _id: '01002' })
    .limit(1)
    .toArray()

  res.send(results).status(200)
})

async function groupingHandler (req, res) {
  if (req.query.epcis && !req.query.communes) {
    if (req.query.epcis.length === 1) {
      res.redirect('/epci/' + req.query.epcis[0])
    }
  }
  if (req.query.communes && !req.query.epcis) {
    if (req.query.communes.length === 1) {
      res.redirect('/commune/' + req.query.communes[0])
    }
  }
  return territoryHandler(req, res)
}

router.get('/regroupement', groupingHandler)
// router.get('/regroupement/tableur', excelExportHandler)
router.get('/regroupement/:tab', groupingHandler)

router.get('/epci/:epci', territoryHandler)
router.get('/epci/:epci/tableur', excelExportHandler)
router.get('/epci/:epci/:tab', territoryHandler)

router.get('/commune/:commune', territoryHandler)
router.get('/commune/:commune/tableur', excelExportHandler)
router.get('/commune/:commune/:tab', territoryHandler)

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

router.get('/accessibilite', (req, res) => {
  res.render('accessibilite', {
    pageTitle: 'Accessibilité'
  })
})

router.get('/mentions-legales', (req, res) => {
  res.render('legalNotice', {
    pageTitle: 'Mentions légales'
  })
})

router.get('/sitemap.txt', (req, res) => {
  function url (path) {
    return `${process.env.PROTOCOL.toLowerCase()}://${process.env.HOSTNAME}${path}`
  }
  const content = [
    url('/'),
    url('/contact'),
    url('/accessibilite'),
    url('/mentions-legales')
  ]
  epciList().forEach((epci) => {
    content.push(url(`/epci/${epci.code}`))
  })
  res.header('Content-Type', 'text/plain')
  res.send(content.join('\n'))
})

router.get('*', async (req, res) => {
  const epcis = await epciList()
  res.status(404)
  res.render('404', {
    epcis
  })
})

module.exports = router
