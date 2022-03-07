const { getStocks } = require("./index")
const { getEpci } = require("../epcis")

test('returns stocks for a valid EPCI', async () => {
  expect(await getStocks({epci: await getEpci("CC Faucigny-Glières")}, { woodCalculation: "consommation" })).toEqual({
    cultures: 95097.48957450179,
    prairies: 243059.8882460637,
    "zones humides": 6813.237073875,
    vergers: 0,
    vignes: 0,
    "sols artificiels": 67419.8784202608,
    haies: 5085.895944561377,
    "forêts": 1127615.0067169224,
    "produits bois": 49170.62093925741,
  })
})

// TODO: test bois récolte calculation option

test('returns EPCI information for name and other info where present', async () => {
  const info = await getEpci("CC Faucigny-Glières")
  expect(info.code).toBe("200000172")
  expect(info.membres).toBeDefined()
  expect(info.populationTotale).toBe(27164)
})
