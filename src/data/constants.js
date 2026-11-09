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

export const BASE_URL = import.meta.env?.BASE_URL ?? '/';


export const SKU_OPTION_LIMIT = 400;   // max entries in a SKU <select>
export const TABLE_PAGE_SIZE = 50;     // DataExploration rows per page
export const CHART_LIMIT = 20;         // records drawn in MetricChart
export const EVAL_TOP_N = 25;          // Evaluation rows / bars shown
export const QUADRANT_LIMIT = 60;      // quadrant points (Pareto points always kept)