const { getIgnLocalisation } = require('./shared')

// TODO: move this file to a folder that both layers can rely on to not completely break
// dependency tree
const { GroundTypes } = require('../calculations/constants')

function handleGroundCarbonFluxExceptions (location, from, to) {
  const saArbId = 'sols artificiels arborés et buissonants'
  const saImpId = 'sols artificiels imperméabilisés'
  const saEnhId = 'sols artificiels arbustifs'
  const vergersId = 'vergers'
  const vignesId = 'vignes'
  const culturesId = 'cultures'
  const zhId = 'zones humides'
  if (from === culturesId) {
    if (to === vergersId || to === vignesId) return 0
  } else if (from.startsWith('prairies')) {
    if (to === saArbId) {
      // doesn't matter which forest subtype used here
      return getAnnualGroundCarbonFlux(location, from, 'forêt mixte')
    } else if (to === saEnhId) return 0
  } else if (from.startsWith('forêt')) {
    if (to === saArbId) return 0
  } else if (from === zhId) {
    if (to === vergersId || to === vignesId) {
      return getAnnualGroundCarbonFlux(location, from, culturesId)
    } else if (to === saImpId) {
      return getAnnualGroundCarbonFlux(location, from, culturesId) + getAnnualGroundCarbonFlux(location, culturesId, saImpId)
    } else if (to === 'sols artificiels arbustifs') {
      // doesn't matter which prairie subtype used here
      return getAnnualGroundCarbonFlux(location, from, 'prairies zones arbustives')
    } else if (to === saArbId) {
      // doesn't matter which forest subtype used here
      return getAnnualGroundCarbonFlux(location, from, 'forêt mixte')
    }
  } else if (from === vergersId) {
    if (to === culturesId) return 0
    else if (to === zhId || to.startsWith('sols')) {
      return getAnnualGroundCarbonFlux(location, culturesId, to)
    } else if (to === vignesId) return 0
  } else if (from === vignesId) {
    if (to === culturesId) return 0
    else if (to === zhId || to.startsWith('sols')) {
      return getAnnualGroundCarbonFlux(location, culturesId, to)
    } else if (to === vergersId) return 0
  } else if (from === saImpId) {
    return getAnnualGroundCarbonFlux(location, culturesId, to)
  } else if (from === saEnhId) {
    // doesn't matter which prairie subtype used here
    return getAnnualGroundCarbonFlux(location, 'prairies zones arbustives', to)
  } else if (from === saArbId) {
    // doesn't matter which forest subtype used here
    return getAnnualGroundCarbonFlux(location, 'forêt mixte', to)
  }
}

// TODO: incorporate yearsForFlux setting in here?
function getAnnualGroundCarbonFlux (location, from, to) {
  const commune = location.commune
  if (!commune) { console.log('getAnnualGroundCarbonFlux called with bad location', location); return 0 }

  const fromDetails = GroundTypes.find(groundType => groundType.stocksId === from)
  const toDetails = GroundTypes.find(groundType => groundType.stocksId === to)
  if (fromDetails.fluxId === toDetails.fluxId) return 0

  const exceptionValue = handleGroundCarbonFluxExceptions(location, from, to)
  if (exceptionValue || exceptionValue === 0) return exceptionValue
  // normal flux value lookup
  const zpc = commune.zpc

  const fluxForZpcs = require('./dataByCommune/flux-zpc.csv.json')
  const fluxForZpc = fluxForZpcs.find(data => data.zpc === zpc)
  if (!fluxForZpc) { console.log('No ZPC for commune', commune.insee, zpc); return }

  const key = fromDetails.fluxId + '_' + toDetails.fluxId

  const dataValue = fluxForZpc[key]
  if (dataValue) {
    return parseFloat(dataValue)
  } else {
    // console.log('ZPC does not have value for key', zpc, key, fromDetails, toDetails)
  }
}

function getForestLitterFlux (from, to) {
  const forestChildTypes = ['forêt mixte', 'forêt feuillu', 'forêt conifere', 'forêt peupleraie']
  // TODO: why the addition of impermeabilisés?
  const fromTypes = forestChildTypes.concat(['sols artificiels arborés et buissonants', 'sols artificiels imperméabilisés'])
  const toTypes = forestChildTypes.concat(['sols artificiels arborés et buissonants'])
  if (forestChildTypes.includes(from) && !toTypes.includes(to)) {
    return -9
  } else if (!fromTypes.includes(from) && toTypes.includes(to)) {
    return 9
  }
}

