// provides an util for parsing URL options into a dictionary
import type { Request } from 'express'
import { AgriculturalPractices, type PracticeId } from '../../calculations/constants.ts'
import { Occupations, Projects, DEFAULT_PROJECT, type Occupation, type ProjectId } from '../../calculations/catenr/constants.ts'
import { getEpci, getCommune } from '../../calculations/locations.ts'
import type { CatenrInputs, CatenrRowInput } from '../../calculations/catenr/index.ts'
import type { Location } from '../../data/types.ts'

export type Query = Request['query']

// Un paramètre d'URL peut être absent, répété (tableau) ou imbriqué : seules les
// valeurs simples sont retenues.
function queryString (value: Query[string]): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export interface Options {
  areas: Record<string, number>
  areaChanges: Record<string, number>
  woodCalculation: string
  agriculturalPracticesEstablishedAreas: Partial<Record<PracticeId, number>>
  fluxHaveModifications: boolean
  stocksHaveModifications: boolean
}

export function parseOptionsFromQuery (query: Query): Options {
  // check request to determine if any area overrides have been specified for stocks and flux
  let stocksHaveModifications = false
  let fluxHaveModifications = false
  const areaOverrides: Record<string, number> = {}
  Object.keys(query).filter(key => key.startsWith('surface_')).forEach(key => {
    const groundType = key.slice('surface_'.length).replace(/_/g, ' ')
    const area = parseFloat(queryString(query[key]) ?? '')
    areaOverrides[groundType] = area
    if (!isNaN(area)) {
      stocksHaveModifications = true
    }
  })
  const areaChangeOverrides: Record<string, number> = {}
  Object.keys(query).filter(key => key.startsWith('change_')).forEach(key => {
    const groundType = key.slice('change_'.length)
    const area = parseFloat(queryString(query[key]) ?? '')
    areaChangeOverrides[groundType] = area
    if (!isNaN(area)) {
      fluxHaveModifications = true
    }
  })
  // check if there are agricultural practices area additions
  const agriculturalPracticesEstablishedAreas: Partial<Record<PracticeId, number>> = {}
  Object.keys(query).filter(key => key.startsWith('ap_')).forEach(key => {
    const practice = key.slice('ap_'.length)
    const id = AgriculturalPractices.find(ap => ap.url === practice)?.id
    if (!id) return
    const area = parseFloat(queryString(query[key]) ?? '')
    agriculturalPracticesEstablishedAreas[id] = area
    if (!isNaN(area)) {
      fluxHaveModifications = true
    }
  })

  // prepare configuration to be passed to stocks and flux fetching
  const woodCalculation = queryString(query['répartition_produits_bois']) || 'récolte'
  return {
    areas: areaOverrides,
    areaChanges: areaChangeOverrides,
    woodCalculation,
    agriculturalPracticesEstablishedAreas,
    fluxHaveModifications,
    stocksHaveModifications
  }
}

// Les saisies de l'outil CAT'ENR sont portées par l'URL, comme les autres
// personnalisations d'ALDO. Les paramètres sont préfixés par `cat_` et utilisent
// des codes courts (cf. calculations/catenr/constants.ts) pour limiter leur longueur.
export function parseCatenrFromQuery (query: Query): CatenrInputs & { projectType: ProjectId, rows: Record<string, CatenrRowInput>, practices: Partial<Record<PracticeId, number>>, hasModifications: boolean } {
  const number = (value: Query[string]) => {
    const parsed = parseFloat(queryString(value) ?? '')
    return isNaN(parsed) ? undefined : parsed
  }
  const percentage = (value: Query[string]) => {
    const parsed = number(value)
    return parsed === undefined ? undefined : parsed / 100
  }
  const occupation = (code: Query[string]): Occupation | undefined => Occupations.find((o) => o.code === code)?.id

  // Les codes des lignes sont distincts d'une technologie à l'autre : les saisies
  // photovoltaïques et éoliennes peuvent donc coexister dans l'URL, seules celles
  // de la technologie sélectionnée étant lues.
  const project = Projects.find((p) => p.id === query.cat_type) ?? Projects.find((p) => p.id === DEFAULT_PROJECT)
  if (!project) throw new Error('No CAT\'ENR project defined')
  const projectType = project.id

  const rows: Record<string, CatenrRowInput> = {}
  let hasModifications = false
  project.rows.forEach((definition) => {
    const prefix = `cat_${definition.code}_`
    const row: CatenrRowInput = {
      area: number(query[prefix + 's']),
      wetlandShare: percentage(query[prefix + 'zh']),
      age: number(query[prefix + 'age']),
      biomassStock: number(query[prefix + 'bio']),
      initialOccupation: occupation(query[prefix + 'i']),
      finalOccupation: occupation(query[prefix + 'f'])
    }
    if (Object.values(row).some((value) => value !== undefined)) {
      hasModifications = true
    }
    rows[definition.id] = row
  })

  // Pratiques agricoles stockantes, avec les identifiants d'URL de l'onglet
  // « Pratiques agricoles » d'ALDO.
  const practices: Partial<Record<PracticeId, number>> = {}
  AgriculturalPractices.forEach((practice) => {
    const area = number(query[`cat_ap_${practice.url}`])
    if (area === undefined || !Number.isFinite(area) || area < 0) return
    practices[practice.id] = area
    hasModifications = true
  })

  // Données descriptives du parc (nombre d'éoliennes, surface au sol des fondations) :
  // elles ne participent pas au calcul de la variation des stocks, comme dans le
  // tableur (cellules F19 et F30 de l'onglet « 2.Eolien Caractéristiques »).
  const commonFields = ['cat_duree', 'cat_surface', 'cat_nb', 'cat_fond']
  return {
    projectType,
    lifespan: number(query.cat_duree),
    totalArea: number(query.cat_surface),
    turbineCount: number(query.cat_nb),
    foundationArea: number(query.cat_fond),
    rows,
    practices,
    hasModifications: hasModifications || commonFields.some((field) => query[field] !== undefined)
  }
}

export function getLocationDetail (req: Request): Location | undefined {
  // TODO: remove option for single epci and single commune
  if (req.params.epci) {
    const epci = getEpci(req.params.epci, true)
    if (epci) return { epci }
  } else if (req.params.commune) {
    const commune = getCommune(req.params.commune, true)
    if (commune) return { commune }
  } else if (req.query.communes || req.query.epcis) {
    const location: Required<Pick<Location, 'communes' | 'epcis'>> = { communes: [], epcis: [] }
    if (Array.isArray(req.query.communes)) {
      location.communes = req.query.communes.map((c) => getCommune(String(c), true)).filter((c) => c !== undefined)
    }
    if (Array.isArray(req.query.epcis)) {
      location.epcis = req.query.epcis.map((c) => getEpci(String(c), true)).filter((e) => e !== undefined)
    }
    if (location.communes.length || location.epcis.length) {
      return location
    }
  }
}
