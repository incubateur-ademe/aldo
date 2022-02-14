const { getEpci } = require("../epcis")

function getSummary(locations) {
  let summary = {}
  summary.locations = locations.epcis.map(locationName => getEpci(locationName))
  summary.total = 90800 // dummy value for testing
  return summary
}

module.exports = getSummary