const REGION_TO_INTER_REGION = require('./dataByCommune/region-to-inter-region.json')

function getBiomassFlux (location, from, to) {
  if (!location.commune?.region) {
    // console.log('No region for commune', location)
    return 0
  }
  const csvFilePath = './dataByCommune/biomass-hors-forets.csv'
  const interRegionData = require(csvFilePath + '.json')
  const interRegionForCommune = REGION_TO_INTER_REGION[location.commune.region]?.interRegion
  if (!location.commune?.region) {
    console.log('No inter-region found for region of commune', location)
    return 0
  }
  const data = interRegionData.find(data => data.INTER_REG === interRegionForCommune)
  let key = `${from} vers ${to}`
  // TODO: why is this done ? esp herbacés to imperméables
  const keyReplacements = {
    'prairies zones arbustives vers prairies zones arborées': 'prairies zones arbustives vers sols artificiels arborés et buissonants',
    'prairies zones herbacées vers prairies zones arborées': 'prairies zones herbacées vers sols artificiels arborés et buissonants',
    'prairies zones arborées vers prairies zones arbustives': 'prairies zones arborées vers sols artificiels arbustifs',
    'prairies zones herbacées vers prairies zones arbustives': 'prairies zones herbacées vers sols artificiels arbustifs',
    'prairies zones arborées vers prairies zones herbacées': 'prairies zones arborées vers sols artificiels imperméabilisés',
    'prairies zones arbustives vers prairies zones herbacées': 'prairies zones arbustives vers sols artificiels imperméabilisés',
    'sols artificiels arborés et buissonants vers sols artificiels arbustifs': 'sols artificiels arborés et buissonants vers prairies zones arbustives',
    'sols artificiels arborés et buissonants vers sols artificiels imperméabilisés': 'sols artificiels arborés et buissonants vers prairies zones herbacées',
    'sols artificiels arbustifs vers sols artificiels arborés et buissonants': 'zones humides vers prairies zones arborées',
    'sols artificiels arbustifs vers sols artificiels imperméabilisés': 'zones humides vers prairies zones herbacées',
    'sols artificiels imperméabilisés vers sols artificiels arborés et buissonants': 'sols artificiels imperméabilisés vers prairies zones arborées',
    'sols artificiels imperméabilisés vers sols artificiels arbustifs': 'sols artificiels imperméabilisés vers prairies zones arbustives'
  }
  key = keyReplacements[key] || key
  const dataValue = data[key]
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

// some flux data is annual, some is for the 20 year period. This function returns 1 or 20
// depending on what is required to normalise the fluxs to the same tCO2e/ha.
function yearMultiplier (reservoir, from, to) {
  const multiplier = 20
  if (reservoir === 'sol') {
    if (from === 'zones humides' || to === 'zones humides') {
      return 1
    } else if (to === 'sols artificiels imperméabilisés') {
      return 1
    } else if (to === 'sols artificiels arbustifs') {
      return 1
    } else if (to === 'sols artificiels arborés et buissonants') {
      return 1
    } else {
      return 20
    }
  } else if (reservoir === 'biomasse') {
    // not relevant for certain types
    const ignore = ['produits bois', 'sols artificiels']
    if (from.startsWith('forêt ') || to.startsWith('forêt ') || ignore.includes(from) || ignore.includes(to)) {
      return
    }
    // NB: the order here is very important, for example zones humides
    // always gives 20 except when going to sols imperméabilisés
    if (from === 'sols artificiels imperméabilisés') {
      return multiplier
    } else if (to === 'sols artificiels imperméabilisés') {
      return 1
    } else if (to === 'prairies zones arborées') {
      return multiplier
    } else if (from === 'prairies zones arborées') {
      return 1
    } else if (from === 'zones humides') {
      return multiplier
    } else if (to === 'zones humides') {
      return 1
    } else if (from === 'cultures') {
      return multiplier
    } else if (to === 'cultures') {
      return 1
    } else if (from === 'sols artificiels arborés et buissonants') {
      return 1
    } else if (to === 'sols artificiels arborés et buissonants') {
      return multiplier
    } else if (from === 'prairies zones herbacées') {
      return multiplier
    } else if (to === 'prairies zones herbacées') {
      return 1
    } else if (from === 'vergers') {
      return 1
    } else if (to === 'vergers') {
      return multiplier
    } else if (from === 'vignes') {
      return multiplier
    } else if (to === 'vignes') {
      return 1
    } else if (from === 'prairies zones arbustives') {
      return 1
    } else if (to === 'prairies zones arbustives') {
      return multiplier
    }
    // the remaining type is sols artificiels arbustifs, but any from/to combo has already
    // been covered by the above
  }
  console.log('ERROR: multiplier not found for combination of reservoir: ' + reservoir + ' from: ' + from + ' to: ' + to)
  return 1
}

// returns all known fluxes for from - to combinations
// TODO: could make more efficient by opening all the files and finding the location data once
function getFluxReferenceValues (location) {
  let fluxes = []
  for (const fromGt of GroundTypes) {
    const from = fromGt.stocksId
    for (const toGt of GroundTypes) {
      const to = toGt.stocksId
      if (from === to) {
        continue
      }
      if (fromGt.fluxId && toGt.fluxId && fromGt.fluxId !== toGt.fluxId) {
        const annualFlux = getAnnualGroundCarbonFlux(location, from, to)
        const yearsForFlux = yearMultiplier('sol', from, to)
        if (annualFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux,
            annualFluxEquivalent: cToCo2e(annualFlux),
            yearsForFlux,
            reservoir: 'sol',
            gas: 'C',
            commune: location.commune.insee
          })
        }
        const litterFlux = getForestLitterFlux(from, to)
        if (litterFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux: litterFlux,
            annualFluxEquivalent: cToCo2e(litterFlux),
            yearsForFlux: 1,
            reservoir: 'litière',
            gas: 'C',
            commune: location.commune.insee
          })
        }
      }
      const ignoreBiomass = ['prairies', 'haies', 'forêts']
      if (!ignoreBiomass.includes(from) && !ignoreBiomass.includes(to)) {
        const biomassFlux = getBiomassFlux(location, from, to)
        const yearsForFlux = yearMultiplier('biomasse', from, to)
        if (biomassFlux !== undefined) {
          fluxes.push({
            from,
            to,
            annualFlux: biomassFlux,
            annualFluxEquivalent: cToCo2e(biomassFlux),
            yearsForFlux,
            reservoir: 'biomasse',
            gas: 'C',
            commune: location.commune.insee
          })
        }
      }
    }
  }
  const forestBiomassFluxes = getForestBiomassFluxesByCommune(location)
  fluxes = fluxes.concat(forestBiomassFluxes)
  return fluxes
}

