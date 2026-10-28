<script setup>
import { ref, computed, watch } from 'vue';
import { usePricingData } from '@/composables/usePricingData';
import MetricChart from '@/components/MetricChart.vue';
import { CHART_COLUMNS, TABLE_PAGE_SIZE, CHART_LIMIT } from '@/data/constants';
import { colorFor, uniqSorted, median, fmt } from '@/utils/calculationServices';
import { exportRowsCSV, exportRowsJSON } from '@/utils/exportHelpers';

const { records, options, loading, error, sourceName } = usePricingData();
const activeTab = ref('chart');

const provider = ref(null);
const category = ref(null);
const service = ref(null);
const regionGroup = ref(null);
const region = ref(null);
const operatingSystem = ref(null);
const dbEngine = ref(null);
const pricingModel = ref(null);
const pricingUnit = ref(null);
const priceComponent = ref(null);
const storageClass = ref(null);
const serviceTier = ref(null);
const commitmentTerm = ref(null);
const commitmentType = ref(null);
const tenancy = ref(null);
const deploymentOption = ref(null);
const minVcpu = ref(null);
const minMemory = ref(null);
const maxPrice = ref(null);
const search = ref('');
const onlyKnownSpecs = ref(false);

const serviceOptions = computed(() => options.value.services.filter(value =>
  records.value.some(r => r.ServiceName === value && (!category.value || r.ServiceCategory === category.value))
));
const engineOptions = computed(() => options.value.dbEngines.filter(value =>
  records.value.some(r => r.DatabaseEngine === value && (!category.value || r.ServiceCategory === category.value))
));
const regionOptions = computed(() => options.value.regions.filter(value =>
  records.value.some(r => r.RegionId === value && (!provider.value || r.ServiceProviderName === provider.value) && (!regionGroup.value || r.RegionGroup === regionGroup.value))));

const filteredRecords = computed(() => {
  const selections = [
    [provider.value, 'ServiceProviderName'],
    [category.value, 'ServiceCategory'],
    [service.value, 'ServiceName'],
    [regionGroup.value, 'RegionGroup'],
    [region.value, 'RegionId'],
    [operatingSystem.value, 'OperatingSystem'],
    [dbEngine.value, 'DatabaseEngine'],
    [pricingModel.value, 'PricingCategory'],
    [pricingUnit.value, 'PricingUnit'],
    [priceComponent.value, 'PriceComponent'],
    [storageClass.value, 'StorageClass'],
    [serviceTier.value, 'ServiceTier'],
    [commitmentTerm.value, 'CommitmentTerm'],
    [commitmentType.value, 'CommitmentType'],
    [tenancy.value, 'Tenancy'],
    [deploymentOption.value, 'DeploymentOption'],
  ];
  const query = search.value.trim().toLowerCase();
  return records.value.filter(record => {
    if (selections.some(([value, key]) => value != null && record[key] !== value)) return false;
    if (minVcpu.value !== null && minVcpu.value !== '' && (record.VCpu == null || record.VCpu < Number(minVcpu.value))) return false;
    if (minMemory.value !== null && minMemory.value !== '' && (record.MemoryGiB == null || record.MemoryGiB < Number(minMemory.value))) return false;
    if (maxPrice.value !== null && maxPrice.value !== '' && (record.ListUnitPrice == null || record.ListUnitPrice > Number(maxPrice.value))) return false;
    if (onlyKnownSpecs.value && (record.VCpu == null || record.MemoryGiB == null)) return false;
    if (query && ![record.SkuName, record.SkuId, record.ServiceName, record.ChargeDescription]
      .some(value => String(value ?? '').toLowerCase().includes(query))) return false;
    return true;
  });
});

const COLUMNS = [
  { key: 'ServiceProviderName', label: 'Provider' },
  { key: 'ServiceCategory', label: 'Category' },
  { key: 'ServiceName', label: 'Service' },
  { key: 'SkuName', label: 'SKU name' },
  { key: 'SkuId', label: 'SKU ID' },
  { key: 'RegionId', label: 'Region' },
  { key: 'OperatingSystem', label: 'OS' },
  { key: 'VCpu', label: 'vCPU', numeric: true },
  { key: 'MemoryGiB', label: 'Memory (GiB)', numeric: true },
  { key: 'ListUnitPrice', label: 'List unit price', numeric: true },
  { key: 'PricingUnit', label: 'Unit' },
  { key: 'PricingCategory', label: 'Pricing category' },
  { key: 'PriceComponent', label: 'Price component' },
];

const sortKey = ref('ListUnitPrice');
const sortDir = ref('asc');
const page = ref(1);

