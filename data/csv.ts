// Types des lignes des fichiers CSV de data/, tels que produits par csvtojson :
// toutes les cellules sont des chaînes (éventuellement vides). Les conversions
// numériques se font à la lecture, dans les modules data/.
import type { CitepaCode, FluxId, StocksId } from '../calculations/constants.ts'

// dataByCommune/communes_17122018.csv
export interface CommuneCsvRow {
  nom: string
  insee: string
  population: string
  departement: string
  region: string
  epci: string
}

// dataByCommune/zpc.csv
export interface ZpcRow {
  insee: string
  zpc: string
}

// dataByCommune/stocks-zpc.csv : stocks de référence dans les sols (tC/ha) par ZPC
export const STOCKS_ZPC_COLUMNS = [
  'cultures',
  'prairies',
  'forêts',
  'zones humides',
  'vergers',
  'vignes',
  'Sols artificialisés',
  'sols artificiels imperméabilisés',
  'sols artificiels enherbés',
  'sols artificiels arborés et buissonants'
] as const
export type StocksZpcColumn = (typeof STOCKS_ZPC_COLUMNS)[number]
export type StocksZpcRow = { zpc: string } & Record<StocksZpcColumn, string>

// dataByCommune/flux-zpc.csv : flux de référence dans les sols (tC/ha/an) par ZPC.
// Seules les transitions documentées ont une colonne.
export type FluxZpcColumn = `${FluxId}_${FluxId}`
export type FluxZpcRow = { zpc: string } & Partial<Record<FluxZpcColumn, string>>

// dataByCommune/biomass-hors-forets.csv : stocks (tC/ha) et flux (tC/ha/an) de
// biomasse hors forêt, par inter-région
export type BiomassTransitionColumn = `${StocksId} vers ${StocksId}`
export type BiomassRow = { INTER_REG: string } & Partial<Record<StocksId | BiomassTransitionColumn, string>>

// dataByCommune/surface-foret.csv : surfaces forestières (ha) et localisations IGN
// (seules ces colonnes sont converties en JSON, cf. csvtojson.sh)
export type IgnLocalisationLevel = 'groupeser' | 'greco' | 'rad13' | 'bassin_populicole'
export interface SurfaceForetRow {
  INSEE_COM: string
  CODE_EPCI: string
  code_greco: string
  SUR_FEUILLUS: string
  SUR_RESINEUX: string
  SUR_MIXTES: string
  SUR_PEUPLERAIES: string
  code_groupeser: string
  code_rad13: string
  code_bassin_populicole: string
}

// dataByEpci/bilan-carbone-foret-par-localisation.IGN-*.csv
export type IgnComposition = 'Feuillu' | 'Conifere' | 'Mixte' | 'Peupleraie'
export interface IgnRow {
  type_localisation: string
  code_localisation: string
  nom_localisation: string
  composition: IgnComposition
  surface_ic: 's' | 'n.s'
  'surface_(ha)': string
  'volume_(m3)': string
  'volume_(m3∙ha-1)': string
  'carbone_(tC)': string
  'carbone_(tC∙ha-1)': string
  'bois_mort_volume_(m3)': string
  'bois_mort_volume_(m3∙ha-1)': string
  'bois_mort_carbone_(tC)': string
  'bois_mort_carbone_(tC∙ha-1)': string
  'production_volume_(m3∙an-1)': string
  'production_volume_(m3∙ha-1∙an-1)': string
  'production_carbone_(tC∙an-1)': string
  'production_carbone_(tC∙ha-1∙an-1)': string
  'prelevement_volume_(m3∙an-1)': string
  'prelevement_volume_(m3∙ha-1∙an-1)': string
  'prelevements_carbone_(tC∙an-1)': string
  'prelevement_carbone_(tC∙ha-1∙an-1)': string
  'mortalite_volume_(m3∙an-1)': string
  'mortalite_volume_(m3∙ha-1∙an-1)': string
  'mortalite_carbone_(tC∙an-1)': string
  'mortalite_carbone_(tC∙ha-1∙an-1)': string
  'bilan_volume_(m3∙an-1)': string
  'bilan_volume_(m3∙ha-1∙an-1)': string
  'bilan_carbone_(tC∙an-1)': string
  'bilan_carbone_(tC∙ha-1∙an-1)': string
  fexp_vol_carb: string
}

// dataByEpci/proportion-usage-bois-par-region.csv
export interface WoodProportionRow {
  code_localisation: string
  '% BO': string
  '% BI': string
}

// dataByCommune/carbone-haies.csv (par département)
export interface HedgerowCarbonRow {
  dep: string
  C_aerien_km: string
  C_tot_km: string
}

// dataByCommune/haie-clc18.csv : km de haies par commune et par code CLC
// (seules ces colonnes sont converties en JSON, et les CLC_* nuls sont retirés, cf. csvtojson.sh)
export interface HedgerowLengthRow extends Partial<Record<`CLC_${string}`, string>> {
  INSEE_COM: string
  INSEE_DEP: string
  TOTKM_HAIE: string
}

// dataByCommune/citepa-surfaces-2023.csv
export interface CitepaSurfaceRow {
  insee_com: string
  siren_epci: string
  usage_2021: CitepaCode
  surfaces_ha: string
}

// dataByCommune/citepa-flux-2013-2023.csv
export interface CitepaChangeRow {
  insee_com: string
  siren_epci: string
  usage_2013: CitepaCode
  usage_2023: CitepaCode
  surfaces_converties: string
}

// dataByEpci/epci.csv
export interface EpciCsvRow {
  code: string
  Commune: string
  'Nom unique': string
  nom: string
  nature: string
  nombreCommunes: string
  populationTotale: string
}
