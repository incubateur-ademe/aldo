const {
  getPopulationTotal,
  getFranceStocksWoodProducts,
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest,
  epciList
} = require('../../data')

function co2ToCarbon (co2) {
  return co2 * 12 / 44
}

function getStocksByConsumption (location) {
  const popTotal = getPopulationTotal(epciList())
  const epciPop = location.epci.populationTotale
  const proportion = epciPop / popTotal
  const franceStocks = getFranceStocksWoodProducts()
  return {
    stock: co2ToCarbon((franceStocks.bi + franceStocks.bo) * proportion)
  }
}

function getStocksByHarvest (location) {
  location = { epci: location.epci.code } // see getStocks
  const localAnnualWoodProductsHarvest = getAnnualWoodProductsHarvest(location)
  const franceAnnualWoodProductsHarvest = getAnnualFranceWoodProductsHarvest()
  const franceStocksByCategory = getFranceStocksWoodProducts()

  function stockByProportionHarvest(composition, category) {
    const franceHarvestCategoryTotal = franceAnnualWoodProductsHarvest.feuillus[category] + franceAnnualWoodProductsHarvest.coniferes[category]
    const proportionHarvest = localAnnualWoodProductsHarvest[composition][category] / franceHarvestCategoryTotal
    const franceStocksForCategory = franceStocksByCategory[category]
    return proportionHarvest * franceStocksForCategory
  }

  const feuillus = {
    bo: stockByProportionHarvest('feuillus', 'bo'),
    bi: stockByProportionHarvest('feuillus', 'bi')
  }
  // NB: in table sometimes referred to as résineux
  const coniferes = {
    bo: stockByProportionHarvest('coniferes', 'bo'),
    bi: stockByProportionHarvest('coniferes', 'bi')
  }
  const totalStocks = feuillus.bo + feuillus.bi + coniferes.bo + coniferes.bi
  return {
    stock: co2ToCarbon(totalStocks)
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