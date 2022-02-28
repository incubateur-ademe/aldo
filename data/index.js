const csv = require('csvtojson')

async function getGroundCarbonDensity(location, groundType) {
  const csvFilePath = './data/dataByEpci/ground.csv'
  const groundDataByEpci = await csv().fromFile(csvFilePath)
  const groundData = groundDataByEpci.find(data => data.epciSiren === location.epci)
  return parseFloat(groundData[groundType])
}

module.exports = {
  getGroundCarbonDensity,
}