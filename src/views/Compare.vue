<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { providers, domains } from '@/data/filters';
import { pricingRecords } from '@/data/mockPricingData';
import MetricChart from '@/components/MetricChart.vue';

const isScrolled = ref(false);
const handleScroll = () => { isScrolled.value = window.scrollY > 20; };
onMounted(() => window.addEventListener('scroll', handleScroll));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));

// Comparable fields — pulled directly from the frozen schema.
// direction: 'higher' = bigger is better, 'lower' = smaller is better (price).
const COMPARE_FIELDS = [
  { id: 'vcpu_count', name: 'vCPU', direction: 'higher' },
  { id: 'memory_gb', name: 'Memory (GB)', direction: 'higher' },
  { id: 'effective_price_hr', name: 'Price / hr', direction: 'lower' },
  { id: 'data_quality_score', name: 'Data Quality Score', direction: 'higher' },
];

// --- Filters ---------------------------------------------------------
const domain = ref(null);
const region = ref(null);
const operatingSystem = ref(null);

const filteredRecords = computed(() =>
  pricingRecords.filter(r =>
    (!domain.value || r.domain === domain.value) &&
    (!region.value || r.region === region.value) &&
    (!operatingSystem.value || r.operating_system === operatingSystem.value)
  )
);

const regionOptions = computed(() => [
  ...new Set(
    pricingRecords
      .filter(r => !domain.value || r.domain === domain.value)
      .map(r => r.region)
  ),
]);

const operatingSystemOptions = computed(() => [
  ...new Set(pricingRecords.map(r => r.operating_system).filter(Boolean)),
]);

// --- Two records to compare -------------------------------------------
const provider1 = ref(null);
const provider2 = ref(null);
const sku1 = ref(null);
const sku2 = ref(null);

const skuOptions1 = computed(() => filteredRecords.value.filter(r => !provider1.value || r.provider === provider1.value));
const skuOptions2 = computed(() => filteredRecords.value.filter(r => !provider2.value || r.provider === provider2.value));

const record1 = computed(() => filteredRecords.value.find(r => r.id === sku1.value) || null);
const record2 = computed(() => filteredRecords.value.find(r => r.id === sku2.value) || null);

const CHART_COLUMNS = [
  { id: 'vcpu_count', name: 'vCPU' },
  { id: 'memory_gb', name: 'Memory (GB)' },
  { id: 'effective_price_hr', name: 'Price / hr' },
  { id: 'data_quality_score', name: 'Data Quality Score' },
];

const providerColors = { AWS: '#f0932b', Azure: '#0078d4', GCP: '#4285f4' };
function colorFor(provider) { return providerColors[provider] ?? '#6366f1'; }

const chartRecords = computed(() =>
  [record1.value, record2.value].filter(Boolean).map(r => ({
    id: r.id,
    name: r.skuName,
    color: colorFor(r.provider),
    vcpu_count: r.vcpu_count,
    memory_gb: r.memory_gb,
    effective_price_hr: r.effective_price_hr,
    data_quality_score: r.data_quality_score,
  }))
);

function resetSelection() { sku1.value = null; sku2.value = null; }

// --- Delta / winner -----------------------------------------------
function valueFor(record, field) {
  return record ? record[field.id] : null;
}

function deltaFor(field) {
  const a = valueFor(record1.value, field);
  const b = valueFor(record2.value, field);
  if (a == null || b == null || !b) return null;
  return (((a - b) / b) * 100).toFixed(1);
}

function winnerFor(field) {
  const a = valueFor(record1.value, field);
  const b = valueFor(record2.value, field);
  if (a == null || b == null) return null;
  const aWins = field.direction === 'higher' ? a >= b : a <= b;
  return aWins ? record1.value.provider : record2.value.provider;
}

// --- Export -------------------------------------------------------
function buildExportRows() {
  return COMPARE_FIELDS.map(field => ({
    metric: field.name,
    [record1.value.provider]: valueFor(record1.value, field),
    [record2.value.provider]: valueFor(record2.value, field),
    delta: deltaFor(field),
    winner: winnerFor(field),
  }));
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const rows = buildExportRows();
  if (!rows.length) return;
  const header = `Metric,${record1.value.provider},${record2.value.provider},Delta,Winner\n`;
  const body = rows.map(r =>
    `"${r.metric}",${r[record1.value.provider] ?? ''},${r[record2.value.provider] ?? ''},${r.delta ?? ''},"${r.winner ?? ''}"`
  ).join('\n');
  downloadFile(header + body, `compare-${record1.value.id}-vs-${record2.value.id}.csv`, 'text/csv');
}

function exportJSON() {
  const rows = buildExportRows();
  if (!rows.length) return;
  downloadFile(JSON.stringify(rows, null, 2), `compare-${record1.value.id}-vs-${record2.value.id}.json`, 'application/json');
}
</script>

