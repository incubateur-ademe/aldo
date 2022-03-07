const { getCarbonDensity, getArea, getBiomassCarbonDensity, epciList, getPopulationTotal, getFranceStocksWoodProducts, getForestLitterCarbonDensity } = require('./index')
// TODO: mock data sources?

test('returns ground carbon density (as tC/ha) given valid ground type and EPCI SIREN', async () => {
  expect(await getCarbonDensity({ epci: '200000172' }, 'cultures')).toBe(54.63076734)
})

test('returns area in hectares (ha) for ground type "cultures" and valid EPCI SIREN', async () => {
  expect(await getArea({ epci: '200000172' }, 'cultures')).toBe(1740.7313534999998)
})

test('returns area in hectares (ha) for ground type "prairies zones herbacées" and valid EPCI SIREN', async () => {
  expect(await getArea({ epci: '200000172' }, 'prairies zones herbacées')).toBe(2522.1652952)
})

test('throws useful error when attempting to get area for ground type without type to CLC type mapping', async () => {
  try {
    await getArea({ epci: '200000172' }, 'lake')
  } catch (error) {
    expect(error.message).toBe("No CLC code mapping found for ground type 'lake'")
  }
})

// TODO: Ask about source of that data, and why many ground types don't have values, others appear to be constant.
test('returns biomass carbon density (as tC/ha) given valid ground type and EPCI SIREN', async () => {
  expect(await getBiomassCarbonDensity({ epci: '200000172' }, 'prairies zones arborées')).toBe(57)
})

test('returns forest biomass carbon density (as tC/ha) given valid forest type and EPCI SIREN', async () => {
  expect(await getBiomassCarbonDensity({ epci: '200000172' }, 'forêt mixte')).toBe(82.4445416)
})

test('returns area of haies (as ha) given valid EPCI SIREN', async () => {
  expect(await getArea({ epci: '249500513' }, 'haies')).toBe(33.79485686)
})

test('returns area of poplars (as ha) given valid EPCI SIREN', async () => {
  expect(await getArea({ epci: '249500513' }, 'forêt peupleraie')).toBe(212.4)
})

test('returns population total for EPCIs in system', async () => {
  expect(getPopulationTotal(await epciList())).toBe(65705495)
})

test('returns stocks of produits bois for France', () => {
  expect(getFranceStocksWoodProducts()).toStrictEqual({
    bo: 177419001,
    bi: 258680001
  })
})

test('returns forest litter carbon density (tC/ha) for valid forest subtype', () => {
  expect(getForestLitterCarbonDensity('feuillu')).toBe(9)
})

test('throws error when attempting to get forest litter carbon density for invalid forest subtype', () => {
  try {
    getForestLitterCarbonDensity('invalid')
  } catch (error) {
    expect(error.message).toBe("No forest litter carbon density found for forest subtype 'invalid'")
  }
})

test('returns biomass carbon density (as tC/ha) for poplar groves', async () => {
  expect(await getBiomassCarbonDensity({ epci: '200000172' }, 'forêt peupleraie')).toBe(51.79684346)
})

test('returns EPCI list', async () => {
  const list = await epciList()
  expect(list.length).toBe(1248)
})
