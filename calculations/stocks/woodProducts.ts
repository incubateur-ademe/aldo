import {
  getFranceStocksWoodProducts,
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest,
  type WoodCategory
} from '../../data/stocks.ts'
import { getPopulationTotal } from '../../data/index.ts'
import type { Location } from '../../data/types.ts'

function getStocksByConsumption (location: Location) {
  const popTotal = getPopulationTotal()
  const population = (location.epci ? location.epci.population : location.commune?.population) || 0
  const proportion = population / popTotal
  const franceStocks = getFranceStocksWoodProducts()
  const biStock = proportion * franceStocks.bi
  const boStock = proportion * franceStocks.bo
  const stock = biStock + boStock
  return {
    totalReservoirStock: stock,
    totalStock: stock,
    localPopulation: population,
    francePopulation: popTotal,
    portionPopulation: proportion,
    biFranceStocksTotal: franceStocks.bi,
    boFranceStocksTotal: franceStocks.bo,
    biStock,
    boStock
  }
}

function getStocksByHarvest (location: Location) {
  const localAnnualWoodProductsHarvest = getAnnualWoodProductsHarvest(location)
  const franceAnnualWoodProductsHarvest = getAnnualFranceWoodProductsHarvest()
  const franceStocksByCategory = getFranceStocksWoodProducts()

  function portion (category: WoodCategory) {
    return localAnnualWoodProductsHarvest[category] / franceAnnualWoodProductsHarvest[category]
  }
  function stockByProportionHarvest (category: WoodCategory) {
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

export function getStocksWoodProducts (location: Location, calculationMethod?: string) {
  if (calculationMethod === 'consommation') {
    return getStocksByConsumption(location)
  } else { // default is to use harvest calculations
    return getStocksByHarvest(location)
  }
}
