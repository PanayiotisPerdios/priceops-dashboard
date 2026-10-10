<script setup>
import { ref, computed, watch } from 'vue';
import { usePricingData } from '@/composables/usePricingData';
import MetricChart from '@/components/MetricChart.vue';
 
import {
  CHART_COLUMNS, SUBCATEGORY_LABELS, REGION_GROUP_LABELS, PRICING_MODEL_LABELS,
  TABLE_PAGE_SIZE, CHART_LIMIT,
} from '@/data/constants';
import { colorFor, uniqSorted, median, fmt } from '@/utils/calculationServices';
import { exportRowsCSV, exportRowsJSON } from '@/utils/exportHelpers';

const { records, loading, error, options } = usePricingData();

const provider = ref(null);
const domain = ref(null);
const subcategory = ref(null);
const regionGroup = ref(null);
const region = ref(null);
const operatingSystem = ref(null);
const dbEngine = ref(null);
const pricingModel = ref(null);
const minVcpu = ref(null);
const minMemory = ref(null);
const maxPrice = ref(null);
const search = ref('');
const onlyKnownSpecs = ref(false);

const inDomain = computed( () => {
  return records.value.filter( (record) => {
    return !domain.value || record.domain === domain.value;
  });
});

const subcategoryOptions = computed( () => {
  return uniqSorted(inDomain.value.map( (record) => {
    return record.subcategory;
  }));
});

const engineOptions = computed( () => {
  return uniqSorted(inDomain.value.map( (record) => {
    return record.db_engine;
  }));
});

const regionOptions = computed( () => {
  const matchingRecords = inDomain.value.filter( (record) => {
    const providerMatches = !provider.value || record.provider === provider.value;
    const areaMatches = !regionGroup.value || record.region_group === regionGroup.value;
    return providerMatches && areaMatches;
  });
 
  return uniqSorted(matchingRecords.map( (record) => {
    return record.region;
  }));
});

const filteredRecords = computed(function () {
  const searchText = search.value.trim().toLowerCase();
 
  // Number inputs may be null or '' -> treat as 0, which means "no limit"
  const minVcpuValue = Number(minVcpu.value) || 0;
  const minMemoryValue = Number(minMemory.value) || 0;
  const maxPriceValue = Number(maxPrice.value) || 0;
 
  return records.value.filter(function (record) {
    if (provider.value && record.provider !== provider.value) {
      return false;
    }
    if (domain.value && record.domain !== domain.value) {
      return false;
    }
    if (subcategory.value && record.subcategory !== subcategory.value) {
      return false;
    }
    if (regionGroup.value && record.region_group !== regionGroup.value) {
      return false;
    }
    if (region.value && record.region !== region.value) {
      return false;
    }
    if (operatingSystem.value && record.operating_system !== operatingSystem.value) {
      return false;
    }
    if (dbEngine.value && record.db_engine !== dbEngine.value) {
      return false;
    }
    if (pricingModel.value && record.pricing_model !== pricingModel.value) {
      return false;
    }
 
    // Unknown vCPU / memory count as 0, so they fail any minimum
    if (minVcpuValue && (record.vcpu_count ?? 0) < minVcpuValue) {
      return false;
    }
    if (minMemoryValue && (record.memory_gb ?? 0) < minMemoryValue) {
      return false;
    }
 
    if (maxPriceValue && record.effective_price_hr > maxPriceValue) {
      return false;
    }
 
    if (onlyKnownSpecs.value && (record.vcpu_count == null || record.memory_gb == null)) {
      return false;
    }
 
    if (searchText && !record.skuName.toLowerCase().includes(searchText)) {
      return false;
    }
 
    return true;
  });
});

const COLUMNS = [
  { key: 'provider', label: 'Provider' },
  { key: 'subcategory', label: 'Type' },
  { key: 'skuName', label: 'SKU' },
  { key: 'region', label: 'Region' },
  { key: 'operating_system', label: 'OS' },
  { key: 'vcpu_count', label: 'vCPU' },
  { key: 'memory_gb', label: 'Memory (GB)' },
  { key: 'effective_price_hr', label: 'Price / hr' },
  { key: 'price_per_vcpu_hr', label: 'Price / vCPU-hr' },
  { key: 'pricing_model', label: 'Pricing' },
  { key: 'data_quality_score', label: 'Quality' },
];

const sortKey = ref('effective_price_hr');
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

const sortedRecords = computed( () => {
  const key = sortKey.value;
  const direction = sortDir.value === 'asc' ? 1 : -1;
 
  return [...filteredRecords.value].sort( (a, b) => {
    const x = a[key];
    const y = b[key];
 
    if (x == null && y == null) {
      return 0;
    }
    if (x == null) {
      return 1;
    }
    if (y == null) {
      return -1;
    }
 
    let difference;
    if (typeof x === 'number' && typeof y === 'number') {
      difference = x - y;
    } else {
      difference = String(x).localeCompare(String(y));
    }
 
    return difference * direction;
  });
});

const totalPages = computed( () => {
  return Math.max(1, Math.ceil(sortedRecords.value.length / TABLE_PAGE_SIZE));
});

