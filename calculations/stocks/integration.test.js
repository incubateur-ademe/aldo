const { getStocks } = require('./index')
const { getEpci } = require('../epcis')

test('returns stocks for a valid EPCI', async () => {
  expect(await getStocks({ epci: await getEpci('CC Faucigny-Glières') }, { woodCalculation: 'consommation' })).toEqual({
    cultures: {
      stock: 95097.48957450179,
      stockPercentage: 6,
      area: 1740.7313534999998
    },
    prairies: {
      stock: 243059.8882460637,
      stockPercentage: 15.2,
      area: 2599.15354877
    },
    'zones humides': {
      stock: 6813.237073875,
      stockPercentage: 0.4,
      area: 54.505896590999996
    },
    vergers: {
      stock: 0,
      stockPercentage: 0,
      area: 0
    },
    vignes: {
      stock: 0,
      stockPercentage: 0,
      area: 0
    },
    'sols artificiels': {
      stock: 67419.8784202608,
      stockPercentage: 4.2,
      area: 1530.1300535000003
    },
    haies: {
      stock: 5085.895944561377,
      stockPercentage: 0.3,
      area: 61.68869213
    },
    forêts: {
      stock: 1127615.0067169224,
      stockPercentage: 70.7,
      area: 6456.9392066
    },
    'produits bois': {
      stock: 49170.62093925741,
      stockPercentage: 3.1
    }
  })
})

// TODO: test bois récolte calculation option

test('returns EPCI information for name and other info where present', async () => {
  const info = await getEpci('CC Faucigny-Glières')
  expect(info.code).toBe('200000172')
  expect(info.membres).toBeDefined()
  expect(info.populationTotale).toBe(27164)
})
