import type { Request, Response } from 'express'
import xl from 'excel4node'
import { getCatenr, C_TO_CO2E } from '../../calculations/catenr/index.ts'
import { Scenarios, MAX_YEAR } from '../../calculations/catenr/constants.ts'
import { entries, type PracticeId } from '../../calculations/constants.ts'
import { getCommunes } from '../../data/communes.ts'
import { getLocationDetail, parseCatenrFromQuery } from './shared.ts'
import { getCatenrCommune } from './territory.ts'

// Emplacement des saisies dans Outil_CAT_EnR_v5.3.xlsx : les valeurs sont écrites
// aux mêmes adresses que dans l'outil complet pour permettre un copier-coller.
const LAYOUTS = {
  pv: {
    sheet: '2.PV Caractéristiques',
    fields: { installedPower: 'F16', annualProduction: 'F17', totalArea: 'F18', lifespan: 'F24', foundationArea: 'F27' },
    firstRow: 48
  },
  eolien: {
    sheet: '2.Eolien Caractéristiques',
    fields: { installedPower: 'F17', annualProduction: 'F18', turbineCount: 'F19', lifespan: 'F24', foundationArea: 'F30' },
    firstRow: 47
  }
} as const

// Onglet « 4. Exploitation », plage D17:F22, liste déroulante « Pratiques_agricoles ».
// Les haies sont saisies en mètres linéaires dans l'outil complet.
const PRACTICES: Partial<Record<PracticeId, { name: string, occupation: string, linearMetersPerHa?: number }>> = {
  prairieExtension: { name: 'Allongement prairies temporaires (5 ans max)', occupation: 'cultures' },
  prairieIntensification: { name: 'Intensification modérée des prairies peu productives (hors alpages et estives)', occupation: 'prairies zones herbacées' },
  cropsAgroforestry: { name: 'Agroforesterie en grandes cultures', occupation: 'cultures' },
  prairiesAgroforestry: { name: 'Agroforesterie en prairies', occupation: 'prairies zones herbacées' },
  catchCrops: { name: 'Couverts intermédiaires (CIPAN) en grandes cultures', occupation: 'cultures' },
  cropsHedges: { name: 'Plantation de linéaires de haies', occupation: 'cultures', linearMetersPerHa: 60 },
  prairiesHedges: { name: 'Plantation de linéaires de haies', occupation: 'prairies zones herbacées', linearMetersPerHa: 100 },
  // l'espace final fait partie du libellé de la liste de l'outil
  grassyStrips: { name: 'Bandes enherbées ', occupation: 'cultures' },
  vineyardsInterCoverCropping: { name: 'Couverts intercalaires en vignes', occupation: 'vignes' },
  orchardsInterCoverCropping: { name: 'Couverts intercalaires en vergers', occupation: 'vergers' }
}
const PRACTICES_FIRST_ROW = 17

