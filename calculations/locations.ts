import epciData from '../data/dataByEpci/epcis.json' with { type: 'json' }
import communeData from '../data/dataByCommune/communes.json' with { type: 'json' }

export function getEpci (searchTerm: string, bySiren = false) {
  if (bySiren) {
    return epciData[searchTerm]
  }
  const epci = Object.values(epciData).find(epci => epci.nom === searchTerm)
  return epci
}

export function getCommune (searchTerm: string, byCode = false) {
  if (byCode) {
    return communeData[searchTerm]
  } else {
    return Object.values(communeData).find((data) => data.nom === searchTerm)
  }
}