function cToCo2e (valueC) {
  return valueC * 44 / 12
}

function getAnnualSurfaceChange (location, options, from, to) {
  const yearlyAreaChange = location.commune.changes[from]?.[to] || 0
  const solsArtificielsException = getSolsArtificielsException(location, options, from, to, yearlyAreaChange)
  if (solsArtificielsException !== undefined) {
    return solsArtificielsException
  }
  return yearlyAreaChange
}

// Maps Citepa usage codes to ALDO stocksId
// Based on the new Citepa format where codes are already in ALDO nomenclature
// According to the brief, the Citepa data already corresponds to ALDO nomenclature
// Prefer leaf types (no children) over parent types when a code matches both
function mapCitepaCodeToStocksId (citepaCode) {
  if (!citepaCode) return null

  const matches = GroundTypes.filter(groundType => groundType.citepaCodes?.includes(citepaCode))
  const leafMatch = matches.find(gt => !gt.children)
  return (leafMatch || matches[0])?.stocksId || null
}

// Optimized getAnnualSurfaceChangeFromData using pre-indexed data
function getAnnualSurfaceChangeFromDataOptimized ({ commune, from, to, citepaDataByCommuneMap }) {
  const areaChangesForCommune = citepaDataByCommuneMap.get(commune.insee) || []
  const changesForGroundTypes = areaChangesForCommune.filter((change) => {
    const fromStocksId = mapCitepaCodeToStocksId(change.usage_2004)
    const toStocksId = mapCitepaCodeToStocksId(change.usage_2014)
    return fromStocksId === from && toStocksId === to
  })
  const totalAreaChange = changesForGroundTypes.reduce((acc, change) => {
    const area = parseFloat(change.surfaces_converties)
    return acc + (isNaN(area) ? 0 : area)
  }, 0)
  const yearsBetweenStudies = 10 // Période 2004-2014 = 10 ans
  const yearlyAreaChange = totalAreaChange / yearsBetweenStudies
  return yearlyAreaChange
}

