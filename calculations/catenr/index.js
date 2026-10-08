// Version « light » de l'outil CAT'ENR (ADEME) pour les centrales photovoltaïques
// au sol et les parcs éoliens terrestres.
//
// Reproduit l'onglet « Calcul - Carbone » de Outil_CAT_EnR_v5.3.xlsx en s'appuyant
// sur les données ALDO de la commune (data/dataByCommune/stocks-zpc.csv et
// flux-zpc.csv) plutôt que sur la copie figée embarquée dans le tableur.
// Les références aux cellules du tableur sont indiquées en commentaire pour
// faciliter la comparaison des résultats.
//
// Les pratiques agricoles stockantes de l'onglet « 4. Exploitation » reprennent la
// liste et les flux de l'onglet « Pratiques agricoles » d'ALDO.
// Les trajectoires sont en tCO2e, les tableaux de synthèse en tC.
const catenrData = require('../../data/catenr')
const { getPracticeFlux } = require('../flux/agriculturalPractices')
const {
  DEFAULT_INITIAL_OCCUPATION,
  DEFAULT_PROJECT,
  Occupations,
  PessimisticProjectOccupations,
  Projects,
  Scenarios,
  LITTER_KINETICS,
  MAX_YEAR,
  OptimisticPractices,
  PRACTICES_DURATION
} = require('./constants')

const C_TO_CO2E = 44 / 12

function isForest (occupation) {
  return catenrData.isForest(catenrData.toAldo(occupation))
}

// Occupation des sols retenue dans chaque scénario, pour une ligne donnée.
// Tableur : colonnes K (réf. pessimiste), L (réf. probable), O (réf. optimiste),
// N (projet pessimiste), M (projet probable) de l'onglet « Calcul - Carbone ».
function targetOccupations (row) {
  const initial = row.initialOccupation
  const final = row.finalOccupation
  return {
    referencePessimiste: initial,
    referenceProbable: initial,
    // « prairies » : on suppose une évolution spontanée vers la strate arborée
    referenceOptimiste: initial && initial.startsWith('prairies') ? 'prairies zones arborées' : initial,
    projetPessimiste: PessimisticProjectOccupations[row.component] || final,
    projetProbable: final,
    projetOptimiste: final
  }
}

// Stocks à l'état initial d'une ligne, en tC. Tableur : colonnes AC à AG.
function initialStocks (location, row) {
  const { area, age, wetlandShare } = row
  const wetArea = area * wetlandShare // AC/AP : surface en zone humide
  const dryArea = area - wetArea // AQ : surface hors zone humide

  const soil =
    catenrData.getSoilStock(location.commune, 'zones humides') * wetArea +
    catenrData.getSoilStock(location.commune, row.initialOccupation) * dryArea

  // La litière d'une forêt se reconstitue linéairement sur cinétique_litière années.
  const litterAgeRatio = age ? Math.min(age / LITTER_KINETICS, 1) : 1
  const litter = catenrData.getLitterStock(row.initialOccupation) * area * litterAgeRatio

  // Idem pour la biomasse, sur la durée de référence de l'occupation initiale.
  const biomassDuration = catenrData.getBiomassStockDuration(row.initialOccupation)
  // IFERROR du tableur : une occupation sans durée de référence et un âge saisi
  // donnent un stock de biomasse nul.
  const biomassAgeRatio = age ? (biomassDuration ? Math.min(age / biomassDuration, 1) : 0) : 1
  const biomassDensity = row.biomassStock || catenrData.getBiomassStock(location, row.initialOccupation) * biomassAgeRatio
  const biomass = biomassDensity * area

  return {
    wetArea,
    dryArea,
    soil,
    litter,
    biomass,
    total: soil + litter + biomass,
    // AG : l'écosystème initial a dépassé sa durée de stockage de référence
    biomassAtEquilibrium: biomassDuration ? age / biomassDuration > 1 : false
  }
}

// Un « composant de flux » : un flux immédiat (année 1) ou un flux annuel
// répété tant que l'année reste inférieure ou égale à la cinétique.
function fluxComponent (kinetics, flux, immediateValue, annualValue) {
  return {
    kinetics,
    immediate: kinetics === 0 && flux !== 0 ? immediateValue : 0,
    annual: kinetics > 0 && flux !== 0 ? annualValue : 0
  }
}