const pageRows = computed(() => {
  const start = (page.value - 1) * TABLE_PAGE_SIZE;
  return sortedRecords.value.slice(start, start + TABLE_PAGE_SIZE);
});

watch([filteredRecords, sortKey, sortDir], () => {
  page.value = 1;
});

const rangeStart = computed( () => {
  if (sortedRecords.value.length === 0) {
    return 0;
  }
  return (page.value - 1) * TABLE_PAGE_SIZE + 1;
});
 
const rangeEnd = computed( () => {
  return Math.min(page.value * TABLE_PAGE_SIZE, sortedRecords.value.length);
});

function qualityClass(score) {
  if (score >= 90) {
    return 'q-high';
  }
  if (score >= 70) {
    return 'q-mid';
  }
  return 'q-low';
}

const providerStats = computed( () => {
  const groups = new Map();
 
  for (const record of filteredRecords.value) {
    if (!groups.has(record.provider)) {
      groups.set(record.provider, []);
    }
    groups.get(record.provider).push(record);
  }
 
  const stats = [];
 
  for (const [name, rows] of groups) {

    const prices = rows
      .map( (row) => {
        return row.effective_price_hr;
      })
      .sort( (a, b) => {
        return a - b;
      });
 
    let cheapest = rows[0];
    for (const row of rows) {
      if (row.effective_price_hr < cheapest.effective_price_hr) {
        cheapest = row;
      }
    }
 
    const perVcpuPrices = rows
      .map( (row) => {
        return row.price_per_vcpu_hr;
      })
      .filter( (value) => {
        return value != null;
      })
      .sort( (a, b) => {
        return a - b;
      });
 
    stats.push({
      provider: name,
      count: rows.length,
      min: prices[0],
      median: median(prices),
      max: prices[prices.length - 1],
      medianPerVcpu: median(perVcpuPrices),
      cheapest: cheapest,
    });
  }
 
  return stats;
});

function toChartRecord(record) {
  return {
    id: record.id,
    name: record.skuName,
    subtitle: `${record.provider} · ${record.region}`,
    color: colorFor(record.provider),
    vcpu_count: record.vcpu_count,
    memory_gb: record.memory_gb,
    effective_price_hr: record.effective_price_hr,
    price_per_vcpu_hr: record.price_per_vcpu_hr,
    data_quality_score: record.data_quality_score,
  };
}

const chartRecords = computed( () => {
  return sortedRecords.value.slice(0, CHART_LIMIT).map(toChartRecord);
});

// RESETS
function onDomainChange() {
  subcategory.value = null;
  dbEngine.value = null;
}
 
function resetFilters() {
  provider.value = null;
  domain.value = null;
  subcategory.value = null;
  regionGroup.value = null;
  region.value = null;
  operatingSystem.value = null;
  dbEngine.value = null;
  pricingModel.value = null;
  minVcpu.value = null;
  minMemory.value = null;
  maxPrice.value = null;
  search.value = '';
  onlyKnownSpecs.value = false;
}

function buildExportRows() {
  return sortedRecords.value.map( (record) => {
    return {
      provider: record.provider,
      domain: record.domain,
      resource_type: record.resource_type,
      sku: record.skuName,
      region: record.region,
      region_group: record.region_group,
      operating_system: record.operating_system,
      db_engine: record.db_engine,
      deployment: record.deployment,
      pricing_model: record.pricing_model,
      vcpu_count: record.vcpu_count,
      memory_gb: record.memory_gb,
      specs_estimated: record.specs_inferred,
      effective_price_hr: record.effective_price_hr,
      price_per_vcpu_hr: record.price_per_vcpu_hr,
      price_per_gb_hr: record.price_per_gb_hr,
      data_quality_score: record.data_quality_score,
    };
  });
}

