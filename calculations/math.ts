// Agrégations partagées entre les calculs de stocks et de flux.

export function sumByProperty<K extends string> (objArray: readonly Partial<Record<K, number>>[], key: K) {
  let sum = 0
  objArray.forEach((obj) => {
    sum += obj[key] ?? 0
  })
  return sum
}

export function weightedAverage<K extends string> (objArray: readonly Partial<Record<K, number>>[], key: K, keyForWeighting: K) {
  let weightedSum = 0
  objArray.forEach((obj) => {
    weightedSum += (obj[key] ?? 0) * (obj[keyForWeighting] ?? 0)
  })
  const total = sumByProperty(objArray, keyForWeighting)
  return total ? weightedSum / total : 0
}

export function average<K extends string> (objArray: readonly Partial<Record<K, number>>[], key: K) {
  const count = objArray.length
  if (!count) return 0
  return sumByProperty(objArray, key) / count
}