function sortBy(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

const sortedRecords = computed(() => {
  const direction = sortDir.value === 'asc' ? 1 : -1;
  return [...filteredRecords.value].sort((a, b) => {
    const x = a[sortKey.value];
    const y = b[sortKey.value];
    if (x == null && y == null){
      return 0;
    } 
    if (x == null) {
      return 1;
    }
    if (y == null) {
      return -1;
    }
    const difference = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return difference * direction;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRecords.value.length / TABLE_PAGE_SIZE)));

const pageRows = computed(() => sortedRecords.value.slice((page.value - 1) * TABLE_PAGE_SIZE, page.value * TABLE_PAGE_SIZE));

watch([filteredRecords, sortKey, sortDir], () => { page.value = 1; });

const rangeStart = computed(() => sortedRecords.value.length ? (page.value - 1) * TABLE_PAGE_SIZE + 1 : 0);
 
const rangeEnd = computed(() => Math.min(page.value * TABLE_PAGE_SIZE, sortedRecords.value.length));

/*
function qualityClass(score) {
  if (score >= 90) {
    return 'q-high';
  }
  if (score >= 70) {
    return 'q-mid';
  }
  return 'q-low';
}
*/

const providerStats = computed(() => {
  if (!pricingUnit.value) return [];
  const groups = new Map();
  for (const record of filteredRecords.value) {
    const name = record.ServiceProviderName;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(record);
  }
  return [...groups].map(([name, rows]) => {
    const prices = rows.map(r => r.ListUnitPrice).filter(v => v != null).sort((a, b) => a - b);
    const cheapest = rows.filter(r => r.ListUnitPrice != null).reduce((best, r) =>
      !best || r.ListUnitPrice < best.ListUnitPrice ? r : best, null);
    return { provider: name, count: rows.length, min: prices[0] ?? null,
      median: prices.length ? median(prices) : null, max: prices.at(-1) ?? null, cheapest };
  });
});

const chartColumns = computed(() => CHART_COLUMNS
  .filter(c => !['data_quality_score', 'price_per_vcpu_hr'].includes(c.key))
  .map(c => c.key === 'effective_price_hr' ? { ...c, label: 'List unit price' } : c));

function toChartRecord(record, index) {
  return {
    id: `${record.ServiceProviderName}-${record.SkuId}-${record.RegionId}-${record.PricingUnit}-${index}`,
    name: record.SkuName || record.SkuId || record.ServiceName,
    subtitle: `${record.ServiceProviderName} · ${record.RegionId} · ${record.PricingUnit}`,
    color: colorFor(record.ServiceProviderName),
    vcpu_count: record.VCpu,
    memory_gb: record.MemoryGiB,
    effective_price_hr: record.ListUnitPrice,
  };
}
const chartRecords = computed(() => sortedRecords.value.slice(0, CHART_LIMIT).map(toChartRecord));

// RESETS
function onCategoryChange() { 
  service.value = null; 
  dbEngine.value = null; 
}

 
function resetFilters() {
  provider.value = null;
  category.value = null;
  service.value = null;
  regionGroup.value = null;
  region.value = null;
  operatingSystem.value = null;
  dbEngine.value = null;
  pricingModel.value = null;
  pricingUnit.value = null;
  priceComponent.value = null;
  storageClass.value = null;
  serviceTier.value = null;
  commitmentTerm.value = null;
  commitmentType.value = null;
  tenancy.value = null;
  deploymentOption.value = null;
  minVcpu.value = null;
  minMemory.value = null;
  maxPrice.value = null;
  search.value = '';
  onlyKnownSpecs.value = false;
}

function buildExportRows() { 
  return sortedRecords.value.map(record => ({ ...record })); 
}

function exportCSV() {
  exportRowsCSV(buildExportRows());
}
function exportJSON() {
  exportRowsJSON(buildExportRows());
}

watch(sourceName, resetFilters);

</script>

<template>
<div class="page">
 
  <div v-if="loading" class="text-white-50 p-4">Loading pricing data…</div>
  <div v-else-if="error" class="text-danger p-4">Could not load the pricing data: 
    {{ error.message }}
  </div>
 
  <template v-else>
 
  <div class="top-filter-bar d-flex flex-column align-items-center gap-3 py-2">
    <div class="d-flex justify-content-center align-items-end gap-3 flex-wrap">

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Provider</label>
        <select class="form-select w-100 custom-form-select" v-model="provider" @change="region = null">
          <option :value="null" disabled>Any provider</option>
          <option v-for="p in options.providers" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Category</label>
        <select class="form-select w-100 custom-form-select" v-model="category" @change="onCategoryChange">
          <option :value="null">Any category</option>
          <option v-for="c in options.categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Service</label>
        <select class="form-select w-100 custom-form-select" v-model="service">
          <option :value="null">Any service</option>
          <option v-for="s in serviceOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Area</label>
        <select class="form-select w-100 custom-form-select" v-model="regionGroup" @change="region = null">
          <option :value="null">Any area</option>
          <option v-for="g in options.regionGroups" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Region</label>
        <select class="form-select w-100 custom-form-select" v-model="region">
          <option :value="null">Any region</option>
          <option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Operating System</label>
        <select class="form-select w-100 custom-form-select" v-model="operatingSystem">
          <option :value="null">Any</option>
          <option v-for="os in options.operatingSystems" :key="os" :value="os">{{ os }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">DB engine</label>
        <select class="form-select w-100 custom-form-select" v-model="dbEngine" :disabled="!engineOptions.length">
          <option :value="null">Any engine</option>
          <option v-for="e in engineOptions" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Pricing category</label>
        <select class="form-select w-100 custom-form-select" v-model="pricingModel">
          <option :value="null">Any pricing category</option>
          <option v-for="m in options.pricingModels" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Pricing unit</label>
        <select class="form-select w-100 custom-form-select" v-model="pricingUnit">
          <option :value="null">Any unit</option>
          <option v-for="u in options.pricingUnits" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Price component</label>
        <select class="form-select w-100 custom-form-select" v-model="priceComponent">
          <option :value="null">Any component</option>
          <option v-for="c in options.priceComponents" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Storage class</label>
        <select class="form-select w-100 custom-form-select" v-model="storageClass">
          <option :value="null">Any storage class</option>
          <option v-for="s in options.storageClasses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Service tier</label>
        <select class="form-select w-100 custom-form-select" v-model="serviceTier">
          <option :value="null">Any tier</option>
          <option v-for="t in options.serviceTiers" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Commitment term</label>
        <select class="form-select w-100 custom-form-select" v-model="commitmentTerm">
          <option :value="null">Any term</option>
          <option v-for="t in options.commitmentTerms" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Commitment type</label>
        <select class="form-select w-100 custom-form-select" v-model="commitmentType">
          <option :value="null">Any commitment</option>
          <option v-for="t in options.commitmentTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Tenancy</label>
        <select class="form-select w-100 custom-form-select" v-model="tenancy">
          <option :value="null">Any tenancy</option>
          <option v-for="t in options.tenancies" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Deployment</label>
        <select class="form-select w-100 custom-form-select" v-model="deploymentOption">
          <option :value="null">Any deployment</option>
          <option v-for="d in options.deploymentOptions" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

    </div>

    <div class="d-flex justify-content-center align-items-end gap-3 flex-wrap">

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Min vCPU</label>
        <input type="number" min="0" class="form-control custom-form-select" v-model="minVcpu" placeholder="Any" />
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Min Memory (GiB)</label>
        <input type="number" min="0" class="form-control custom-form-select" v-model="minMemory" placeholder="Any" />
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Max list unit price</label>
        <input type="number" min="0" step="any" class="form-control custom-form-select" v-model="maxPrice" placeholder="Any" />
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Search SKU / service</label>
        <input type="text" class="form-control custom-form-select" v-model="search" placeholder="SKU, ID, service…" />
      </div>

      <div class="data-ex-form-cont form-check text-white">
        <input id="known-specs" type="checkbox" class="form-check-input" v-model="onlyKnownSpecs" />
        <label for="known-specs" class="form-check-label">Known vCPU + memory only</label>
      </div>

      <div class="data-ex-form-cont">
        <button type="button" class="btn btn-outline-light" @click="resetFilters">Reset</button>
      </div>

      <div>
        <label class="form-label" style="color: white">Export</label>
        <div class="data-ex-form-cont d-flex gap-3">
          <button type="button" class="btn btn-outline-primary" :disabled="!filteredRecords.length" @click="exportCSV">CSV</button>
          <button type="button" class="btn btn-outline-primary" :disabled="!filteredRecords.length" @click="exportJSON">JSON</button>
        </div>
      </div>

    </div>

  </div>
 
    <div class="text-center text-white-50 small mt-1">
      {{ filteredRecords.length.toLocaleString() }} of {{ records.length.toLocaleString() }} records
    </div>

    <div v-if="providerStats.length && provider && pricingUnit" class="d-flex justify-content-center gap-3 flex-wrap my-3">
      <div v-for="s in providerStats" :key="s.provider" class="border rounded p-2 text-white small" style="min-width: 240px">
        <div class="fw-bold">{{ s.provider }} · {{ s.count.toLocaleString() }} records</div>
        <div>Price / {{ pricingUnit }}: min {{ s.min == null ? '–' : fmt(s.min) }} · median {{ s.median == null ? '–' : fmt(s.median) }} · max {{ s.max == null ? '–' : fmt(s.max) }}</div>
        <div v-if="s.cheapest" class="text-white-50">Cheapest: {{ s.cheapest.SkuName || s.cheapest.SkuId }} ({{ s.cheapest.RegionId }})</div>
      </div>
    </div>

    <div class="data-exploration-container">
      <div class="tabs-wrapper">
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" :class="{ active: activeTab === 'chart' }" role="tab" :aria-selected="activeTab === 'chart'" @click="activeTab = 'chart'">Chart</button>
          </li>

          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" :class="{ active: activeTab === 'table' }" role="tab" :aria-selected="activeTab === 'table'" @click="activeTab = 'table'">Table</button>
          </li>
        </ul>

        <div class="tab-content">
          <div v-if="activeTab === 'chart'" class="tab-pane fade show active" role="tabpanel">
            <div v-if="!provider" class="tab-empty">Select a provider to see the chart.</div>
            <div v-else-if="!pricingUnit" class="tab-empty">Select a pricing unit to compare prices consistently.</div>
            <div v-else-if="!filteredRecords.length" class="tab-empty">No records match the current filters.</div>
            <template v-else>
              <div class="chart-host mb-3">
                <MetricChart :records="chartRecords" :columns="chartColumns" />
              </div>

              <div class="text-center text-white-50 small mb-4">
                Chart shows the first {{ Math.min(CHART_LIMIT, sortedRecords.length) }} rows of the current sort ({{ pricingUnit }}).
              </div>
            </template>
          </div>

          <div v-else class="tab-pane fade show active" role="tabpanel">
            <div v-if="!provider" class="tab-empty">Select a provider to see the table.</div>
            <div v-else class="metrics-card">
              <div class="metrics-card-header">
                <div>
                  <span class="metrics-card-title">Pricing records</span>
                  <span class="metrics-card-sub">{{ rangeStart.toLocaleString() }}–{{ rangeEnd.toLocaleString() }} of {{ sortedRecords.length.toLocaleString() }}</span>
                </div>
                <span class="metrics-card-hint">Click a column header to sort</span>
              </div>

              <div class="table-responsive metrics-table-container">
                <table class="metrics-table table table-hover align-middle">
                  <thead>
                    <tr>
                      <th v-for="c in COLUMNS" :key="c.key" scope="col" :class="{ num: c.numeric, sorted: sortKey === c.key }" @click="sortBy(c.key)">
                        {{ c.label }} <span class="sort-arrow">{{ sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '' }}</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="(record, index) in pageRows" :key="`${record.ServiceProviderName}-${record.SkuId}-${record.RegionId}-${record.PricingUnit}-${index}`">
                      <td class="nowrap"><span class="provider-dot" :style="{ backgroundColor: colorFor(record.ServiceProviderName) }"></span>{{ record.ServiceProviderName }}</td>
                      <td><span class="type-pill">{{ record.ServiceCategory ?? '–' }}</span></td>
                      <td>{{ record.ServiceName ?? '–' }}</td>
                      <td class="sku-cell" :title="record.SkuName || record.SkuId">{{ record.SkuName ?? '–' }}</td>
                      <td class="sku-cell">{{ record.SkuId }}</td>
                      <td class="nowrap">{{ record.RegionId ?? '–' }}</td>
                      <td>{{ record.OperatingSystem ?? '–' }}</td>
                      <td class="num">{{ record.VCpu ?? '–' }}</td>
                      <td class="num">{{ record.MemoryGiB ?? '–' }}</td>
                      <td class="num price">{{ record.ListUnitPrice == null ? '–' : record.ListUnitPrice.toFixed(4) }}</td>
                      <td>{{ record.PricingUnit ?? '–' }}</td>
                      <td><span class="pm-pill">{{ record.PricingCategory ?? '–' }}</span></td>
                      <td>{{ record.PriceComponent ?? '–' }}</td>
                    </tr>
                  </tbody>
                </table>

                <div v-if="!filteredRecords.length" class="metrics-empty">
                  <div class="metrics-empty-title">No records match the current filters</div>
                  <div class="text-white-50 small">Try removing a filter or press Reset.</div>
                </div>
              </div>

              <div v-if="filteredRecords.length" class="metrics-card-footer">
                <span class="text-white-50 small">Page {{ page }} of {{ totalPages }}</span>
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-light" :disabled="page <= 1" @click="page = 1">« First</button>
                  <button type="button" class="btn btn-outline-light" :disabled="page <= 1" @click="page--">‹ Prev</button>
                  <button type="button" class="btn btn-outline-light" :disabled="page >= totalPages" @click="page++">Next ›</button>
                  <button type="button" class="btn btn-outline-light" :disabled="page >= totalPages" @click="page = totalPages">Last »</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</div>
</template>

<style scoped src="@/assets/styles/views/DataExploration.scss"></style>