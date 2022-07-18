const express = require('express')
const path = require('path')

const appName = 'Aldo'
const appDescription = 'Calculer le stock et les flux de carbone sur votre territoire'
const appRepo = 'https://github.com/datagir/aldo'

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './front/views'))

app.use('/static', express.static('./front/static'))
// Hack for importing css from npm package
app.use('/~', express.static(path.join(__dirname, 'node_modules')))
// Populate some variables for all views
app.use(function (req, res, next) {
  res.locals.appName = appName
  res.locals.appDescription = appDescription
  res.locals.appRepo = appRepo
  res.locals.page = req.url
  next()
})

const frontEndViews = require('./front/routes')
app.use('/', frontEndViews)

module.exports = app
