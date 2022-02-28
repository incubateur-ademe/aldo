
const express = require('express')
const router = express.Router()
const path = require('path')
const rootFolder = path.join(__dirname, '../')
// TODO: add back
// const stocksSummary = require(path.join(rootFolder, './calculations/stocks/summary'))
const { epcisList } = require(path.join(rootFolder, './calculations/epcis'))

router.get('/', (req, res) => {
  res.render('landing', { epcis: epcisList })
})

router.get('/territoire', (req,res)=>{
  const epciName = req.query.epci
  // const summary = stocksSummary({ epcis: [epciName] })
  const epci = summary.locations[0]
  res.render('territoire', { 
    pageTitle: `${epci.nom}`,
    epci,
    // TODO: make this an actual variable
    summary: 50,
  })
})

router.get('/ressources', (req, res) => {
  res.render('ressources', {
    pageTitle: 'Ressources'
  })
})

router.get('/formulaire', (req, res) => {
  res.render('form', {
    pageTitle: 'Formulaire'
  })
})

router.get('/contact', (req, res) => {
  res.render('contact', {
    pageTitle: 'Contact'
  })
})

router.get('/accessibilite', (req, res) => {
  res.render('accessibilite', {
    pageTitle: 'Accessibilité'
  })
})

router.get('/components', (req, res) => {
  res.render('components', {
    pageTitle: 'Composants'
  })
})

router.get('/colors', (req, res) => {
  res.render('colors', {
    pageTitle: 'Couleurs'
  })
})

router.get('/typography', (req, res) => {
  res.render('typography', {
    pageTitle: 'Typographie'
  })
})

router.get('/mentions-legales', (req, res) => {
  res.render('legalNotice', {
    pageTitle: "Mentions légales",
    contactEmail: 'mon-produit@beta.gouv.fr',
  })
})

module.exports = router
