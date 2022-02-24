const { getEpci } = require("../epcis")

// TODO:
// where does location aggregation logic go?
// remember we also want ha for each land type
// nice display of data
// think about what data graph display will need
// develop from top down - mocking out layer below each time 

const groundTypes1 = [ // probably should be imported from data
  "cultures",
  "vignes",
]

function getStockForEpci(groundType, epciSiren) {
  switch (groundType) {
    case "cultures":
      return 50
    default:
      return 100
  }
}

function getStock(location, groundType) {
  switch (groundType) {
    case "cultures":
      return 50
    default:
      return 100
  }
}

function getStocks(locations) {
  // initialise stocks aggregation - TODO: should be handled in /aggregatedData, or /data/aggregation/ ?
  let stocks = {}
  groundTypes1.forEach(type => stocks[type] = 0)
  const epcis = locations.epcis
  epcis.forEach(epciName => {
    const epci = getEpci(epciName)
    groundTypes1.forEach(type => {
      stocks[type] = getStockForEpci(type, epci.siren)
    })
  })
  return stocks
}

function getSummary(locations) {
  let summary = {}
  summary.locations = locations.epcis.map(locationName => getEpci(locationName))
  const allStocks = getStocks(locations)
  summary.stocks = groundTypes1.map(type => ({
    groundType: type,
    value: allStocks[type]
  }))
  // TODO summary.stockTotal
  return summary
}

module.exports = {
  getSummary,
  getStock,
}