export function catenrExportHandler (req: Request, res: Response) {
  const location = getLocationDetail(req)
  const commune = location && getCatenrCommune(getCommunes(location), req.query)
  if (!commune) {
    res.status(404).render('404', {})
    return
  }
  const inputs = parseCatenrFromQuery(req.query)
  const catenr = getCatenr({ commune }, inputs)
  const layout = LAYOUTS[catenr.project.id]

  const wb = new xl.Workbook()
  const title = wb.createStyle({ font: { bold: true, size: 14 } })
  const bold = wb.createStyle({ font: { bold: true } })
  const input = wb.createStyle({ fill: { type: 'pattern', patternType: 'solid', fgColor: '#FFF2CC' } })
  const percent = wb.createStyle({ numberFormat: '0%' })
  const decimal = wb.createStyle({ numberFormat: '#,##0.0' })

  const readme = wb.addWorksheet('Lisez-moi')
  readme.column(1).setWidth(120)
  ;[
    ["Export de l'outil CAT'ENR intégré à ALDO", title],
    [`Territoire : ${location.epci?.nom || location.commune?.nom || 'Regroupement'}`],
    [`Technologie : ${catenr.project.name}`],
    [`Commune de référence des stocks et flux : ${commune.nom} (code INSEE ${commune.insee})`],
    [`Date d'export : ${new Date().toLocaleDateString('fr-FR')}`],
    [''],
    ["Reprendre ce projet dans l'outil CAT'ENR complet", bold],
    ["L'outil complet permet d'affiner le projet, notamment en intégrant les aspects biodiversité :"],
    ['https://librairie.ademe.fr/energies/8196-cat-enr-concevoir-et-evaluer-des-projets-photovoltaiques-et-eoliens-a-moindre-impact.html'],
    ["1. Dans l'onglet « 0. Prérequis » de l'outil complet, renseigner la commune d'installation ci-dessus."],
    [`2. Les saisies sont placées dans l'onglet « ${layout.sheet} » de ce fichier, aux mêmes adresses que dans l'outil complet (cellules surlignées).`],
    [`   Copier chaque bloc surligné et le coller au même emplacement de l'onglet « ${layout.sheet} » de l'outil complet, en collage spécial « Valeurs ».`],
    ['   Ne pas copier la colonne F (type de composant) ni les cellules du nom et du code INSEE de la commune, qui sont calculées par l\'outil.'],
    ['3. Procéder de même pour les pratiques agricoles stockantes de l\'onglet « 4. Exploitation » (plage D17:F22).'],
    catenr.project.id === 'pv'
      ? ["Pour un projet photovoltaïque, la cellule G47 de l'onglet « 2.Eolien Caractéristiques » de l'outil complet doit rester vide."]
      : ["Pour un projet éolien, la cellule G47 de l'onglet « 2.Eolien Caractéristiques » (emprise du socle) doit être remplie."],
    [''],
    ["Les résultats calculés par ALDO figurent dans l'onglet « Résultats »."]
  ].forEach(([text, style], index) => {
    const cell = readme.cell(index + 1, 1).string(text)
    if (style) cell.style(style)
  })

  // saisies, aux adresses de l'outil complet
  const ws = wb.addWorksheet(layout.sheet)
  ws.column(5).setWidth(50)
  ws.column(9).setWidth(30)
  ws.column(17).setWidth(30)
  ws.cell(1, 1).string(`Saisies à copier dans l'onglet « ${layout.sheet} » de l'outil CAT'ENR complet`).style(title)
  entries(layout.fields).forEach(([field, address]) => {
    const value = inputs[field]
    const { row, col } = xl.getExcelRowCol(address)
    ws.cell(row, 5).string(FIELD_LABELS[field])
    if (value !== undefined) ws.cell(row, col).number(value).style(input)
  })
  ws.cell(layout.firstRow - 1, 5).string('Éléments constitutifs du projet').style(bold)
  ;['Superficie', 'Unités', 'Occupation initiale', 'Âge', 'Unités', '% zone humide', 'Stock biomasse', 'Unités', 'Réf. pessimiste', 'Réf. probable', 'Occupation finale']
    .forEach((header, index) => ws.cell(layout.firstRow - 1, 7 + index).string(header).style(bold))
  catenr.rows.forEach((row, index) => {
    const r = layout.firstRow + index
    const rowInput = inputs.rows[row.id] || {}
    ws.cell(r, 5).string(row.name)
    // colonnes G à Q : un seul bloc à copier. Les colonnes O et P (occupations du
    // scénario de référence) reprennent l'occupation initiale, comme dans l'outil.
    ws.cell(r, 7, r, 17).style(input)
    if (row.area) ws.cell(r, 7).number(row.area)
    ws.cell(r, 8).string('ha')
    // occupation initiale par défaut d'ALDO non reportée sur une ligne vide
    if (row.area) ws.cell(r, 9).string(row.initialOccupation)
    if (rowInput.age !== undefined) ws.cell(r, 10).number(rowInput.age)
    ws.cell(r, 11).string('an')
    if (rowInput.wetlandShare !== undefined) ws.cell(r, 12).number(rowInput.wetlandShare).style(percent)
    if (rowInput.biomassStock !== undefined) ws.cell(r, 13).number(rowInput.biomassStock)
    ws.cell(r, 14).string('tC/ha')
    if (row.area) ws.cell(r, 15).string(row.initialOccupation)
    if (row.area) ws.cell(r, 16).string(row.initialOccupation)
    ws.cell(r, 17).string(row.finalOccupation)
  })

  const exploitation = wb.addWorksheet('4. Exploitation')
  exploitation.column(4).setWidth(60)
  exploitation.column(5).setWidth(30)
  exploitation.cell(1, 1).string("Saisies à copier dans l'onglet « 4. Exploitation » de l'outil CAT'ENR complet").style(title)
  ;['Pratiques de gestion mises en place', 'Occupation des sols concernée', 'Superficie concernée', 'Unités']
    .forEach((header, index) => exploitation.cell(PRACTICES_FIRST_ROW - 1, 4 + index).string(header).style(bold))
  // ponytail: l'outil complet ne prévoit que 6 lignes (D17:D22), les pratiques suivantes sont écrites en dessous
  entries(inputs.practices).filter(([, area]) => area).forEach(([practiceId, area], index) => {
    const practice = PRACTICES[practiceId]
    if (!practice) return
    const r = PRACTICES_FIRST_ROW + index
    exploitation.cell(r, 4, r, 6).style(input)
    exploitation.cell(r, 4).string(practice.name)
    exploitation.cell(r, 5).string(practice.occupation)
    exploitation.cell(r, 6).number(area * (practice.linearMetersPerHa || 1))
    exploitation.cell(r, 7).string(practice.linearMetersPerHa ? 'ml' : 'ha')
  })

  // résultats
  const results = wb.addWorksheet('Résultats')
  results.column(1).setWidth(45)
  for (let c = 2; c <= 7; c++) results.column(c).setWidth(22)
  let r = 1
  results.cell(r, 1).string("Résultats de l'outil CAT'ENR (ALDO)").style(title)
  r += 2
  if (catenr.isBlocked) {
    results.cell(r, 1).string(catenr.surfaceCheck?.message ?? '')
    r += 2
  }
  const indicator = (label: string, value: number | undefined, unit: string) => {
    results.cell(r, 1).string(label)
    if (value !== undefined) results.cell(r, 2).number(value).style(decimal)
    results.cell(r, 3).string(unit)
    r++
  }
  indicator("Variation des stocks de carbone sur la durée de vie de l'installation (projet - référence, cas le plus probable)", catenr.lifetime.variation, 'tCO2e')
  indicator('Perte de carbone ramenée à la production (durée de vie de l\'installation)', catenr.lifetime.intensity, 'gCO2e/kWh')
  r++

  const table = (caption: string, headers: string[], lines: (string | number | undefined)[][]) => {
    results.cell(r, 1).string(caption).style(bold)
    r++
    headers.forEach((header, index) => results.cell(r, 1 + index).string(header).style(bold))
    r++
    lines.forEach((line) => {
      line.forEach((value, index) => {
        if (typeof value === 'string') results.cell(r, 1 + index).string(value)
        else if (value !== undefined) results.cell(r, 1 + index).number(value).style(decimal)
      })
      r++
    })
    r++
  }
  for (const [stocks, scenario] of [[catenr.referenceStocks, 'scénario de référence'], [catenr.stocks, 'scénario projet']] as const) {
    table(`Stocks de carbone du ${scenario} (tC)`, ['Temporalité', 'Le plus probable', 'Pessimiste', 'Optimiste'],
      stocks.map((s) => [s.name, s.value, s.pessimistic, s.optimistic]))
  }
  table('Variation des stocks de carbone entre le scénario projet et le scénario de référence (tC)', ['Temporalité', 'Variation', 'Minimum', 'Maximum'],
    catenr.variations.map((v) => [v.name, v.value, v.minimum, v.maximum]))
  const years = Array.from({ length: MAX_YEAR + 1 }, (_, year) => year)
  table('Évolution des stocks de carbone selon les scénarios (tCO2e)', ['Année', ...Scenarios.map((s) => s.name)],
    years.map((year) => [year, ...Scenarios.map((s) => catenr.trajectories[s.id][year])]))
  // les stocks des tableaux sont en tC, comme dans le reste d'ALDO
  results.cell(r, 1).string(`Conversion : 1 tC = ${C_TO_CO2E.toFixed(4)} tCO2e`)

  // nommé d'après le territoire consulté, la commune de référence étant indiquée dans le Lisez-moi
  const territory = location.epci?.nom || location.commune?.nom || 'Regroupement'
  wb.write(`CAT'ENR - ${territory}.xlsx`, res)
}

const FIELD_LABELS: Record<keyof (typeof LAYOUTS)['pv']['fields'] | keyof (typeof LAYOUTS)['eolien']['fields'], string> = {
  installedPower: 'Puissance installée (MWc en photovoltaïque, MW en éolien)',
  annualProduction: 'Production annuelle (GWh/an)',
  totalArea: 'Superficie totale du parc = surface clôturée (ha)',
  turbineCount: "Nombre d'éoliennes",
  lifespan: 'Durée de vie du parc (ans)',
  foundationArea: 'Surface au sol des fondations (ha)'
}
