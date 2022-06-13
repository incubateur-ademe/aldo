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
  const bo = franceFlux.bo * proportion
  const bi = franceFlux.bi * proportion
  return [
    {
      to: 'produits bois',
      gas: 'CO2',
      category: 'bo',
      value: bo,
      co2e: bo,
      localPopulation: epciPop,
      francePopulation: popTotal,
      localPortion: proportion,
      franceSequestration: franceFlux.bo
    },
    {
      to: 'produits bois',
      gas: 'CO2',
      category: 'bi',
      value: bi,
      co2e: bi,
      localPopulation: epciPop,
      francePopulation: popTotal,
      localPortion: proportion,
      franceSequestration: franceFlux.bi
    }
  ]
}

function getFluxByHarvest (location) {
  location = { epci: location.epci.code } // see getFlux
  const allLocalHarvest = getAnnualWoodProductsHarvest(location)
  const allFranceHarvest = getAnnualFranceWoodProductsHarvest()
  const franceSequestration = getFranceFluxWoodProducts()

  const franceHarvest = (category) => allFranceHarvest.coniferes[category] + allFranceHarvest.feuillus[category]
  const localHarvest = (category) => allLocalHarvest.coniferes[category] + allLocalHarvest.feuillus[category]

  const boPortion = localHarvest('bo') / franceHarvest('bo')
  const bo = boPortion * franceSequestration.bo

  const biPortion = localHarvest('bi') / franceHarvest('bi')
  const bi = biPortion * franceSequestration.bi

  return [
    {
      to: 'produits bois',
      gas: 'CO2',
      category: 'bo',
      value: bo,
      co2e: bo,
      localHarvest: localHarvest('bo'),
      franceHarvest: franceHarvest('bo'),
      localPortion: boPortion,
      franceSequestration: franceSequestration.bo
    },
    {
      to: 'produits bois',
      gas: 'CO2',
      category: 'bi',
      value: bi,
      co2e: bi,
      localHarvest: localHarvest('bi'),
      franceHarvest: franceHarvest('bi'),
      localPortion: biPortion,
      franceSequestration: franceSequestration.bi
    }
  ]
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