// Flux dans les sols, hors et en zone humide. Tableur : colonnes AJ à AQ.
function soilFluxes (location, row, stocks, target) {
  const components = []

  const dryKinetics = catenrData.getKinetics(row.initialOccupation, target, 'Sol')
  // La table Aldo_Flux porte le flux total sur 20 ans : au-delà, le rythme annuel
  // reste inchangé et le stockage se prolonge (MAX(cinétique/20, 1)).
  const dryFlux =
    catenrData.getSoilFluxReference(location, row.initialOccupation, target) /
    Math.max(dryKinetics, 1) *
    Math.max(dryKinetics / 20, 1)
  components.push(fluxComponent(dryKinetics, dryFlux, dryFlux * stocks.dryArea, dryFlux * stocks.dryArea))

  if (row.wetlandShare) {
    const wetKinetics = catenrData.getKinetics('zones humides', target, 'Sol')
    const wetFlux =
      catenrData.getSoilFluxReference(location, 'zones humides', target) / Math.max(wetKinetics, 1)
    components.push(fluxComponent(wetKinetics, wetFlux, wetFlux * stocks.wetArea, wetFlux * stocks.wetArea))
  }
  return components
}

// Flux dans la litière. Tableur : colonnes AR à AU.
function litterFlux (row, stocks, target) {
  const sameGround = catenrData.solName(catenrData.toAldo(row.initialOccupation)) ===
    catenrData.solName(catenrData.toAldo(target))
  let kinetics
  let flux
  if (sameGround && isForest(row.initialOccupation)) {
    // forêt conservée : la litière continue de se reconstituer jusqu'à 20 ans
    kinetics = Math.max(LITTER_KINETICS - row.age, 0)
    flux = !row.age || row.age >= LITTER_KINETICS
      ? 0
      : catenrData.getLitterStock(row.initialOccupation) * C_TO_CO2E / LITTER_KINETICS
  } else {
    kinetics = catenrData.getKinetics(row.initialOccupation, target, 'Litière')
    flux = catenrData.getLitterFluxReference(row.initialOccupation, target) / Math.max(kinetics, 1)
  }

  const litterStockCo2e = stocks.litter * C_TO_CO2E
  const immediate = kinetics === 0 && flux < 0 ? -litterStockCo2e : 0
  let annual = 0
  if (kinetics !== 0) {
    // NB : pour un flux positif le tableur (cellule AU) n'applique pas la surface.
    // Comportement reproduit à l'identique pour rester aligné sur CAT'ENR v5.3.
    annual = flux < 0 ? Math.max(flux * row.area, -litterStockCo2e / kinetics) : flux
  }
  return { kinetics, immediate, annual }
}

// Flux dans la biomasse. Tableur : colonnes AV à AZ.
function biomassFlux (location, row, stocks, target) {
  const aldoInitial = catenrData.toAldo(row.initialOccupation)
  const initialDuration = catenrData.getBiomassStockDuration(row.initialOccupation) || 0
  const sameOccupation = aldoInitial === target

  // AW : cinétique sans tenir compte de l'âge de l'écosystème initial ; AX : avec.
  const kineticsWithoutAge = sameOccupation
    ? Math.max(0, initialDuration)
    : (catenrData.getBiomassStockDuration(target) || 0)
  const kinetics = sameOccupation
    ? Math.max(0, initialDuration - row.age)
    : (catenrData.getBiomassStockDuration(target) || 0)

  let flux = 0
  if (row.initialOccupation === target && !stocks.biomassAtEquilibrium) {
    // l'écosystème initial est conservé et continue de croître
    flux = row.age ? stocks.biomass / (row.area * row.age) * C_TO_CO2E : 0
  } else if (sameOccupation && stocks.biomassAtEquilibrium) {
    flux = 0
  } else if (isForest(target)) {
    flux = catenrData.getForestBiomassGrowth(location, target) * Math.max(kineticsWithoutAge / 20, 1)
  } else {
    flux = catenrData.getBiomassFluxReference(location, row.initialOccupation, target) /
      Math.max(kinetics, 1) *
      Math.max(kineticsWithoutAge / 20, 1)
  }
  if (!isFinite(flux)) flux = 0

  const biomassStockCo2e = stocks.biomass * C_TO_CO2E
  const ageRatio = row.age ? (initialDuration ? Math.min(row.age / initialDuration, 1) : 0) : 1
  const immediate = kineticsWithoutAge === 0 && flux < 0 ? flux * row.area * ageRatio : 0
  const annual = kinetics > 0 && flux !== 0
    ? Math.max(flux * row.area, -biomassStockCo2e / kinetics)
    : 0
  return { kinetics, immediate, annual }
}

// Flux d'une pratique agricole stockante, en tCO2e/ha/an (sol + biomasse).
function practiceFlux (practice) {
  return ((getPracticeFlux(practice, 'sol') || 0) + (getPracticeFlux(practice, 'biomasse') || 0)) * C_TO_CO2E
}