<template>
<div class="page">
  <div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2 flex-wrap"
    :class="{ scrolled: isScrolled }">

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Domain</label>
      <select class="form-select w-100 custom-form-select" v-model="domain" @change="resetSelection">
        <option :value="null">Any domain</option>
        <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Region</label>
      <select class="form-select w-100 custom-form-select" v-model="region" @change="resetSelection">
        <option :value="null">Any region</option>
        <option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Operating System</label>
      <select class="form-select w-100 custom-form-select" v-model="operatingSystem" @change="resetSelection">
        <option :value="null">Any</option>
        <option v-for="os in operatingSystemOptions" :key="os" :value="os">{{ os }}</option>
      </select>
    </div>

    <div>
      <label class="form-label text-white">Export</label>
      <div class="data-ex-form-cont d-flex gap-3">
        <button type="button" class="btn btn-outline-primary" :disabled="!record1 || !record2" @click="exportCSV">CSV</button>
        <button type="button" class="btn btn-outline-primary" :disabled="!record1 || !record2" @click="exportJSON">JSON</button>
      </div>
    </div>
  </div>

  <div class="comparison-container">
    <div style="width: 1000px; height: 750px;" class="mb-4">
      <MetricChart :records="chartRecords" :columns="CHART_COLUMNS" />
    </div>

    <div class="comparison-kpi-container">

      <div class="comparison-kpi-card">
        <label class="form-label text-white">Provider A</label>
        <select class="form-select custom-form-select" v-model="provider1" @change="sku1 = null">
          <option :value="null">Any provider</option>
          <option v-for="p in providers" :key="p" :value="p" :disabled="p === provider2">{{ p }}</option>
        </select>

        <label class="form-label text-white mt-2">SKU</label>
        <select class="form-select custom-form-select" v-model="sku1">
          <option :value="null" disabled selected>Select a SKU</option>
          <option v-for="r in skuOptions1" :key="r.id" :value="r.id" :disabled="r.id === sku2">{{ r.skuName }}</option>
        </select>
        <div v-if="!skuOptions1.length" class="text-white-50 small mt-1">No records match the current filters.</div>

        <div v-if="record1" class="price-highlight-box mt-2">
          <div class="price-highlight-label">Effective Price / hr</div>
          <div class="price-highlight-value">
            {{ record1.effective_price_hr }}
            <span class="price-unit">{{ record1.currencyCode }}</span>
          </div>
          <div class="price-highlight-sku">{{ record1.skuName }} · {{ record1.region }}</div>
        </div>
      </div>

      <div class="comparison-kpi-card">
        <label class="form-label text-white">Provider B</label>
        <select class="form-select custom-form-select" v-model="provider2" @change="sku2 = null">
          <option :value="null">Any provider</option>
          <option v-for="p in providers" :key="p" :value="p" :disabled="p === provider1">{{ p }}</option>
        </select>

        <label class="form-label text-white mt-2">SKU</label>
        <select class="form-select custom-form-select" v-model="sku2">
          <option :value="null" disabled selected>Select a SKU</option>
          <option v-for="r in skuOptions2" :key="r.id" :value="r.id" :disabled="r.id === sku1">{{ r.skuName }}</option>
        </select>
        <div v-if="!skuOptions2.length" class="text-white-50 small mt-1">No records match the current filters.</div>

        <div v-if="record2" class="price-highlight-box mt-2">
          <div class="price-highlight-label">Effective Price / hr</div>
          <div class="price-highlight-value">
            {{ record2.effective_price_hr }}
            <span class="price-unit">{{ record2.currencyCode }}</span>
          </div>
          <div class="price-highlight-sku">{{ record2.skuName }} · {{ record2.region }}</div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="record1 && record2" class="comparison-results">
    <div class="table-responsive comparison-table-container">
      <table class="comparison-table table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>{{ record1.provider }}</th>
            <th>{{ record2.provider }}</th>
            <th>Delta</th>
            <th>Winner</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in COMPARE_FIELDS" :key="field.id">
            <td>{{ field.name }}</td>
            <td>{{ valueFor(record1, field) ?? 'N/A' }}</td>
            <td>{{ valueFor(record2, field) ?? 'N/A' }}</td>
            <td v-if="deltaFor(field) !== null" :class="Number(deltaFor(field)) < 0 ? 'negative-delta' : 'positive-delta'">{{ deltaFor(field) }}%</td>
            <td v-else>N/A</td>
            <td>
              <span v-if="winnerFor(field)" class="winner-badge" :class="winnerFor(field) === record1.provider ? 'positive-badge' : 'negative-badge'">
                {{ winnerFor(field) }}
              </span>
              <span v-else>N/A</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
</template>

<style scoped src="@/assets/styles/views/Compare.scss"></style>