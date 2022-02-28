const { getCarbonDensity, getArea } = require("./index")


test('returns ground carbon density (as tC/ha) given valid ground type and EPCI SIREN', async () => {
  expect(await getCarbonDensity({epci: "200000172"}, "cultures")).toBe(54.63)
})

test('returns area in hectares (ha) for ground type "cultures" and valid EPCI SIREN', async () => {
  expect(await getArea({epci: "200000172"}, "cultures")).toBe(1740.7313534999998)
})

test('returns area in hectares (ha) for ground type "prairies" and valid EPCI SIREN', async () => {
  expect(await getArea({epci: "200000172"}, "prairies")).toBe(2599.15354877)
})

test('throws useful error when attempting to get area for ground type without type to CLC type mapping', async () => {
  try {
    await getArea({epci: "200000172"}, "lake")
  } catch (error) {
    expect(error.message).toBe("No CLC code mapping found for ground type 'lake'")
  }
})

// test('returns biomass carbon density (as tC/ha) given valid ground type and EPCI SIREN', () => {
//   expect(getBiomassCarbonDensity({epci: "200000172"}, "prairies zones arborées")).toBe(57)
// })