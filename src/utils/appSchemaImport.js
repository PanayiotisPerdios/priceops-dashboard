import { computeQualityScore } from '@/utils/unifiedPricingLoader';
import { DEFAULT_SUBCATEGORY } from '@/data/constants';

const ALIASES = {
  id: ['id'],
  provider: ['provider'],
  domain: ['domain'],
  subcategory: ['subcategory', 'type'],
  resource_type: ['resourcetype'],
  skuName: ['skuname', 'sku'],
  region: ['region'],
  region_group: ['regiongroup', 'area'],
  operating_system: ['os', 'operatingsystem'],
  db_engine: ['dbengine', 'engine'],
  deployment: ['deployment'],
  pricing_model: ['pricingmodel', 'pricing'],
  vcpu_count: ['vcpu', 'vcpucount'],
  memory_gb: ['memorygb', 'memory'],
  effective_price_hr: ['pricehr', 'effectivepricehr', 'pricehour', 'priceperhour'],
  specs_inferred: ['specsestimated', 'specsinferred'],
  data_quality_score: ['qualityscore', 'dataqualityscore'],
};

const norm = (h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
const LOOKUP = new Map();
for (const [field, names] of Object.entries(ALIASES)) {
  for (const n of names) LOOKUP.set(n, field);
}

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v) => (v === '' || v == null ? null : String(v).trim());

function canonicalRow(raw) {
  const out = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = LOOKUP.get(norm(header));
    if (field) out[field] = value;
  }
  return out;
}

export function isAppSchema(firstRow) {
  if (!firstRow) return false;
  return Object.keys(firstRow).some((h) => ALIASES.effective_price_hr.includes(norm(h)));
}

export function parseAppRows(rows) {
  const records = [];

  rows.forEach((raw, i) => {
    const r = canonicalRow(raw);
    const price = num(r.effective_price_hr);
    if (!str(r.provider) || !str(r.region) || !(price > 0)) return;

    const vcpu = num(r.vcpu_count);
    const memory = num(r.memory_gb);
    const provider = str(r.provider);
    const region = str(r.region);
    const subcategory = str(r.subcategory) ?? DEFAULT_SUBCATEGORY;
    const pricingModel = str(r.pricing_model) ?? 'on_demand';
    const inferred = /^(true|1|yes)$/i.test(String(r.specs_inferred ?? ''));

    records.push({
      id: str(r.id) ?? `${provider}-${region}-${i}`,
      provider,
      domain: str(r.domain) ?? 'PaaS',
      subcategory,
      category: null,
      resource_type: str(r.resource_type) ?? subcategory,
      skuName: str(r.skuName) ?? `${provider} ${subcategory} #${i + 1}`,
      region,
      region_group: str(r.region_group),
      region_name: null,
      operating_system: str(r.operating_system),
      db_engine: str(r.db_engine),
      deployment: str(r.deployment),
      pricing_model: pricingModel,
      vcpu_count: vcpu,
      memory_gb: memory,
      effective_price_hr: price,
      price_per_vcpu_hr: vcpu ? price / vcpu : null,
      price_per_gb_hr: memory ? price / memory : null,
      specs_inferred: inferred,
      specs_complete: vcpu != null && memory != null && !inferred,
      data_quality_score:
        num(r.data_quality_score) ??
        computeQualityScore({ vcpu, memory, estimated: inferred, pricingModel }),
      currencyCode: 'USD',
      instance_type: null,
      product_family: null,
      tenancy: null,
      price_basis: 'resource',
      unit: 'hour',
      unit_qty: 1,
      is_active: true,
    });
  });

  return records;
}