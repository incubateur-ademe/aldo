const {
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest
} = require('../../data/stocks')
const {
  getFranceFluxWoodProducts
} = require('../../data/flux')
const { epciList, getPopulationTotal } = require('../../data')

// TODO: refactor shared concepts between flux and stocks

function getFluxByConsumption (location) {
  const popTotal = getPopulationTotal(epciList())
  const epciPop = location.epci.populationTotale
  const proportion = epciPop / popTotal
  const franceFlux = getFranceFluxWoodProducts()
  return {
    flux: (franceFlux.bi + franceFlux.bo) * proportion
  }
}

function getFluxByHarvest (location) {
  location = { epci: location.epci.code } // see getFlux
  const localAnnualWoodProductsHarvest = getAnnualWoodProductsHarvest(location)
  const franceAnnualWoodProductsHarvest = getAnnualFranceWoodProductsHarvest()
  const franceFluxByCategory = getFranceFluxWoodProducts()

  function fluxByProportionHarvest (composition, category) {
    const franceHarvestCategoryTotal = franceAnnualWoodProductsHarvest.feuillus[category] + franceAnnualWoodProductsHarvest.coniferes[category]
    const proportionHarvest = localAnnualWoodProductsHarvest[composition][category] / franceHarvestCategoryTotal
    const franceFluxForCategory = franceFluxByCategory[category]
    return proportionHarvest * franceFluxForCategory
  }

  const feuillus = {
    bo: fluxByProportionHarvest('feuillus', 'bo'),
    bi: fluxByProportionHarvest('feuillus', 'bi')
  }
  // NB: in table sometimes referred to as résineux
  const coniferes = {
    bo: fluxByProportionHarvest('coniferes', 'bo'),
    bi: fluxByProportionHarvest('coniferes', 'bi')
  }
  const totalFlux = feuillus.bo + feuillus.bi + coniferes.bo + coniferes.bi
  return {
    flux: totalFlux
  }
}

function getFluxWoodProducts (location, calculationMethod) {
  if (calculationMethod === 'consommation') {
    return getFluxByConsumption(location)
  } else { // default is to use harvest calculations
    return getFluxByHarvest(location)
  }
}

module.exports = {
  getFluxWoodProducts
}
