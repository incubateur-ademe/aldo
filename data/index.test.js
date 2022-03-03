const { getCarbonDensity, getArea, getBiomassCarbonDensity } = require("./index")


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

// TODO: litière