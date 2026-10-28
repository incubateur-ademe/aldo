// Types des données JSON de data/ (générées par les scripts) et des localisations.
import type { StocksId } from '../calculations/constants.ts'

// dataByCommune/communes.json, généré par scripts/communes-calculations.ts.
// Les arrondissements n'ont ni nom ni population.
export interface Commune {
  insee: string
  nom?: string
  population?: number
  departement?: string
  region?: string
  epci?: string
  zpc?: string
  // surfaces converties par an (ha/an), de l'occupation initiale vers la finale
  changes?: Partial<Record<StocksId, Partial<Record<StocksId, number>>>>
  // surfaces (ha) par occupation
  citepa2021?: Partial<Record<StocksId, number>>
}

// dataByEpci/epcis.json, généré par scripts/communes-calculations.ts
export interface Epci {
  code: string
  nom?: string
  population?: number
  // codes INSEE des communes membres
  communes?: string[]
}

// dataByEpci/france.json, généré par scripts/epci-post-processing.ts
export interface FranceEpci {
  code: string
  nom: string
  nature: string
  nombreCommunes: number
  population: number
  // noms des communes membres
  communes: string[]
}
export interface FranceData {
  epcis: Record<string, FranceEpci>
  totalPopulation: number
}

export interface InterRegion {
  regionName: string
  interRegion: string
}

export interface Location {
  commune?: Commune
  epci?: Epci
  communes?: Commune[]
  epcis?: Epci[]
}