// Business rules for sols artificiels transitions. Citepa data provides A_i, A_h, A_a
// separately, so we use direct values and only apply these rules.
function getSolsArtificielsException (location, options, from, to, yearlyAreaChange) {
  if (to === 'sols artificiels imperméabilisés') {
    if (from === 'sols artificiels arbustifs') return 0
  } else if (to === 'sols artificiels arbustifs') {
    if (from === 'sols artificiels imperméabilisés') return 0
  } else if (to === 'sols artificiels arborés et buissonants') {
    const none = ['sols artificiels arbustifs', 'prairies zones arborées', 'prairies zones arbustives', 'vergers', 'vignes', 'zones humides']
    if (none.indexOf(from) > -1) return 0
  }
  // Use direct Citepa value (return undefined to fall through)
}

// source: CITEPA 2016-2019. In tCO2/an
function getFranceFluxWoodProducts () {
  return {
    bo: 918160.6252,
    bi: 441532.8296
  }
}

// Source for the following data : IGN 2022
// given an EPCI, return an array of flux objects (as described in readme)
// with additional keys for:
// - commune INSEE code
// - ignLocalisationLevel (groupeser, greco, rad13, France)
// - ignLocalisationCode (e.g. A1, A, ARA, France)
// NB: can have multiple entries for one commune + forest composition combo,
//     because the land can be split by different ignLocalisationCode
// So a flux entry is unique on commune, to, ignLocalisationCode keys.
function getForestBiomassFluxesByCommune (location) {
  let csvFilePath = './dataByCommune/surface-foret.csv'
  const areaData = require(csvFilePath + '.json')
  csvFilePath = './dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv'
  const carbonData = require(csvFilePath + '.json')
  const localisationLevels = ['groupeser', 'greco', 'rad13', 'bassin_populicole']
  // there is data with null values because it isn't statistically significant at that
  // level. Remove these lines because they are not used.
  const significantCarbonData = carbonData.filter((data) => data.surface_ic === 's')
  let areaDataByCommune = []
  if (location.epci) {
    areaDataByCommune = areaData.filter(data => data.CODE_EPCI === location.epci.code)
  } else if (location.commune) {
    let code = location.commune.insee
    if (code.startsWith('0')) code = code.slice(1)
    areaDataByCommune = areaData.filter(data => data.INSEE_COM === code)
  }
  const forestSubtypes = GroundTypes.find((gt) => gt.stocksId === 'forêts').children
  const fluxes = []
  areaDataByCommune.forEach((communeData) => {
    // for each line of data by commune + localisationCode, we need to add a flux
    //   for each of the four forest subtypes
    forestSubtypes.forEach((forestSubtype) => {
      const flux = {
        commune: communeData.INSEE_COM,
        to: forestSubtype,
        reservoir: 'biomasse',
        gas: 'C'
      }
      const areaCompositionColumnName = {
        'forêt feuillu': 'SUR_FEUILLUS',
        'forêt conifere': 'SUR_RESINEUX',
        'forêt mixte': 'SUR_MIXTES',
        'forêt peupleraie': 'SUR_PEUPLERAIES'
      }[forestSubtype]
      flux.area = +communeData[areaCompositionColumnName]
      let carbonDataForCommuneAndLocalisation
      const subtype = {
        'forêt feuillu': 'Feuillu',
        'forêt conifere': 'Conifere',
        'forêt mixte': 'Mixte',
        'forêt peupleraie': 'Peupleraie'
      }[forestSubtype]
      const compositionCarbonData =
        significantCarbonData.filter((data) => data.composition === subtype)
      for (const i in localisationLevels) {
        const level = localisationLevels[i]
        const { localisationCode, localisationLevel } = getIgnLocalisation(communeData, level, subtype)
        carbonDataForCommuneAndLocalisation =
          compositionCarbonData.find((data) => data.code_localisation === localisationCode)
        if (carbonDataForCommuneAndLocalisation) {
          flux.ignLocalisationLevel = localisationLevel
          flux.ignLocalisationCode = localisationCode
          break
        }
      }
      if (!carbonDataForCommuneAndLocalisation) {
        const france = 'France'
        flux.ignLocalisationLevel = france
        flux.ignLocalisationCode = france
        carbonDataForCommuneAndLocalisation =
          compositionCarbonData.find((data) => data.code_localisation === france)
        if (!carbonDataForCommuneAndLocalisation) {
          // this is unexpected
          const message =
            `Carbon data could not be retrieved for commune ${communeData.INSEE_COM} and subtype ${forestSubtype}`
          throw new Error(message)
        }
      }
      const fluxColumns = {
        growth: 'production_volume_(m3∙ha-1∙an-1)',
        mortality: 'mortalite_volume_(m3∙ha-1∙an-1)',
        timberExtraction: 'prelevement_volume_(m3∙ha-1∙an-1)',
        fluxMeterCubed: 'bilan_volume_(m3∙ha-1∙an-1)',
        conversionFactor: 'fexp_vol_carb',
        annualFlux: 'bilan_carbone_(tC∙ha-1∙an-1)'
      }
      Object.keys(fluxColumns).forEach((key) => {
        flux[key] = +carbonDataForCommuneAndLocalisation[fluxColumns[key]]
      })
      flux.annualFluxEquivalent = cToCo2e(flux.annualFlux)
      fluxes.push(flux)
    })
  })
  return fluxes
}

