import { uniqSorted } from '@/utils/calculationServices';
import Papa from 'papaparse';

const BASE_URL = import.meta.env?.BASE_URL ?? '/';

export const DEFAULT_CSV_URL = `${BASE_URL}data/unified_pricing.csv`;
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

const GENERIC_SKU = /^(vcore|standard|basic|cpu|ram|kubernetes|google|ssd|global|dedicated|hybrid|automatic|backup)$/i;

export function csvToObjects(text) {
  const { data, errors } = Papa.parse(text, {
    header: true,                        
    delimiter: ',',                      
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });
  if (errors.length) {
    console.warn(`CSV parse issues (${errors.length}):`, errors.slice(0, 5));
  }
  return data;
}

function toNum(value) {
  if (value === '' || value == null) {
    return null;
  }
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number;
  }
  return null;
}

function round2(value) {
  if (value == null) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

function toBool(value) {
  const text = String(value ?? '').trim();
  return /^true$/i.test(text);
}

function toStr(value) {
  if (value === '' || value == null) {
    return null;
  }
  return String(value);
}

export function normalizeOs(v) {
  const os = String(v ?? '').toLowerCase();
  if (!os) {
    return null;
  }
  if (os.includes('openshift') || os.includes('r server')) {
    return null;
  }
  if (os.includes('windows')) {
    return 'Windows';
  }
  if (os.includes('red hat') || os.includes('rhel')) {
    return 'RHEL';
  }
  if (os.includes('sles') || os.includes('suse')) {
    return 'SUSE';
  }
  if (os.includes('linux') || os.includes('ubuntu')) {
    return 'Linux';
  }
  
  return null;
}

export function priceBasisOf(unit) {
  if (unit === 'hour' || unit === 'second') {
    return 'resource';
  }
  if (unit?.startsWith('vcpu_')) {
    return 'per_vcpu';
  }
  if (unit?.startsWith('gb_')) {
    return 'per_gb';
  }
  return 'other';
}

export function computeQualityScore({ vcpu, memory, estimated, pricingModel }) {
  let score = 100;
 
  if (vcpu == null) {
    score -= 20;
  }
  if (memory == null) {
    score -= 20;
  }
  if (estimated) {
    score -= 15;
  }
  if (pricingModel && pricingModel !== 'on_demand') {
    score -= 5;
  }
 
  return Math.max(0, score);
}

export function buildSkuName(r, os) {
  const vcpu = toNum(r.vcpu);
  const memoryGb = round2(toNum(r.memory_gb));
  const service = r.service || '';
 
  // ---- Step 1: main part of the name ----
  let core;
 
  if (r.category === 'database' && vcpu != null) {
    // Databases: engine · vCPU · memory · instance type
    const parts = [
      r.db_engine || service,
      `${vcpu} vCPU`,
      memoryGb != null ? `${memoryGb} GB` : null,
      r.instance_type,
    ];
    core = parts.filter(Boolean).join(' · ');
  } else {
    // Everything else: pick the best available identifier.
    // Virtual Machines prefer sku_name, other services prefer instance_type.
    const preferred = service === 'Virtual Machines' ? r.sku_name : r.instance_type;
    core = preferred || r.sku_name || r.description || r.sku_id || r.id;
 
    // Too vague on its own? Prefix with the service name.
    if (GENERIC_SKU.test(core)) {
      core = `${service} ${core}`.trim();
    }
  }
 
  // ---- Step 2: extra tags shown in parentheses ----
  const tags = [];
 
  // Only add a tag if the core name doesn't already mention it
  function addTag(tag) {
    if (!tag) {
      return;
    }
    const alreadyInName = core.toLowerCase().includes(tag.toLowerCase());
    if (!alreadyInName) {
      tags.push(tag);
    }
  }
 
  if (os && os !== 'Linux') {
    addTag(os); // Linux is the default, so we don't label it
  }
  if (r.pricing_model && r.pricing_model !== 'on_demand') {
    addTag(r.pricing_model.replace('_', ' '));
  }
  if (r.deployment === 'multi_az') {
    addTag('Multi-AZ');
  }
 
  if (tags.length === 0) {
    return core;
  }
  return `${core} (${tags.join(', ')})`;
}

export function mapUnifiedRow(r, { effectiveDate = DEFAULT_EFFECTIVE_DATE } = {}) {
  const unit = toStr(r.unit);
  let pricePerHour = toNum(r.price_per_hour);
  if (pricePerHour == null) {
    const priceUsd = toNum(r.price_usd);
 
    if (priceUsd != null && unit === 'hour') {
      pricePerHour = priceUsd;
    }
    if (priceUsd != null && unit === 'second') {
      pricePerHour = priceUsd * 3600;
    }
  }

  if (pricePerHour == null) {
    return null;
  }

  const os = normalizeOs(r.os_or_license);
  const vcpu = toNum(r.vcpu);
  const memory = round2(toNum(r.memory_gb));
  const estimated = toBool(r.specs_estimated);
  const isDb = r.category === 'database';
  const sole = /sole tenancy/i.test(r.description || '');

  return {
    id: r.id,
    provider: PROVIDER_LABELS[r.provider] ?? r.provider,
    resource_type: `${r.category}.${r.subcategory}`,
    domain: CATEGORY_TO_DOMAIN[r.category] ?? 'PaaS',
    region: r.region,
    operating_system: os,
    vcpu_count: vcpu,
    memory_gb: memory,
    effective_price_hr: pricePerHour,
    effective_date: effectiveDate,
    is_active: true,
    specs_inferred: estimated,
    specs_complete: toBool(r.specs_complete) && !estimated,
    data_quality_score: computeQualityScore({ vcpu, memory, estimated, pricingModel: r.pricing_model }),
    tenancy: sole ? 'Dedicated' : null,
    instance_type: isDb ? null : toStr(r.instance_type),
    product_family: toStr(r.service),
    skuName: buildSkuName(r, os),
    currencyCode: 'USD',
 
    category: r.category,
    subcategory: r.subcategory,
    price_basis: priceBasisOf(unit),
    price_per_vcpu_hr: toNum(r.price_per_vcpu_hour),
    price_per_gb_hr: memory ? pricePerHour / memory : null,
    unit,
    unit_qty: toNum(r.unit_qty) ?? 1,
    region_group: toStr(r.region_group),
    region_name: toStr(r.region_name),
    region_scope: toStr(r.region_scope),
    pricing_model: toStr(r.pricing_model) ?? 'on_demand',
    deployment: toStr(r.deployment),
    db_engine: toStr(r.db_engine),
    service: toStr(r.service),
    source_file: toStr(r.source_file),
  };
}

export function parseUnifiedCsv(text, options = {}) {
  const { basis = 'resource', subcategories = null, categories = null, dropZero = true } = options;

  const records = [];
  const rows = csvToObjects(text);
 
  for (const row of rows) {

    if (categories && !categories.includes(row.category)) {
      continue;
    }
    if (subcategories && !subcategories.includes(row.subcategory)) {
      continue;
    }
 
    const record = mapUnifiedRow(row, options);
    if (!record) {
      continue;
    }
 
    if (basis === 'resource' && record.price_basis !== 'resource') {
      continue;
    }
 
    if (dropZero && !(record.effective_price_hr > 0)) {
      continue;
    }
 
    records.push(record);
  }
 
  return records;
}

let cache = null;

export function loadUnifiedPricing(url = DEFAULT_CSV_URL, options = {}) {
  const cacheKey = url + JSON.stringify(options);
 
  if (cache?.key === cacheKey) {
    return cache.promise;
  }
 
  const promise = fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error(`Could not load ${url} (${response.status})`);
      }
      return response.text();
    })
    .then(function (text) {
      return parseUnifiedCsv(text, options);
    });
 
  cache = { key: cacheKey, promise };
 
  promise.catch(function () {
    cache = null;
  });
 
  return promise;
}

function uniqueValues(records, getValue) {
  const values = records.map(getValue);
  return uniqSorted(values);
}
export function deriveFilterOptions(records) {
  return {
    providers: uniqueValues(records, (r) => r.provider),
    domains: uniqueValues(records, (r) => r.domain),
    categories: uniqueValues(records, (r) => r.category),
    subcategories: uniqueValues(records, (r) => r.subcategory),
    regions: uniqueValues(records, (r) => r.region),
    regionGroups: uniqueValues(records, (r) => r.region_group),
    operatingSystems: uniqueValues(records, (r) => r.operating_system),
    dbEngines: uniqueValues(records, (r) => r.db_engine),
    pricingModels: uniqueValues(records, (r) => r.pricing_model),
  };
}