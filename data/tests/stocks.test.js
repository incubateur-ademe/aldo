const {
  getCarbonDensity,
  getArea,
  getBiomassCarbonDensity,
  getFranceStocksWoodProducts,
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest,
  getForestLitterCarbonDensity
} = require('../stocks')
// TODO: mock data sources?

test('returns ground carbon density (as tC/ha) given valid ground type and EPCI SIREN', () => {
  expect(getCarbonDensity({ epci: '200000172' }, 'cultures')).toBe(54.63076734)
})

test('returns area in hectares (ha) for ground type "cultures" and valid EPCI SIREN', () => {
  expect(getArea({ epci: '200000172' }, 'cultures')).toBe(1740.7313534999998)
})

test('returns area in hectares (ha) for ground type "prairies zones herbacées" and valid EPCI SIREN', () => {
  expect(getArea({ epci: '200000172' }, 'prairies zones herbacées')).toBe(2522.1652952)
})

test('throws useful error when attempting to get area for ground type without type to CLC type mapping', () => {
  let error
  try {
    getArea({ epci: '200000172' }, 'lake')
  } catch (e) {
    error = e
  }
  expect(error.message).toBe("No CLC code mapping found for ground type 'lake'")
})

// TODO: Ask about source of that data, and why many ground types don't have values, others appear to be constant.
test('returns biomass carbon density (as tC/ha) given valid ground type and EPCI SIREN', () => {
  expect(getBiomassCarbonDensity({ epci: '200000172' }, 'prairies zones arborées')).toBe(57)
})

test('returns forest biomass carbon density (as tC/ha) given valid forest type and EPCI SIREN', () => {
  expect(getBiomassCarbonDensity({ epci: '200000172' }, 'forêt mixte')).toBe(82.4445416)
})

test('returns area of haies (as ha) given valid EPCI SIREN', () => {
  expect(getArea({ epci: '249500513' }, 'haies')).toBe(33.79485686)
})

test('returns area of poplars (as ha) given valid EPCI SIREN', () => {
  expect(getArea({ epci: '249500513' }, 'forêt peupleraie')).toBe(212.4)
})

test('returns stocks of produits bois for France', () => {
  expect(getFranceStocksWoodProducts()).toStrictEqual({
    bo: 177419001,
    bi: 258680001
  })
})

test('returns stocks of produits bois for France by composition and category', () => {
  expect(getAnnualFranceWoodProductsHarvest()).toStrictEqual({
    feuillus: {
      bo: 15462933.6725767,
      bi: 6835439.59931826
    },
    coniferes: {
      bo: 4642351.6311988,
      bi: 4351545.84347542
    }
  })
})

test('returns stocks of produits bois for location by composition and category', () => {
  expect(getAnnualWoodProductsHarvest({ epci: '200000172' })).toStrictEqual({
    feuillus: {
      bo: 393.017426088703,
      bi: 214.082662991407
    },
    coniferes: {
      bo: 15745.2607908564,
      bi: 1324.09871367348
    }
  })
})

test('returns forest litter carbon density (tC/ha) for valid forest subtype', () => {
  expect(getForestLitterCarbonDensity('feuillu')).toBe(9)
})

test('throws error when attempting to get forest litter carbon density for invalid forest subtype', () => {
  let error
  try {
    getForestLitterCarbonDensity('invalid')
  } catch (e) {
    error = e
  }
  expect(error.message).toBe("No forest litter carbon density found for forest subtype 'invalid'")
})

test('returns biomass carbon density (as tC/ha) for poplar groves', () => {
  expect(getBiomassCarbonDensity({ epci: '200000172' }, 'forêt peupleraie')).toBe(51.79684346)
})
