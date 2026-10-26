import { AgriculturalPractices, type PracticeId } from '../constants.ts'
import { cToCo2e, type Flux } from '../../data/flux.ts'

// in tC/ha.an
const GROUND_FLUX: Record<PracticeId, number> = {
  prairieExtension: 0.14,
  prairieIntensification: 0.39,
  cropsAgroforestry: 0.3,
  prairiesAgroforestry: 0.3,
  catchCrops: 0.24,
  cropsHedges: 0.06,
  prairiesHedges: 0.1,
  grassyStrips: 0.49,
  vineyardsInterCoverCropping: 0.32,
  orchardsInterCoverCropping: 0.49,
  directSowingContinuous: 0.15,
  directSowingFiveYearWork: 0.1
}

const BIOMASS_FLUX: Record<PracticeId, number> = {
  prairieExtension: 0,
  prairieIntensification: 0,
  cropsAgroforestry: 0.7,
  prairiesAgroforestry: 0.7,
  catchCrops: 0,
  cropsHedges: 0.09,
  prairiesHedges: 0.15,
  grassyStrips: 0,
  vineyardsInterCoverCropping: 0,
  orchardsInterCoverCropping: 0,
  directSowingContinuous: 0,
  directSowingFiveYearWork: 0
}

// if the flux data changes to be area-specific or fetched from an API in the future, move to /data
export function getPracticeFlux (practice: PracticeId, reservoir: 'sol' | 'biomasse'): number {
  return (reservoir === 'sol' ? GROUND_FLUX : BIOMASS_FLUX)[practice]
}

export function getFluxAgriculturalPractices (areas?: Partial<Record<PracticeId, number>>) {
  const fluxes: Flux[] = []
  if (!areas) return fluxes
  AgriculturalPractices.forEach((practiceDetail) => {
    const practice = practiceDetail.id
    const area = areas[practice]
    if (area === undefined) return
    const reservoirs = ['sol', 'biomasse'] as const
    reservoirs.forEach(reservoir => {
      const flux = getPracticeFlux(practice, reservoir)
      const value = flux * area
      if (value) {
        fluxes.push({
          practice,
          to: practiceDetail.groundType,
          area,
          areaModified: area !== 0,
          reservoir,
          gas: 'C',
          flux,
          fluxEquivalent: cToCo2e(flux),
          value,
          co2e: cToCo2e(value)
        })
      }
    })
  })
  return fluxes
}
