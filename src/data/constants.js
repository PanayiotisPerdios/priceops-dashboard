export const COMPARE_FIELDS = [
  { id: 'vcpu_count', name: 'vCPU', direction: 'higher' },
  { id: 'memory_gb', name: 'Memory (GB)', direction: 'higher' },
  { id: 'effective_price_hr', name: 'Price / hr', direction: 'lower' },
  { id: 'data_quality_score', name: 'Data Quality Score', direction: 'higher' },
];

export const SCENARIO_CRITERIA = [
  { id: 'effective_price_hr', name: 'Price / hr', category: 'Cost', direction: 'lower' },
  { id: 'vcpu_count', name: 'vCPU', category: 'Performance', direction: 'higher' },
  { id: 'memory_gb', name: 'Memory (GB)', category: 'Performance', direction: 'higher' },
];

export const CHART_COLUMNS = [
  { id: 'vcpu_count', name: 'vCPU' },
  { id: 'memory_gb', name: 'Memory (GB)' },
  { id: 'effective_price_hr', name: 'Price / hr' },
  { id: 'data_quality_score', name: 'Data Quality Score' },
];

export const providerFullNames = {
  AWS: 'Amazon Web Services',
  Azure: 'Microsoft Azure',
  GCP: 'Google Cloud',
};

export const providerColors = {
  AWS: '#f0932b',
  Azure: '#0078d4',
  GCP: '#4285f4',
};

export const presetLabels = {
  costFirst: 'Cost First',
  performanceFirst: 'Performance First',
  balanced: 'Balanced',
};