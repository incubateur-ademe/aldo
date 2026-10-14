// Types des imports JSON de data/. Les fichiers *.csv.json sont générés par
// csvtojson.sh (et absents du dépôt) : on déclare leurs types ici plutôt que
// de laisser tsc les inférer depuis des fichiers de plus de 100 Mo.

declare module '*/communes.json' {
  const communes: Record<string, import('./types.ts').Commune>
  export default communes
}
declare module '*/epcis.json' {
  const epcis: Record<string, import('./types.ts').Epci>
  export default epcis
}
declare module '*/france.json' {
  const france: import('./types.ts').FranceData
  export default france
}
declare module '*/region-to-inter-region.json' {
  const regions: Record<string, import('./types.ts').InterRegion>
  export default regions
}
declare module '*/catenr/cinetiques.json' {
  const kinetics: Record<string, number>
  export default kinetics
}
declare module '*/catenr/duree-stock-biomasse.json' {
  const durations: Record<string, number>
  export default durations
}

declare module '*/communes_17122018.csv.json' {
  const rows: import('./csv.ts').CommuneCsvRow[]
  export default rows
}
declare module '*/zpc.csv.json' {
  const rows: import('./csv.ts').ZpcRow[]
  export default rows
}
declare module '*/stocks-zpc.csv.json' {
  const rows: import('./csv.ts').StocksZpcRow[]
  export default rows
}
declare module '*/flux-zpc.csv.json' {
  const rows: import('./csv.ts').FluxZpcRow[]
  export default rows
}
declare module '*/biomass-hors-forets.csv.json' {
  const rows: import('./csv.ts').BiomassRow[]
  export default rows
}
declare module '*/surface-foret.csv.json' {
  const rows: import('./csv.ts').SurfaceForetRow[]
  export default rows
}
declare module '*/bilan-carbone-foret-par-localisation.IGN-2022.csv.json' {
  const rows: import('./csv.ts').IgnRow[]
  export default rows
}
declare module '*/bilan-carbone-foret-par-localisation.IGN-2026.csv.json' {
  const rows: import('./csv.ts').IgnRow[]
  export default rows
}
declare module '*/proportion-usage-bois-par-region.csv.json' {
  const rows: import('./csv.ts').WoodProportionRow[]
  export default rows
}
declare module '*/carbone-haies.csv.json' {
  const rows: import('./csv.ts').HedgerowCarbonRow[]
  export default rows
}
declare module '*/haie-clc18.csv.json' {
  const rows: import('./csv.ts').HedgerowLengthRow[]
  export default rows
}
declare module '*/citepa-surfaces-2023.csv.json' {
  const rows: import('./csv.ts').CitepaSurfaceRow[]
  export default rows
}
declare module '*/citepa-flux-2013-2023.csv.json' {
  const rows: import('./csv.ts').CitepaChangeRow[]
  export default rows
}
declare module '*/epci.csv.json' {
  const rows: import('./csv.ts').EpciCsvRow[]
  export default rows
}

// Dépendances sans types publiés
declare module 'excel4node'
declare module 'sib-api-v3-sdk'
