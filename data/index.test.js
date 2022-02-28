const { getGroundCarbonDensity } = require("./index")


test('returns ground carbon density (as tC/ha) given valid ground type and EPCI SIREN', async () => {
  expect(await getGroundCarbonDensity({epci: "200000172"}, "cultures")).toBe(54.63)
})

// test('returns biomass carbon density (as tC/ha) given valid ground type and EPCI SIREN', () => {
//   expect(getBiomassCarbonDensity({epci: "200000172"}, "prairies zones arborées")).toBe(57)
// })