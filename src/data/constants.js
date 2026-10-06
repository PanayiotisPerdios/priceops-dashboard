export const COMPARE_FIELDS = [
  { id: 'vcpu_count', name: 'vCPU', direction: 'higher' },
  { id: 'memory_gb', name: 'Memory (GB)', direction: 'higher' },
  { id: 'effective_price_hr', name: 'Price / hr', direction: 'lower' },
  { id: 'price_per_vcpu_hr', name: 'Price / vCPU-hr', direction: 'lower' },
  { id: 'price_per_gb_hr', name: 'Price / GB RAM-hr', direction: 'lower' },
  { id: 'data_quality_score', name: 'Data Quality Score', direction: 'higher' },
];

export const SCENARIO_CRITERIA = [
  { id: 'effective_price_hr', name: 'Price / hr', category: 'Cost', direction: 'lower' },
  { id: 'price_per_vcpu_hr', name: 'Price / vCPU-hr', category: 'Efficiency', direction: 'lower' },
  { id: 'price_per_gb_hr', name: 'Price / GB RAM-hr', category: 'Efficiency', direction: 'lower' },
  { id: 'vcpu_count', name: 'vCPU', category: 'Performance', direction: 'higher' },
  { id: 'memory_gb', name: 'Memory (GB)', category: 'Performance', direction: 'higher' },
];

export const CHART_COLUMNS = [
  { id: 'vcpu_count', name: 'vCPU' },
  { id: 'memory_gb', name: 'Memory (GB)' },
  { id: 'effective_price_hr', name: 'Price / hr' },
  { id: 'price_per_vcpu_hr', name: 'Price / vCPU-hr' },
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
  GCP: '#27ab30',
};

export const presetLabels = {
  costFirst: 'Cost First',
  performanceFirst: 'Performance First',
  balanced: 'Balanced',
  valueFirst: 'Best Value',
};

export const SUBCATEGORY_LABELS = {
  instance: 'Instances',
  gpu: 'GPU / accelerators',
  storage: 'Storage',
  license: 'Licenses',
  load_balancer: 'Load balancers',
  public_ip: 'Public IPs',
  cluster: 'Cluster fees',
  management_fee: 'Management fees',
  extended_support: 'Extended support',
  nat_gateway: 'NAT gateways',
  vpn: 'VPN',
  peering: 'Peering',
  transit_gateway: 'Transit gateways',
  serverless: 'Serverless',
  backup: 'Backup',
  data_transfer: 'Data transfer',
  data_processing: 'Data processing',
  requests: 'Requests / operations',
  iops: 'IOPS',
  throughput: 'Throughput',
  other: 'Other',
};

export const REGION_GROUP_LABELS = {
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  asia_pacific: 'Asia Pacific',
  middle_east: 'Middle East',
  africa: 'Africa',
  global: 'Global',
  other: 'Other',
};

export const PRICING_MODEL_LABELS = {
  on_demand: 'On-demand',
  spot: 'Spot',
  low_priority: 'Low priority',
  commitment: 'Commitment',
  other_term: 'Other term',
};

export const DEFAULT_SUBCATEGORY = 'instance';
export const SKU_OPTION_LIMIT = 400;   // max entries in a SKU <select>
export const TABLE_PAGE_SIZE = 50;     // DataExploration rows per page
export const CHART_LIMIT = 20;         // records drawn in MetricChart
export const EVAL_TOP_N = 25;          // Evaluation rows / bars shown
export const QUADRANT_LIMIT = 60;      // quadrant points (Pareto points always kept)