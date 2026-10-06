import { uniqSorted } from '@/utils/calculationServices';

export const DEFAULT_CSV_URL = `${import.meta.env?.BASE_URL ?? '/'}data/unified_pricing.csv`;
export const DEFAULT_EFFECTIVE_DATE = '2026-10-02T00:00:00Z';
export const PROVIDER_LABELS = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

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

export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  const n = text.length;
  let row = [];
  let i = 0;

  while (i < n) {
    let field;

    if (text[i] === '"') {
      i++;
      let start = i;
      let buf = '';
      for (;;) {
        const q = text.indexOf('"', i);
        if (q === -1) { buf += text.slice(start); i = n; break; }       // unterminated quote
        if (text[q + 1] === '"') { buf += text.slice(start, q + 1); i = q + 2; start = i; continue; }
        buf += text.slice(start, q);
        i = q + 1;
        break;
      }
      field = buf;
    } else {
      let j = i;
      while (j < n) {
        const c = text[j];
        if (c === ',' || c === '\n' || c === '\r') break;
        j++;
      }
      field = text.slice(i, j);
      i = j;
    }

    row.push(field);

    if (i >= n) { rows.push(row); row = []; break; }

    const c = text[i];
    if (c === ',') {
      i++;
      if (i >= n) { row.push(''); rows.push(row); row = []; }
    } else {
      if (c === '\r' && text[i + 1] === '\n') i++;
      i++;
      rows.push(row);
      row = [];
    }
  }

  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

export function csvToObjects(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  const out = new Array(rows.length - 1);
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    const cells = rows[r];
    for (let c = 0; c < header.length; c++) obj[header[c]] = cells[c] ?? '';
    out[r - 1] = obj;
  }
  return out;
}

const toNum = v => {
  if (v === '' || v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const round2 = x => (x == null ? null : Math.round(x * 100) / 100);
const toBool = v => /^true$/i.test(String(v ?? '').trim());
const toStr = v => (v === '' || v == null ? null : String(v));

export function normalizeOs(v) {
  const t = String(v ?? '').toLowerCase();
  if (!t) return null;
  if (t.includes('windows')) return 'Windows';
  if (t.includes('red hat') || t.includes('rhel')) return 'RHEL';
  if (t.includes('sles') || t.includes('suse')) return 'SUSE';
  if (t.includes('linux') || t.includes('ubuntu')) return 'Linux';
  return null;
}

export function priceBasisOf(unit) {
  if (unit === 'hour' || unit === 'second') return 'resource';
  if (unit?.startsWith('vcpu_')) return 'per_vcpu';
  if (unit?.startsWith('gb_')) return 'per_gb';
  return 'other';
}

export function computeQualityScore({ vcpu, memory, estimated, pricingModel }) {
  let score = 100;
  if (vcpu == null) score -= 20;
  if (memory == null) score -= 20;
  if (estimated) score -= 15;
  if (pricingModel && pricingModel !== 'on_demand') score -= 5;
  return Math.max(0, score);
}

export function buildSkuName(r, os) {
  const vcpu = toNum(r.vcpu);
  const mem = round2(toNum(r.memory_gb));
  const service = r.service || '';

  let core;
  if (r.category === 'database' && vcpu != null) {
    core = [r.db_engine || service, `${vcpu} vCPU`, mem != null ? `${mem} GB` : null, r.instance_type]
      .filter(Boolean).join(' · ');
  } else {
    core = (service === 'Virtual Machines' ? r.sku_name : r.instance_type) || r.sku_name || r.description || r.sku_id || r.id;
    if (GENERIC_SKU.test(core)) core = `${service} ${core}`.trim();
  }

  const label = [core];
  const addTag = tag => { if (tag && !core.toLowerCase().includes(tag.toLowerCase())) label.push(tag); };
  if (os && os !== 'Linux') addTag(os);
  if (r.pricing_model && r.pricing_model !== 'on_demand') addTag(r.pricing_model.replace('_', ' '));
  if (r.deployment === 'multi_az') addTag('Multi-AZ');
  return label.length > 1 ? `${label[0]} (${label.slice(1).join(', ')})` : label[0];
}

export function mapUnifiedRow(r, { effectiveDate = DEFAULT_EFFECTIVE_DATE } = {}) {
  const unit = toStr(r.unit);
  let pricePerHour = toNum(r.price_per_hour);
  if (pricePerHour == null) {
    const p = toNum(r.price_usd);
    if (p != null && unit === 'hour') pricePerHour = p;
    if (p != null && unit === 'second') pricePerHour = p * 3600;
  }
  if (pricePerHour == null) return null;

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
  for (const row of csvToObjects(text)) {
    if (categories && !categories.includes(row.category)) continue;
    if (subcategories && !subcategories.includes(row.subcategory)) continue;
    const rec = mapUnifiedRow(row, options);
    if (!rec) continue;
    if (basis === 'resource' && rec.price_basis !== 'resource') continue;
    if (dropZero && !(rec.effective_price_hr > 0)) continue;
    records.push(rec);
  }
  return records;
}

let cache = null;

export function loadUnifiedPricing(url = DEFAULT_CSV_URL, options = {}) {
  const key = url + JSON.stringify(options);
  if (cache?.key === key) return cache.promise;
  const promise = fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
      return res.text();
    })
    .then(text => parseUnifiedCsv(text, options));
  cache = { key, promise };
  promise.catch(() => { cache = null; });
  return promise;
}

const uniq = (arr, f) => uniqSorted(arr.map(f));

export function deriveFilterOptions(records) {
  return {
    providers: uniq(records, r => r.provider),
    domains: uniq(records, r => r.domain),
    categories: uniq(records, r => r.category),
    subcategories: uniq(records, r => r.subcategory),
    regions: uniq(records, r => r.region),
    regionGroups: uniq(records, r => r.region_group),
    operatingSystems: uniq(records, r => r.operating_system),
    dbEngines: uniq(records, r => r.db_engine),
    pricingModels: uniq(records, r => r.pricing_model),
  };
}