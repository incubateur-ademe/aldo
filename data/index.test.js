const { getCarbonDensity, getArea, getBiomassCarbonDensity, epciList } = require("./index")

test('returns ground carbon density (as tC/ha) given valid ground type and EPCI SIREN', async () => {
  expect(await getCarbonDensity({epci: "200000172"}, "cultures")).toBe(54.63076734)
})

test('returns area in hectares (ha) for ground type "cultures" and valid EPCI SIREN', async () => {
  expect(await getArea({epci: "200000172"}, "cultures")).toBe(1740.7313534999998)
})

test('returns area in hectares (ha) for ground type "prairies zones herbacées" and valid EPCI SIREN', async () => {
  expect(await getArea({epci: "200000172"}, "prairies zones herbacées")).toBe(2522.1652952)
})

test('throws useful error when attempting to get area for ground type without type to CLC type mapping', async () => {
  try {
    await getArea({epci: "200000172"}, "lake")
  } catch (error) {
    expect(error.message).toBe("No CLC code mapping found for ground type 'lake'")
  }
})

// TODO: Ask about source of that data, and why many ground types don't have values, others appear to be constant.
test('returns biomass carbon density (as tC/ha) given valid ground type and EPCI SIREN', async () => {
  expect(await getBiomassCarbonDensity({epci: "200000172"}, "prairies zones arborées")).toBe(57)
})

test('returns forest biomass carbon density (as tC/ha) given valid forest type and EPCI SIREN', async () => {
  expect(await getBiomassCarbonDensity({epci: "200000172"}, "forêt mixte")).toBe(82.4445416)
})

test('returns area of haies (as ha) given valid EPCI SIREN', async () => {
  expect(await getArea({epci: "249500513"}, "haies")).toBe(33.79485686)
})
// TODO: litière

test('returns EPCI list', async () => {
  const list = await epciList()
  expect(list.length).toBe(1249)
})
