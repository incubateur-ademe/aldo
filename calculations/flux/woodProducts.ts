import {
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest
} from '../../data/stocks.ts'
import { getFranceFluxWoodProducts, type Flux } from '../../data/flux.ts'
import { getPopulationTotal } from '../../data/index.ts'
import type { Location } from '../../data/types.ts'

// TODO: refactor shared concepts between flux and stocks

function getFluxByConsumption (location: Location): Flux[] {
  const popTotal = getPopulationTotal()
  const population = (location.epci ? location.epci.population : location.commune?.population) || 0
  const proportion = population / popTotal
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
      localPopulation: population,
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
      localPopulation: population,
      francePopulation: popTotal,
      localPortion: proportion,
      franceSequestration: franceFlux.bi
    }
  ]
}

function getFluxByHarvest (location: Location): Flux[] {
  const allLocalHarvest = getAnnualWoodProductsHarvest(location)
  const allFranceHarvest = getAnnualFranceWoodProductsHarvest()
  const franceSequestration = getFranceFluxWoodProducts()

  const boPortion = allLocalHarvest.bo / allFranceHarvest.bo
  const bo = boPortion * franceSequestration.bo

  const biPortion = allLocalHarvest.bi / allFranceHarvest.bi
  const bi = biPortion * franceSequestration.bi

  return [
    {
      to: 'produits bois',
      gas: 'CO2',
      category: 'bo',
      value: bo,
      co2e: bo,
      localHarvest: allLocalHarvest.bo,
      franceHarvest: allFranceHarvest.bo,
      localPortion: boPortion,
      franceSequestration: franceSequestration.bo
    },
    {
      to: 'produits bois',
      gas: 'CO2',
      category: 'bi',
      value: bi,
      co2e: bi,
      localHarvest: allLocalHarvest.bi,
      franceHarvest: allFranceHarvest.bi,
      localPortion: biPortion,
      franceSequestration: franceSequestration.bi
    }
  ]
}

export function getFluxWoodProducts (location: Location, calculationMethod?: string) {
  if (calculationMethod === 'consommation') {
    return getFluxByConsumption(location)
  } else { // default is to use harvest calculations
    return getFluxByHarvest(location)
  }
}