// Surfaces, par pratique, sur lesquelles un scénario optimiste applique d'office une
// pratique stockante, selon l'occupation retenue dans ce scénario.
// Tableur : colonnes GG (occupation de la référence optimiste) et GK (occupation finale).
// NB : dans le tableur v5.3, les SUMIF des couverts et du semis direct continu (GG8 à
// GG14, GK8 à GK14) ont une plage de sommes décalée par rapport à la plage de critères :
// ils lisent la surface d'une autre ligne, en pratique vide. Une culture n'y reçoit donc
// que l'agroforesterie (1 tC/ha/an) au lieu des 1,39 tC/ha/an prévus par l'onglet
// « Données_Pratiques agricoles ». Ce bug n'est pas reproduit.
function optimisticPracticeAreas (rows, scenarioId) {
  const areas = {}
  rows.forEach((row) => {
    const practices = OptimisticPractices[targetOccupations(row)[scenarioId]] || []
    practices.forEach((practice) => { areas[practice] = (areas[practice] || 0) + row.area })
  })
  return areas
}

// Flux annuels des pratiques agricoles stockantes par scénario, en tCO2e/an.
// Tableur : colonnes GH (référence optimiste), GJ (projet le plus probable : surfaces
// déclarées) et GL (projet optimiste : maximum, par pratique, des surfaces déclarées
// et des surfaces de l'occupation concernée).
function practicesFluxes (rows, declaredAreas) {
  const sum = (areas) => Object.keys(areas).reduce((total, practice) => total + practiceFlux(practice) * areas[practice], 0)
  const projectAreas = optimisticPracticeAreas(rows, 'projetOptimiste')
  const optimisticAreas = { ...declaredAreas }
  Object.keys(projectAreas).forEach((practice) => {
    optimisticAreas[practice] = Math.max(optimisticAreas[practice] || 0, projectAreas[practice])
  })
  return {
    referenceOptimiste: sum(optimisticPracticeAreas(rows, 'referenceOptimiste')),
    projetProbable: sum(declaredAreas),
    projetOptimiste: sum(optimisticAreas)
  }
}

// NB : le tableur ajoute le flux des pratiques dès l'année 1, puis tant que l'année
// précédente est inférieure ou égale à 20 (W7 : S6<=20), soit 21 années de stockage.
// Reproduit à l'identique.
function practicesComponent (annual) {
  return { kinetics: PRACTICES_DURATION, immediate: annual, annual }
}

// Trajectoire d'un scénario, en tCO2e, de l'année 0 à MAX_YEAR.
// Tableur : colonnes U à Z de l'onglet « Calcul - Carbone ».
function trajectory (initialTotal, components) {
  const years = [initialTotal]
  years[1] = years[0] + components.reduce((sum, c) => sum + c.immediate, 0)
  for (let year = 2; year <= MAX_YEAR; year++) {
    const annual = components.reduce(
      (sum, c) => sum + (c.kinetics >= year - 1 ? c.annual : 0),
      0
    )
    years[year] = years[year - 1] + annual
  }
  return years
}

// Contrôle de cohérence des surfaces. Tableur : cellule E39 de « 2.PV Caractéristiques »,
// SOMME(G48:G57) - G57 = superficie totale du parc. L'onglet éolien n'a pas
// d'équivalent : aucune superficie totale du parc n'y est demandée.
function surfaceCheck (project, rows, totalArea) {
  const sum = project.rows.reduce((total, definition) => {
    if (!definition.inSurfaceCheck) return total
    const area = rows[definition.id]?.area || 0
    return definition.subtractedFromSurfaceCheck ? total : total + area
  }, 0)
  const isValid = Math.abs(sum - totalArea) < 0.0001
  return {
    sum,
    totalArea,
    isValid,
    message: isValid
      ? 'Surfaces : OK'
      : 'Attention, la surface entrée ne correspond pas à la surface du projet'
  }
}

