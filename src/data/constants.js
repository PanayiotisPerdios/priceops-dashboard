export const FOCUS_SUBCATEGORIES = {
    'AI and Machine Learning': [
        'AI Platforms',
        'Bots',
        'Generative AI',
        'Machine Learning',
        'Natural Language Processing',
        'Other (AI and Machine Learning)'
    ],

    'Analytics': [
        'Analytics Platforms',
        'Business Intelligence',
        'Data Processing',
        'Search',
        'Streaming Analytics',
        'Other (Analytics)'
    ],

    'Business Applications': [
        'Productivity and Collaboration',
        'Other (Business Applications)'
    ],

    'Compute': [
        'Containers',
        'End User Computing',
        'Quantum Compute',
        'Serverless Compute',
        'Virtual Machines',
        'Other (Compute)'
    ],

    'Databases': [
        'Caching',
        'Data Warehouses',
        'Ledger Databases',
        'NoSQL Databases',
        'Relational Databases',
        'Time Series Databases',
        'Other (Databases)'
    ],

    'Developer Tools': [
        'Developer Platforms',
        'Continuous Integration and Deployment',
        'Development Environments',
        'Source Code Management',
        'Quality Assurance',
        'Other (Developer Tools)'
    ],

    'Identity': [
        'Identity and Access Management',
        'Other (Identity)'
    ],

    'Integration': [
        'API Management',
        'Messaging',
        'Workflow Orchestration',
        'Other (Integration)'
    ],

    'Internet of Things': [
        'IoT Analytics',
        'IoT Platforms',
        'Other (Internet of Things)'
    ],

    'Management and Governance': [
        'Architecture',
        'Compliance',
        'Cost Management',
        'Data Governance',
        'Disaster Recovery',
        'Endpoint Management',
        'Observability',
        'Support',
        'Other (Management and Governance)'
    ],

    'Media': [
        'Content Creation',
        'Gaming',
        'Media Streaming',
        'Mixed Reality',
        'Other (Media)'
    ],

    'Migration': [
        'Data Migration',
        'Resource Migration',
        'Other (Migration)'
    ],

    'Mobile': [
        'Other (Mobile)'
    ],

    'Multicloud': [
        'Multicloud Integration',
        'Other (Multicloud)'
    ],

    'Networking': [
        'Application Networking',
        'Content Delivery',
        'Network Connectivity',
        'Network Infrastructure',
        'Network Routing',
        'Network Security',
        'Other (Networking)'
    ],

    'Security': [
        'Secret Management',
        'Security Posture Management',
        'Threat Detection and Response',
        'Other (Security)'
    ],

    'Storage': [
        'Backup Storage',
        'Block Storage',
        'File Storage',
        'Object Storage',
        'Storage Platforms',
        'Other (Storage)'
    ],

    'Web': [
        'Application Platforms',
        'Other (Web)'
    ],

    'Other': [
        'Other (Other)'
    ]
};

export const scenarioA = {
    name: 'Production Web App',

    regionGroup: 'Europe',
    operatingSystem: 'Linux',
    hoursPerMonth: 730,
    pricingCategory: 'Standard',
    policy: 'balanced',

    components: [
        {
            ServiceCategory: 'Compute',
            ServiceSubcategory: 'Virtual Machines',
            PriceComponent: 'Instance',
            PricingUnit: 'Hour',
            quantity: 2,
            minVcpu: 4,
            minMemoryGiB: 16
        }
    ]
};

export const COMPARE_FIELDS = [
  { key: 'ListUnitPrice', name: 'List unit price', numeric: true, lowerBetter: true, price: true },
  { key: 'VCpu', name: 'vCPU', numeric: true, lowerBetter: false },
  { key: 'MemoryGiB', name: 'Memory (GiB)', numeric: true, lowerBetter: false },
  { key: 'ServiceCategory', name: 'Category' }, { key: 'ServiceName', name: 'Service' },
  { key: 'SkuName', name: 'SKU name' }, { key: 'SkuId', name: 'SKU ID' },
  { key: 'RegionId', name: 'Region' }, { key: 'RegionGroup', name: 'Area' },
  { key: 'PricingCategory', name: 'Pricing category' }, { key: 'PricingUnit', name: 'Pricing unit' },
  { key: 'PriceComponent', name: 'Price component' }, { key: 'OperatingSystem', name: 'OS' },
  { key: 'DatabaseEngine', name: 'Database engine' }, { key: 'StorageClass', name: 'Storage class' },
  { key: 'ServiceTier', name: 'Service tier' }, { key: 'CommitmentTerm', name: 'Commitment term' },
  { key: 'CommitmentType', name: 'Commitment type' }, { key: 'Tenancy', name: 'Tenancy' },
  { key: 'DeploymentOption', name: 'Deployment' }
];

export const SCENARIO_CRITERIA = {
    Compute: [
        {
            id: 'monthlyCost',
            category: 'Cost',
            direction: 'lower'
        },
        {
            id: 'costPerVCpu',
            category: 'Efficiency',
            direction: 'lower'
        },
        {
            id: 'costPerMemoryGiB',
            category: 'Efficiency',
            direction: 'lower'
        },
        {
            id: 'VCpu',
            category: 'Performance',
            direction: 'higher'
        },
        {
            id: 'MemoryGiB',
            category: 'Performance',
            direction: 'higher'
        }
    ],

    Storage: [
        {
            id: 'monthlyCost',
            category: 'Cost',
            direction: 'lower'
        },
        {
            id: 'unitPrice',
            category: 'Efficiency',
            direction: 'lower'
        }
    ],

    Databases: [
        {
            id: 'monthlyCost',
            category: 'Cost',
            direction: 'lower'
        },
        {
            id: 'costPerVCpu',
            category: 'Efficiency',
            direction: 'lower'
        },
        {
            id: 'VCpu',
            category: 'Performance',
            direction: 'higher'
        },
        {
            id: 'MemoryGiB',
            category: 'Performance',
            direction: 'higher'
        }
    ]
};

export const CHART_COLUMNS = [
    { 
        id: 'VCpu', 
        name: 'vCPU' 
    },
    { 
        id: 'MemoryGiB', 
        name: 'Memory (GiB)' 
    },
    { 
        id: 'ListUnitPrice', 
        name: 'List unit price' 
    }
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

export const DEFAULT_EFFECTIVE_DATE = '2026-10-02T00:00:00Z';

export const PROVIDER_LABELS = { 
  aws: 'AWS', 
  azure: 'Azure', 
  gcp: 'GCP' 
};

export const CATEGORY_TO_DOMAIN = {
  compute: 'IaaS',
  containers: 'CaaS',
  kubernetes: 'CaaS',
  database: 'Database',
  storage: 'PaaS',
  networking: 'PaaS',
  backup: 'PaaS',
};

export const GENERIC_SKU = /^(vcore|standard|basic|cpu|ram|kubernetes|google|ssd|global|dedicated|hybrid|automatic|backup)$/i;

export const BASE_URL = import.meta.env?.BASE_URL ?? '/';


export const DEFAULT_SUBCATEGORY = 'instance';
export const SKU_OPTION_LIMIT = 400;   // max entries in a SKU <select>
export const TABLE_PAGE_SIZE = 50;     // DataExploration rows per page
export const CHART_LIMIT = 20;         // records drawn in MetricChart
export const EVAL_TOP_N = 25;          // Evaluation rows / bars shown
export const QUADRANT_LIMIT = 60;      // quadrant points (Pareto points always kept)