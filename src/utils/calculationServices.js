export const getProviderValue = (providerMockData, provider, service, category, fieldId) => {
  return providerMockData?.[provider]?.[service]?.[category]?.[fieldId]
}

export const normalizeValue = (value, field, range = null) => {
  const [min, max] = range || field.range
  if (min == null || max == null || max === min) return 50

  const clamped = Math.max(min, Math.min(max, value))
  const normalized = ((clamped - min) / (max - min)) * 100

  return field.direction === "lower"
    ? 100 - normalized
    : normalized
}

export const getScoreLabel = (normalized) => {
  if (normalized <= 15) return "VERY LOW SCORE"
  if (normalized <= 35) return "LOW SCORE"
  if (normalized <= 65) return "MEDIUM SCORE"
  if (normalized <= 85) return "HIGH SCORE"
  return "VERY HIGH SCORE"
}

export const getScore = (field, value, range = null) => {
  if (value == null || isNaN(value)) {
    return { normalized: null, label: null }
  }
  const normalized = normalizeValue(value, field, range)
  return {
    normalized,
    label: getScoreLabel(normalized)
  }
}

export const getDynamicRange = (providerMockData, service, category, fieldId, entityKeys = null) => {
  const keys = entityKeys && entityKeys.length ? entityKeys : Object.keys(providerMockData)
  const values = keys
    .map(provider => getProviderValue(providerMockData, provider, service, category, fieldId))
    .filter(v => v != null && !isNaN(v))
 
  if (values.length < 2) return null
  return [Math.min(...values), Math.max(...values)]
}

export const getDelta = (providerMockData, provider1, provider2, service, category, fieldId) => {
  const p1 = getProviderValue(providerMockData, provider1, service, category, fieldId)
  const p2 = getProviderValue(providerMockData, provider2, service, category, fieldId)
 
  if (p1 == null || p2 == null) return '-'
  return (p1 - p2).toFixed(2)
}
 
export const getWinner = (providerMockData, provider1, provider2, service, category, field) => {
  const p1 = getProviderValue(providerMockData, provider1, service, category, field.id)
  const p2 = getProviderValue(providerMockData, provider2, service, category, field.id)
 
  if (p1 == null || p2 == null) return '-'
 
  if (field.direction === 'lower') {
    return p1 < p2 ? provider1 : provider2
  }
  return p1 > p2 ? provider1 : provider2
}
 
export const getBilling = (providerMockData, provider, service) => {
  return providerMockData?.[provider]?.[service]?.Billing ?? null
}
 
export const kpiCardColor = (label) => {
  if (['VERY LOW SCORE', 'LOW SCORE'].includes(label)) return 'negative-kpi'
  if (['VERY HIGH SCORE', 'HIGH SCORE'].includes(label)) return 'positive-kpi'
  if (label === 'MEDIUM SCORE') return 'neutral-kpi'
  return ''
}