// inputs: { projectType, lifespan, totalArea, rows: { <rowId>: { area, wetlandShare,
//           initialOccupation, finalOccupation, age, biomassStock } },
//           practices: { <id de pratique ALDO>: surface (ha) } }
function getCatenr (location, inputs) {
  const project = Projects.find((p) => p.id === inputs.projectType) ||
    Projects.find((p) => p.id === DEFAULT_PROJECT)

  const rows = project.rows.map((definition) => {
    const input = inputs.rows?.[definition.id] || {}
    return {
      ...definition,
      area: input.area || 0,
      wetlandShare: input.wetlandShare || 0,
      age: input.age || 0,
      biomassStock: input.biomassStock || 0,
      initialOccupation: input.initialOccupation || DEFAULT_INITIAL_OCCUPATION,
      finalOccupation: input.finalOccupation || definition.finalOccupation
    }
  })

  const filledRows = rows.filter((row) => row.area > 0 && row.initialOccupation)
  const hasData = filledRows.length > 0

  let initialTotal = 0
  const componentsByScenario = {}
  Scenarios.forEach((scenario) => { componentsByScenario[scenario.id] = [] })

  filledRows.forEach((row) => {
    const stocks = initialStocks(location, row)
    initialTotal += stocks.total * C_TO_CO2E
    const targets = targetOccupations(row)
    Scenarios.forEach((scenario) => {
      const target = targets[scenario.id]
      if (!target) return
      componentsByScenario[scenario.id].push(
        ...soilFluxes(location, row, stocks, target),
        litterFlux(row, stocks, target),
        biomassFlux(location, row, stocks, target)
      )
    })
  })

  const practices = practicesFluxes(filledRows, inputs.practices || {})
  Object.keys(practices).forEach((scenarioId) => {
    if (practices[scenarioId]) componentsByScenario[scenarioId].push(practicesComponent(practices[scenarioId]))
  })

  const trajectories = {}
  Scenarios.forEach((scenario) => {
    trajectories[scenario.id] = trajectory(initialTotal, componentsByScenario[scenario.id])
  })

  const check = project.hasSurfaceCheck
    ? surfaceCheck(project, inputs.rows || {}, inputs.totalArea || 0)
    : null

  return {
    project,
    hasData,
    // les résultats ne sont pas présentés tant que les surfaces saisies sont incohérentes
    isBlocked: hasData && check ? !check.isValid : false,
    rows,
    initialTotal,
    trajectories,
    surfaceCheck: check,
    ...summaries(trajectories, inputs.lifespan)
  }
}

// Les tableaux affichés dans l'onglet « Indicateurs quantitatifs » du tableur, complétés
// d'un tableau des stocks du scénario de référence. Les trajectoires sont calculées en
// tCO2e comme dans le tableur, mais les stocks sont présentés en tC comme dans le reste
// d'ALDO.
function summaries (trajectories, lifespan) {
  const at = (scenario, year) => (year === undefined ? undefined : trajectories[scenario][year] / C_TO_CO2E)
  const temporalities = [
    { id: 'etat-initial', name: 'État initial', year: 0 },
    { id: 'post-travaux', name: 'État post travaux', year: 1 },
    { id: '5-ans', name: '5 ans post installation', year: 5 },
    { id: '10-ans', name: '10 ans post installation', year: 10 },
    { id: '20-ans', name: '20 ans post installation', year: 20 },
    { id: 'duree-de-vie', name: "Durée de vie de l'installation", year: lifespan },
    { id: '50-ans', name: '50 ans post installation', year: 50 }
  ].filter((temporality) => temporality.year === undefined || temporality.year <= MAX_YEAR)

  const stocksOf = (scenarioType) => temporalities.map((temporality) => {
    if (temporality.id === 'etat-initial') {
      const value = at(`${scenarioType}Probable`, 0)
      return { ...temporality, value, pessimistic: value, optimistic: value }
    }
    return {
      ...temporality,
      value: at(`${scenarioType}Probable`, temporality.year),
      pessimistic: at(`${scenarioType}Pessimiste`, temporality.year),
      optimistic: at(`${scenarioType}Optimiste`, temporality.year)
    }
  })
  const stocks = stocksOf('projet')
  const referenceStocks = stocksOf('reference')

  const variations = temporalities.slice(1).map((temporality) => ({
    ...temporality,
    name: temporality.id === 'post-travaux' ? 'Post travaux' : temporality.name,
    value: difference(at('projetProbable', temporality.year), at('referenceProbable', temporality.year)),
    // NB : pour la ligne « post travaux » le tableur compare les valeurs de l'année 0
    // (cellule M21 = Z5 - U5), ce qui donne toujours 0. Reproduit à l'identique.
    minimum: difference(at('projetPessimiste', temporality.year), at('referenceOptimiste', temporality.year)),
    maximum: temporality.id === 'post-travaux'
      ? difference(at('projetOptimiste', 0), at('referencePessimiste', 0))
      : difference(at('projetOptimiste', temporality.year), at('referencePessimiste', temporality.year))
  }))

  return { stocks, referenceStocks, variations }
}

function difference (a, b) {
  if (a === undefined || b === undefined) return undefined
  return a - b
}

module.exports = {
  getCatenr,
  C_TO_CO2E,
  Occupations,
  Projects,
  Scenarios,
  MAX_YEAR
}
