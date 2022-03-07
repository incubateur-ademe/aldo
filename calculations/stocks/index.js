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

async function getStocksHaies(location) {
  // TODO: ask more about this calculation - reusing forest carbon density?
  const carbonDensity = await getBiomassCarbonDensity(location, "forêt mixte")
  const area = await getArea(location, "haies")
  return carbonDensity * area
}

// TODO: put in check for if the locations given are valid and findable?
// Or maybe put this error throwing at the lowest level and let them bubble up
async function getStocks(location) {
  return {
    cultures: await getStocksByKeyword(location, "cultures"),
    prairies: await getStocksPrairies(location),
    "zones humides": await getStocksByKeyword(location, "zones humides"),
    vergers: await getStocksByKeyword(location, "vergers"),
    vignes: await getStocksByKeyword(location, "vignes"),
    "sols artificiels": await getStocksSolsArtificiels(location),
    haies: await getStocksHaies(location),
  }
}

module.exports = {
  getStocks,
}
