import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import frontEndViews from './front/routes.ts'

const appName = 'ALDO'
const appDescription = 'Calculer le stock et les flux de carbone sur votre territoire'
const appRepo = 'https://github.com/datagir/aldo'

const app = express()
// Derrière un reverse proxy (Traefik sur Coolify) : req.protocol lit X-Forwarded-Proto,
// mais seulement si la requête vient d'une adresse locale ou privée (réseau Docker).
app.set('trust proxy', 'loopback, uniquelocal')

app.use(express.urlencoded({
  extended: true
}))
app.use(express.json())

app.set('view engine', 'ejs')
app.set('views', path.join(import.meta.dirname, './front/views'))

// Les données sont importées avant listen() : répondre suffit à prouver qu'elles sont chargées.
app.get('/healthz', (req, res) => res.sendStatus(200))

app.use('/static', express.static('./front/static'))
// Hack for importing css from npm package
app.use('/~', express.static(path.join(import.meta.dirname, 'node_modules')))
// Populate some variables for all views
app.use(function (req, res, next) {
  res.locals.appName = appName
  res.locals.appDescription = appDescription
  res.locals.appRepo = appRepo
  res.locals.page = req.url
  res.locals.slackCommunityUrl = process.env.SLACK_COMMUNITY_URL || '#'
  next()
})

app.use('/', frontEndViews)

export default app
