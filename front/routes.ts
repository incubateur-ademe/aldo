import express, { type Request, type Response } from 'express'
import { epciList, communeList } from '../data/index.ts'
import sendinblue from '../sendinblue.ts'
import { territoryHandler } from './handlers/territory.ts'
import { excelExportHandler } from './handlers/excelExport.ts'
import { newsletterHandler } from './handlers/newsletter.ts'

const router = express.Router()

router.get('/', async (req, res) => {
  res.render('landing', {
    epcis: epciList(),
    communes: communeList(),
    isHomepage: true
  })
})

async function groupingHandler (req: Request, res: Response) {
  const { epcis, communes } = req.query
  if (Array.isArray(epcis) && !communes) {
    if (epcis.length === 1) {
      return res.redirect('/epci/' + epcis[0])
    }
  }
  if (Array.isArray(communes) && !epcis) {
    if (communes.length === 1) {
      return res.redirect('/commune/' + communes[0])
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
  const recipient = process.env.ALDO_EMAIL
  if (!recipient) {
    console.error('Error sending contact form: ALDO_EMAIL is not set')
    return res.redirect('/contact?statut=500')
  }

  // Format the message with sender information
  const formattedMessage = `
Nom: ${name}
Email: ${email}
Sujet: ${subject}

Message:
${message}
`

  sendinblue({
    sender: {
      email: 'no-reply@territoiresentransitions.fr',
      name: 'Contact ALDO'
    },
    to: [{ email: recipient }],
    replyTo: { email },
    subject: `[Contact ALDO] ${subject}`,
    textContent: formattedMessage
  }).then(() => {
    res.redirect('/contact?statut=succès')
  }).catch((error: { status?: number, response?: { text?: string } }) => {
    console.error(
      'Error sending contact form.\nStatus: ',
      error.status,
      '\nError:\n',
      error.response?.text
    )
    res.redirect('/contact?statut=' + error.status)
  })
})

router.post('/api/newsletter', newsletterHandler)

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
  function url (path: string) {
    return `${(process.env.PROTOCOL ?? 'http').toLowerCase()}://${process.env.HOSTNAME}${path}`
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
  const epcis = epciList()
  res.status(404).render('404', {
    epcis
  })
})

export default router
