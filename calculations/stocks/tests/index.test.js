const { getStock, getStocks } = require("../index")


test('returns stock for EPCI', () => {
  expect(getStock({epci: '1'}, "cultures")).toBe(50)
})

test('returns all stocks and total for EPCI', () => {
  expect(getStocks({epci: '1'})).toEqual({
    cultures: 50,
    total: 50,
  })
})