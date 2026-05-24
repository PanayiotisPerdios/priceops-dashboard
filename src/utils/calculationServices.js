export const normalizeValue = (value, field) => {
  const [min, max] = field.range

  const clamped = Math.max(min, Math.min(max, value))
  const normalized = ((clamped - min) / (max - min)) * 100

  return field.direction === "lower"
    ? 100 - normalized
    : normalized
}

export const getScoreLabel = (normalized) => {
  if (normalized <= 15) 
    return "VERY LOW"
  if (normalized <= 35) 
    return "LOW"
  if (normalized <= 65) 
    return "MEDIUM"
  if (normalized <= 85) 
    return "HIGH"

  return "VERY HIGH"
}

export const getScore = (field, value) => {
const normalized = normalizeValue(value, field)
  return {
    normalized, 
    label: getScoreLabel(normalized)
  }
}

export const getProviderValue = (providerMockData,provider,service,metric,fieldName) => {
  return providerMockData?.[provider]?.[service]?.[metric]?.[fieldName]
}

export const getDelta = (provider1, provider2, fieldName, providerMockData, service, metric) => {
  const p1 = providerMockData?.[provider1]?.[service]?.[metric]?.[fieldName]
  const p2 = providerMockData?.[provider2]?.[service]?.[metric]?.[fieldName]

  if (p1 == null || p2 == null) return '-'

  return (p1 - p2).toFixed(2)
}

export const getWinner = (provider1, provider2, field, providerMockData, service, metric) => {
  const p1 = providerMockData?.[provider1]?.[service]?.[metric]?.[field.name]
  const p2 = providerMockData?.[provider2]?.[service]?.[metric]?.[field.name]

  if (p1 == null || p2 == null) return '-'

  if (field.direction === 'lower') {
    return p1 < p2
      ? provider1
      : provider2
  }

   return p1 > p2
    ? provider1
    : provider2
}

/*
export const performanceFieldRules = (service, metric) => {
    
}
export const generateKpiEvaluations = () => {

}
*/