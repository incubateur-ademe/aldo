const { getArea, getCarbonDensity, getBiomassCarbonDensity } = require("../../data")

async function getStocksByKeyword(location, keyword) {
  return await getArea(location, keyword) * (await getCarbonDensity(location, keyword) + await getBiomassCarbonDensity(location, keyword))
}

async function getStocksPrairies(location) {
  const groundCarbonType = "prairies"
  const biomassTypes = [
    "prairies zones arborées",
    "prairies zones herbacées",
    "prairies zones arbustives",
  ]
  let stocks = 0
  for (const biomassType of biomassTypes) {
    const totalStocksDensity = await getCarbonDensity(location, groundCarbonType) + await getBiomassCarbonDensity(location, biomassType)
    stocks += await getArea(location, biomassType) * totalStocksDensity
  }
  return stocks
}

// TODO: break this function down with unit tests
async function getStocksSolsArtificiels(location) {
  // there are three different types of arificial ground to consider:
  // * impermeable
  // * with trees
  // * with other greenery (shrubbery, grass etc)

  // start by estimating the area taken by each
  const areaWithoutTrees = await getArea(location, "sols artificiels non-arborés")
  const areaWithTrees = await getArea(location, "sols arborés")
  const totalArea = areaWithoutTrees + areaWithTrees

  // TODO: are there sources to cite for these estimates?
  const estimatedPortionImpermeable = 0.8
  const estimatedPortionGreen = 0.2

  // TODO: ask why proportion of areaWithTrees in both cases is important
  let areaImpermeable = 0
  if(areaWithTrees < 0.2 * totalArea) {
    areaImpermeable = estimatedPortionImpermeable * totalArea
  } else {
    // TODO: ask why subtracting areaWithTrees here
    areaImpermeable = areaWithoutTrees - areaWithTrees
  }

  let areaShrubby = 0
  if(areaWithTrees < 0.2 * (areaImpermeable + areaWithTrees)) {
    // TODO: ask why areaWithTrees included when running the % estimate and then subtracted,
    // instead of just leaving it out
    areaShrubby = estimatedPortionGreen * (areaWithoutTrees + areaWithTrees) - areaWithTrees
  }

  let cDensityImpermeable = await getCarbonDensity(location, "sols artificiels imperméabilisés")
  cDensityImpermeable += await getBiomassCarbonDensity(location, "sols artificiels imperméabilisés")
  const stocksImpermeable = areaImpermeable * cDensityImpermeable

  let cDensityShrubby = await getCarbonDensity(location, "sols artificiels enherbés")
  cDensityShrubby += await getBiomassCarbonDensity(location, "sols artificiels arbustifs")
  const stocksShrubby = areaShrubby * cDensityShrubby

  let cDensityTrees = await getCarbonDensity(location, "sols artificiels arborés et buissonants")
  cDensityTrees += await getBiomassCarbonDensity(location, "sols artificiels arborés et buissonants")
  const stocksTrees = areaWithTrees * cDensityTrees

  return stocksImpermeable + stocksShrubby + stocksTrees
}

async function getStocks(location) {
  return {
    cultures: await getStocksByKeyword(location, "cultures"),
    prairies: await getStocksPrairies(location),
    "zones humides": await getStocksByKeyword(location, "zones humides"),
    vergers: await getStocksByKeyword(location, "vergers"),
    vignes: await getStocksByKeyword(location, "vignes"),
    "sols artificiels": await getStocksSolsArtificiels(location),
  }
}

module.exports = {
  getStocks,
}



// --------- old stuff

// const { getEpci } = require("../epcis")

// // TODO:
// // where does location aggregation logic go?
// // remember we also want ha for each land type
// // nice display of data
// // think about what data graph display will need
// // develop from top down - mocking out layer below each time 

// const groundTypes1 = [ // probably should be imported from data
//   "cultures",
//   "vignes",
// ]

// function getStockForEpci(groundType, epciSiren) {
//   switch (groundType) {
//     case "cultures":
//       return 50
//     default:
//       return 100
//   }
// }

// function getStock(location, groundType) {
//   switch (groundType) {
//     case "cultures":
//       return 50
//     default:
//       return 100
//   }
// }

// function getStocks(locations) {
//   // initialise stocks aggregation - TODO: should be handled in /aggregatedData, or /data/aggregation/ ?
//   let stocks = {}
//   groundTypes1.forEach(type => stocks[type] = 0)
//   const epcis = locations.epcis
//   epcis.forEach(epciName => {
//     const epci = getEpci(epciName)
//     groundTypes1.forEach(type => {
//       stocks[type] = getStockForEpci(type, epci.siren)
//     })
//   })
//   return stocks
// }

// function getSummary(locations) {
//   let summary = {}
//   summary.locations = locations.epcis.map(locationName => getEpci(locationName))
//   const allStocks = getStocks(locations)
//   summary.stocks = groundTypes1.map(type => ({
//     groundType: type,
//     value: allStocks[type]
//   }))
//   // TODO summary.stockTotal
//   return summary
// }

// module.exports = {
//   getSummary,
//   getStock,
// }
