const {
  getFranceStocksWoodProducts,
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest
} = require('../../data/stocks')
const { getPopulationTotal } = require('../../data')

function getStocksByConsumption (location) {
  const popTotal = getPopulationTotal()
  const epciPop = location.epci.populationTotale
  const proportion = epciPop / popTotal
  const franceStocks = getFranceStocksWoodProducts()
  const biStock = proportion * franceStocks.bi
  const boStock = proportion * franceStocks.bo
  const stock = biStock + boStock
  return {
    totalReservoirStock: stock,
    totalStock: stock,
    localPopulation: epciPop,
    francePopulation: popTotal,
    portionPopulation: proportion,
    biFranceStocksTotal: franceStocks.bi,
    boFranceStocksTotal: franceStocks.bo,
    biStock,
    boStock
  }
}

function getStocksByHarvest (location) {
  const localAnnualWoodProductsHarvest = getAnnualWoodProductsHarvest(location)
  const franceAnnualWoodProductsHarvest = getAnnualFranceWoodProductsHarvest()
  const franceStocksByCategory = getFranceStocksWoodProducts()

  function portion (category) {
    return localAnnualWoodProductsHarvest[category] / franceAnnualWoodProductsHarvest[category]
  }
  function stockByProportionHarvest (category) {
    const franceHarvestCategoryTotal = franceAnnualWoodProductsHarvest[category]
    const proportionHarvest = localAnnualWoodProductsHarvest[category] / franceHarvestCategoryTotal
    const franceStocksForCategory = franceStocksByCategory[category]
    return proportionHarvest * franceStocksForCategory
  }
  const boStock = stockByProportionHarvest('bo')
  const biStock = stockByProportionHarvest('bi')
  const totalStock = boStock + biStock
  return {
    totalReservoirStock: totalStock,
    totalStock,
    boLocalHarvestTotal: localAnnualWoodProductsHarvest.bo,
    biLocalHarvestTotal: localAnnualWoodProductsHarvest.bi,
    localHarvestTotal: localAnnualWoodProductsHarvest.all,
    boFranceHarvestTotal: franceAnnualWoodProductsHarvest.bo,
    biFranceHarvestTotal: franceAnnualWoodProductsHarvest.bi,
    boPortion: portion('bo'),
    biPortion: portion('bi'),
    boFranceStocksTotal: franceStocksByCategory.bo,
    biFranceStocksTotal: franceStocksByCategory.bi,
    boStock,
    biStock
  }
}

function getStocksWoodProducts (location, calculationMethod) {
  if (calculationMethod === 'consommation') {
    return getStocksByConsumption(location)
  } else { // default is to use harvest calculations
    return getStocksByHarvest(location)
  }
}

module.exports = {
  getStocksWoodProducts
}
