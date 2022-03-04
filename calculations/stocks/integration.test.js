const { getStocks } = require("./index")

test('returns stocks for a valid EPCI', async () => {
  expect(await getStocks({epci: '200000172'})).toEqual({
    cultures: 95097.48957450179,
    prairies: 243059.8882460637,
    "zones humides": 6813.237073875,
    vergers: 0,
    vignes: 0,
    "sols artificiels": 67419.8784202608,
    // haies
    // forêts
    // produits bois
  })
})