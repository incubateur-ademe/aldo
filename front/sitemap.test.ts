import { get } from 'node:http'
import type { AddressInfo } from 'node:net'
import app from '../app.ts'

// fetch ignore l'en-tête Host : node:http l'envoie tel quel, comme le proxy.
async function firstSitemapLine (headers: Record<string, string>): Promise<string> {
  const server = app.listen(0)
  try {
    const { port } = server.address() as AddressInfo
    const body = await new Promise<string>((resolve, reject) => {
      get({ port, path: '/sitemap.txt', headers }, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => resolve(data))
      }).on('error', reject)
    })
    return body.split('\n')[0]
  } finally {
    server.close()
  }
}

afterEach(() => { delete process.env.BASE_URL })

// Sans BASE_URL, les liens absolus viennent de la requête : derrière le proxy
// (ici la boucle locale, de confiance), X-Forwarded-Proto et Host donnent l'URL publique.
test('sitemap.txt construit ses liens depuis la requête', async () => {
  expect(await firstSitemapLine({ Host: 'aldo.example.fr', 'X-Forwarded-Proto': 'https' })).toBe('https://aldo.example.fr/')
})

test('sitemap.txt sans proxy garde le protocole de la connexion', async () => {
  expect(await firstSitemapLine({ Host: 'localhost:8080' })).toBe('http://localhost:8080/')
})

test('BASE_URL fixe l\'URL canonique, quels que soient les en-têtes', async () => {
  process.env.BASE_URL = 'https://aldo-carbone.ademe.fr/'
  expect(await firstSitemapLine({ Host: 'evil.example', 'X-Forwarded-Proto': 'http' })).toBe('https://aldo-carbone.ademe.fr/')
})