// Retourne une comparaison agrégée des flux de carbone forestiers entre
// les deux campagnes IGN (2022 = 2016-2020, 2026 = 2020-2024).
// Les valeurs sont en tCO2e/ha/an, agrégées par moyenne pondérée sur les surfaces du territoire.
function getForestBiomassComparisonByCommune (location) {
  // Regroupements non supportés
  if (!location.commune && !location.epci) {
    return { hasForestData: false }
  }

  const areaData = require('./dataByCommune/surface-foret.csv.json')
  const carbonData2022 = require('./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2022.csv.json')
  const carbonData2026 = require('./dataByEpci/bilan-carbone-foret-par-localisation.IGN-2026.csv.json')

  const localisationLevels = ['groupeser', 'greco', 'rad13', 'bassin_populicole']

  // Pré-filtrage sur données statistiquement significatives (identique à l'existant)
  const significantData2022 = carbonData2022.filter(d => d.surface_ic === 's')
  const significantData2026 = carbonData2026.filter(d => d.surface_ic === 's')

  // Filtrer les lignes du territoire
  let areaDataByCommune = []
  if (location.epci) {
    areaDataByCommune = areaData.filter(d => d.CODE_EPCI === location.epci.code)
  } else if (location.commune) {
    let code = location.commune.insee
    if (code.startsWith('0')) code = code.slice(1)
    areaDataByCommune = areaData.filter(d => d.INSEE_COM === code)
  }

  // Vérifier qu'il y a de la forêt dans le territoire
  const totalForestArea = areaDataByCommune.reduce((sum, d) => {
    return sum + (+d.SUR_FEUILLUS || 0) + (+d.SUR_RESINEUX || 0) + (+d.SUR_MIXTES || 0) + (+d.SUR_PEUPLERAIES || 0)
  }, 0)
  if (totalForestArea === 0) {
    return { hasForestData: false }
  }

  const compositions = [
    { subtype: 'Feuillu',    surfaceCol: 'SUR_FEUILLUS' },
    { subtype: 'Conifere',   surfaceCol: 'SUR_RESINEUX' },
    { subtype: 'Mixte',      surfaceCol: 'SUR_MIXTES' },
    { subtype: 'Peupleraie', surfaceCol: 'SUR_PEUPLERAIES' }
  ]

  const carbonColumns = {
    accroissement: 'production_carbone_(tC∙ha-1∙an-1)',
    mortalite: 'mortalite_carbone_(tC∙ha-1∙an-1)',
    prelevement: 'prelevement_carbone_(tC∙ha-1∙an-1)',
    bilan: 'bilan_carbone_(tC∙ha-1∙an-1)'
  }

  // Accumulateurs pour la moyenne pondérée
  const acc2022 = { accroissement: 0, mortalite: 0, prelevement: 0, bilan: 0 }
  const acc2026 = { accroissement: 0, mortalite: 0, prelevement: 0, bilan: 0 }
  // totalWeight = Σ surfaces (all compositions) → dénominateur de la moyenne pondérée
  // surfacePerSubtype = surfaces par composition → pour identifier la composition dominante
  // (totalWeight === sum of surfacePerSubtype values)
  let totalWeight = 0

  // Pour le code de localisation affiché : composition dominante par surface TOTALE sur tout le territoire.
  // On accumule surface par composition, et on garde le code de la commune qui contribue le plus
  // à chaque composition (pour les EPCIs multi-communes où le code peut varier par commune).
  const surfacePerSubtype = {}     // { Feuillu: totalHa, Conifere: totalHa, ... }
  const maxSurfacePerSubtype = {}  // { Feuillu: maxHaInOneCommune, ... } — pour trouver le code dominant
  const code2022PerSubtype = {}    // code de la commune qui contribue le plus de ha pour ce subtype
  const code2026PerSubtype = {}

  let hasWarning = false

  // Helper : résoudre la localisation dans un dataset pour une commune et une composition
  function resolveLocalisation (communeData, subtype, significantData) {
    const compositionData = significantData.filter(d => d.composition === subtype)
    for (const level of localisationLevels) {
      const { localisationCode, localisationLevel } = getIgnLocalisation(communeData, level, subtype)
      const row = compositionData.find(d => d.code_localisation === localisationCode)
      if (row) return { localisationCode, localisationLevel, row }
    }
    // Fallback France
    const row = compositionData.find(d => d.code_localisation === 'France')
    if (!row) {
      throw new Error(
        `Carbon data could not be retrieved for commune ${communeData.INSEE_COM} and subtype ${subtype}`
      )
    }
    return { localisationCode: 'France', localisationLevel: 'France', row }
  }

  // Helper : détecte si la significativité (surface_ic) diffère entre les deux datasets
  // pour une commune et une composition donnée.
  // Vérifie tous les niveaux de localisation en utilisant les codes bruts de la commune
  // (sans passer par getIgnLocalisation qui peut convertir certains codes comme PDL→A).
  function hasSignificanceDifference (communeData, subtype) {
    const comp2022 = carbonData2022.filter(d => d.composition === subtype)
    const comp2026 = carbonData2026.filter(d => d.composition === subtype)
    for (const level of localisationLevels) {
      const rawCode = communeData[`code_${level}`]
      if (!rawCode) continue
      const row2022 = comp2022.find(d => d.code_localisation === rawCode)
      const row2026 = comp2026.find(d => d.code_localisation === rawCode)
      if ((row2022 || row2026) && (row2022?.surface_ic === 's') !== (row2026?.surface_ic === 's')) {
        return true
      }
    }
    return false
  }

  areaDataByCommune.forEach(communeData => {
    compositions.forEach(({ subtype, surfaceCol }) => {
      const surface = +communeData[surfaceCol] || 0
      if (surface === 0) return // Exclure les compositions sans surface

      const res2022 = resolveLocalisation(communeData, subtype, significantData2022)
      const res2026 = resolveLocalisation(communeData, subtype, significantData2026)

      // Warning si la significativité diffère entre les deux datasets pour cette commune × composition
      if (!hasWarning) {
        hasWarning = hasSignificanceDifference(communeData, subtype)
      }

      // Accumulation pondérée
      Object.keys(carbonColumns).forEach(fluxKey => {
        const col = carbonColumns[fluxKey]
        acc2022[fluxKey] += (+res2022.row[col] || 0) * surface
        acc2026[fluxKey] += (+res2026.row[col] || 0) * surface
      })
      totalWeight += surface

      // Accumulation surface par composition (pour trouver la composition dominante après la boucle)
      surfacePerSubtype[subtype] = (surfacePerSubtype[subtype] || 0) + surface
      // Codes : on retient ceux de la commune qui contribue le plus de ha pour ce subtype
      if (surface > (maxSurfacePerSubtype[subtype] || 0)) {
        maxSurfacePerSubtype[subtype] = surface
        code2022PerSubtype[subtype] = res2022.localisationCode
        code2026PerSubtype[subtype] = res2026.localisationCode
      }
    })
  })

  // Composition dominante = celle avec la plus grande surface totale sur tout le territoire
  const dominantSubtype = Object.entries(surfacePerSubtype)
    .sort(([, a], [, b]) => b - a)[0][0]
  const dominantCode2022 = code2022PerSubtype[dominantSubtype]
  const dominantCode2026 = code2026PerSubtype[dominantSubtype]

  // Moyenne pondérée + conversion tC → tCO2e
  const data2022 = {}
  const data2026 = {}
  Object.keys(carbonColumns).forEach(fluxKey => {
    data2022[fluxKey] = cToCo2e(acc2022[fluxKey] / totalWeight)
    data2026[fluxKey] = cToCo2e(acc2026[fluxKey] / totalWeight)
  })

  return {
    data2022,
    data2026,
    localisationCode2022: dominantCode2022,
    localisationCode2026: dominantCode2026,
    hasWarning,
    hasForestData: true
  }
}

module.exports = {
  getAnnualGroundCarbonFlux,
  getFluxReferenceValues,
  getForestLitterFlux,
  getAnnualSurfaceChange,
  getAnnualSurfaceChangeFromDataOptimized,
  getFranceFluxWoodProducts,
  getForestBiomassFluxesByCommune,
  getForestBiomassComparisonByCommune,
  cToCo2e
}