function exportCSV() {
  exportRowsCSV(buildExportRows());
}
function exportJSON() {
  exportRowsJSON(buildExportRows());
}

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
        <label class="form-label" style="color: white">Domain</label>
        <select class="form-select w-100 custom-form-select" v-model="domain" @change="onDomainChange">
          <option :value="null">Any domain</option>
          <option v-for="d in options.domains" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Resource type</label>
        <select class="form-select w-100 custom-form-select" v-model="subcategory">
          <option :value="null">Any type</option>
          <option v-for="s in subcategoryOptions" :key="s" :value="s">{{ SUBCATEGORY_LABELS[s] ?? s }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Area</label>
        <select class="form-select w-100 custom-form-select" v-model="regionGroup" @change="region = null">
          <option :value="null">Any area</option>
          <option v-for="g in options.regionGroups" :key="g" :value="g">{{ REGION_GROUP_LABELS[g] ?? g }}</option>
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
  
      <div v-if="engineOptions.length" class="data-ex-form-cont">
        <label class="form-label" style="color: white">DB engine</label>
        <select class="form-select w-100 custom-form-select" v-model="dbEngine">
          <option :value="null">Any engine</option>
          <option v-for="e in engineOptions" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Pricing model</label>
        <select class="form-select w-100 custom-form-select" v-model="pricingModel">
          <option :value="null">Any</option>
          <option v-for="m in options.pricingModels" :key="m" :value="m">{{ PRICING_MODEL_LABELS[m] ?? m }}</option>
        </select>
      </div>
    </div>

    <div class="d-flex justify-content-center align-items-end gap-3 flex-wrap">
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Min vCPU</label>
        <input type="number" min="0" class="form-control custom-form-select" v-model="minVcpu" placeholder="Any" />
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Min Memory (GB)</label>
        <input type="number" min="0" class="form-control custom-form-select" v-model="minMemory" placeholder="Any" />
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Max price / hr</label>
        <input type="number" min="0" step="0.01" class="form-control custom-form-select" v-model="maxPrice" placeholder="Any" />
      </div>
  
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Search SKU</label>
        <input type="text" class="form-control custom-form-select" v-model="search" placeholder="e.g. D4as, MySQL" />
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
    <div v-if="providerStats.length && provider" class="d-flex justify-content-center gap-3 flex-wrap my-3">
      <div v-for="s in providerStats" :key="s.provider" class="border rounded p-2 text-white small" style="min-width: 240px">
        <div class="fw-bold">{{ s.provider }} · {{ s.count.toLocaleString() }} records</div>
        <div>Price / hr: min {{ fmt(s.min) }} · median {{ fmt(s.median) }} · max {{ fmt(s.max) }}</div>
        <div v-if="s.medianPerVcpu != null">Median per vCPU-hr: {{ fmt(s.medianPerVcpu) }}</div>
        <div class="text-white-50">Cheapest: {{ s.cheapest.skuName }} ({{ s.cheapest.region }})</div>
      </div>
  </div>
 
  <div v-if="filteredRecords.length && provider" class="chart-host mb-5">
    <MetricChart :records="chartRecords" :columns="CHART_COLUMNS"/>
  </div>

  <div v-if="filteredRecords.length && provider" class="text-center text-white-50 small mb-4">
    Chart shows the first {{ CHART_LIMIT }} rows of the current sort
  </div>
 
  <div v-if="provider" class="data-exploration-container">
 
    <div class="metrics-card">
 
      <div class="metrics-card-header">
        <div>
          <span class="metrics-card-title">Pricing records</span>
          <span class="metrics-card-sub">
            {{ rangeStart.toLocaleString() }}–{{ rangeEnd.toLocaleString() }} of {{ sortedRecords.length.toLocaleString() }}
          </span>
        </div>
        <span class="metrics-card-hint">Click a column header to sort</span>
      </div>
 
      <div class="table-responsive metrics-table-container">
        <table class="metrics-table table table-hover align-middle">
          <thead>
            <tr>
              <th v-for="c in COLUMNS" :key="c.key" scope="col"
                :class="{ num: c.numeric, sorted: sortKey === c.key }" @click="sortBy(c.key)">
                {{ c.label }}
                <span class="sort-arrow">{{ sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '' }}</span>
              </th>
            </tr>
          </thead>
 
          <tbody>
            <tr v-for="record in pageRows" :key="record.id">
              <td class="nowrap">
                <span class="provider-dot" :style="{ backgroundColor: colorFor(record.provider) }"></span>{{ record.provider }}
              </td>
              <td><span class="type-pill">{{ SUBCATEGORY_LABELS[record.subcategory] ?? record.subcategory }}</span></td>
              <td class="sku-cell" :title="record.skuName">{{ record.skuName }}</td>
              <td class="nowrap">{{ record.region }}</td>
              <td>
                <span v-if="record.operating_system">{{ record.operating_system }}</span>
                <span v-else class="na">–</span>
              </td>
              <td class="num">
                <span v-if="record.vcpu_count != null">{{ record.vcpu_count }}</span>
                <span v-else class="na">–</span>
              </td>
              <td class="num">
                <span v-if="record.specs_inferred" class="est-badge" title="Estimated, not published by the provider">est.</span>
                <span v-if="record.memory_gb != null">{{ record.memory_gb }}</span>
                <span v-else class="na">–</span>
              </td>
              <td class="num price">{{ record.effective_price_hr.toFixed(4) }}<span class="cur">{{ record.currencyCode }}</span></td>
              <td class="num">
                <span v-if="record.price_per_vcpu_hr != null">{{ fmt(record.price_per_vcpu_hr) }}</span>
                <span v-else class="na">–</span>
              </td>
              <td>
                <span class="pm-pill" :class="'pm-' + record.pricing_model">
                  {{ PRICING_MODEL_LABELS[record.pricing_model] ?? record.pricing_model }}
                </span>
              </td>
              <td>
                <div class="quality" :title="`Data quality ${record.data_quality_score}/100`">
                  <div class="quality-track">
                    <div class="quality-fill" :class="qualityClass(record.data_quality_score)"
                      :style="{ width: record.data_quality_score + '%' }"></div>
                  </div>
                  <span>{{ record.data_quality_score }}</span>
                </div>
              </td>
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
 
  </template>
</div>
</template>

<style scoped src="@/assets/styles/views/DataExploration.scss"></style>