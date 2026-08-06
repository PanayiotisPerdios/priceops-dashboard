<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import MetricChart from '@/components/MetricChart.vue'
import { useDomainServiceFilter } from '@/composables/useDomainServiceFilter';

import {
  providers,
  domains,
  regions,
  metrics,
  services,
  pricingModels,
  operatingSystems,
  tenancyOptions
} from '@/data/filters'

import { getMetricsForService } from '@/data/metricRegistry';

import { scenarioNames } from '@/mock-data/scenarioMockData'
import { useProviderDataSource, useScenarioDataSource } from '@/composables/useDataSource';

import {
  getProviderValue,
  getDelta,
  getWinner,
  getScore,
  getDynamicRange,
  getBilling,
  getPriceValue,
  getPriceDelta,
  getPriceWinner,
  kpiCardColor
} from '@/utils/calculationServices'


const compareMode = ref('providers')

const providerSource = useProviderDataSource();
const scenarioSource = useScenarioDataSource();

const entityOptions = computed(() => 
  compareMode.value === 'providers' ? providers : scenarioNames
);

const activeDataset = computed(() => 
  compareMode.value === 'providers' ? providerSource.dataset.value : scenarioSource.dataset.value
);

const activeMetricDataMap = computed(() => 
  compareMode.value === 'providers' ? providerSource.metricDataMap.value : scenarioSource.metricDataMap.value
);

const activeGranularityLabels = computed(() => 
  compareMode.value === 'providers' ? providerSource.granularityLabels.value : scenarioSource.granularityLabels.value
);

const entityLabel = computed(() => 
  compareMode.value === 'providers' ? 'Provider' : 'Scenario'
);

const isScrolled = ref(false);


const { domain, service, availableServices } = useDomainServiceFilter();

const entity1 = ref(null);
const entity2 = ref(null);
const region = ref(null);
const dateRange = ref(null);
const granularity = ref('daily');
const metric = ref(null);

const pricingModel = ref(null);
const operatingSystem = ref(null);
const tenancy = ref(null);
const instanceType = ref(null);

function setMode(mode) {
  compareMode.value = mode;
  entity1.value = null;
  entity2.value = null;
  instanceType.value = null;
}

const instanceTypeOptions = computed(() => {
  if (compareMode.value !== 'providers' || !service.value) return [];
  const all = providers
    .map(p => activeDataset.value?.[p]?.[service.value]?.instance_type)
    .filter(Boolean);
  return [...new Set(all)];
});

const attributeFilters = computed(() => ({
  region: region.value,
  pricing_model: pricingModel.value,
  operating_system: operatingSystem.value,
  tenancy: tenancy.value,
  instance_type: compareMode.value === 'providers' ? instanceType.value : null,
}));
 
function entityMatchesFilters(entityKey) {
  if (!service.value) return true;
  const record = activeDataset.value?.[entityKey]?.[service.value];
  if (!record) return true;
  return Object.entries(attributeFilters.value).every(([attr, val]) => {
    if (!val) return true;
    return record[attr] === val;
  });
}

const filteredEntityOptions = computed(() => entityOptions.value.filter(entityMatchesFilters));

watch([filteredEntityOptions, compareMode], () => {
  if (entity1.value && !filteredEntityOptions.value.includes(entity1.value)) entity1.value = null;
  if (entity2.value && !filteredEntityOptions.value.includes(entity2.value)) entity2.value = null;
});

const activeComparisonColumns = computed(() => {
  if (!service.value) return [];

  const allMetrics = getMetricsForService(service.value);

  return Object.entries(allMetrics)
    .filter(([, def]) => !metric.value || def.category === metric.value)
    .map(([key, def]) => ({ id: key, ...def }));
});

const chartEntities = computed(() => [
  { id: entity1.value, label: entity1.value || `${entityLabel.value} A`, color: '#1e44b9' },
  { id: entity2.value, label: entity2.value || `${entityLabel.value} B`, color: '#ca309e' },
]);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

function rangeEntityKeys() {
  const keys = new Set(filteredEntityOptions.value);
  if (entity1.value) keys.add(entity1.value);
  if (entity2.value) keys.add(entity2.value);
  return [...keys];
}
 
function scoreFor(entity, field) {
  const value = getProviderValue(activeDataset.value, entity, service.value, metric.value, field.id);
  const dynamicRange = getDynamicRange(activeDataset.value, service.value, metric.value, field.id, rangeEntityKeys());
  return getScore(field, value, dynamicRange);
}
 
function valueFor(entity, field) {
  return getProviderValue(activeDataset.value, entity, service.value, metric.value, field.id);
}
 
function deltaFor(field) {
  return getDelta(activeDataset.value, entity1.value, entity2.value, service.value, metric.value, field.id);
}
 
function winnerFor(field) {
  return getWinner(activeDataset.value, entity1.value, entity2.value, service.value, metric.value, field);
}
 
function billingFor(entity) {
  if (!entity || !service.value) return null;
  return getBilling(activeDataset.value, entity, service.value);
}

function priceFor(entity) {
  return getPriceValue(activeDataset.value, entity, service.value);
}

function priceDeltaPct() {
  return getPriceDelta(activeDataset.value, entity1.value, entity2.value, service.value);
}

function priceWinner() {
  return getPriceWinner(activeDataset.value, entity1.value, entity2.value, service.value);
}

function buildExportRows() {
  return activeComparisonColumns.value.map(field => ({
    metric: field.name,
    [entity1.value]: valueFor(entity1.value, field),
    [entity2.value]: valueFor(entity2.value, field),
    delta: deltaFor(field),
    winner: winnerFor(field),
  }));
}

function exportCSV() {
  const rows = buildExportRows();
  const header = `Metric,${entity1.value},${entity2.value},Delta,Winner\n`;
  const body = rows.map(r =>
    `"${r.metric}",${r[entity1.value] ?? ''},${r[entity2.value] ?? ''},${r.delta},"${r.winner}"`
  ).join('\n');
  downloadFile(header + body, `compare-${entity1.value}-vs-${entity2.value}.csv`, 'text/csv');
}

function exportJSON() {
  const rows = buildExportRows();
  downloadFile(JSON.stringify(rows, null, 2), `compare-${entity1.value}-vs-${entity2.value}.json`, 'application/json');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

</script>

<template>
<div class="page">
  <div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2 flex-wrap" 
  :class="{ scrolled: isScrolled }">
    <div class="data-ex-form-cont">
      <label class="form-label text-white">Compare</label>
      <div class="btn-group d-flex">
        <button class="btn" :class="compareMode === 'providers' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setMode('providers')">Providers</button>
        <button class="btn" :class="compareMode === 'scenarios' ? 'btn-primary' : 'btn-outline-primary'"
          @click="setMode('scenarios')">Scenarios</button>
      </div>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Domain</label>
      <select class="form-select w-100 custom-form-select" v-model="domain">
        <option :value="null">Select domain</option>
        <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Service</label>
      <select class="form-select w-100 custom-form-select" v-model="service">
        <option :value="null" disabled selected>Select a service</option>
        <option
          v-for="s in ['Compute','Storage','Database','Networking','Kubernetes','Serverless']"
          :key="s"
          :value="s"
          :disabled="domain && !availableServices.includes(s)"
        >
          {{ s }}
        </option>
      </select>
    </div>


    <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Region</label>
        <select class="form-select w-100 custom-form-select" v-model="region">
          <option value=" " disabled selected>Select region</option>  
          <option v-for="r in regions" :key="r" :value="r">
            {{ r }}
          </option>
        </select>
    </div>

    <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Category</label>
        <select class="form-select w-100 custom-form-select" v-model="metric">
          <option value=" " disabled selected>Select category</option>  
          <option v-for="m in metrics" :key="m" :value="m">
            {{ m }}
          </option>
        </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Pricing Model</label>
      <select class="form-select w-100 custom-form-select" v-model="pricingModel">
        <option :value="null">Any</option>
        <option v-for="pm in pricingModels" :key="pm" :value="pm">{{ pm }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Operating System</label>
      <select class="form-select w-100 custom-form-select" v-model="operatingSystem">
        <option :value="null">Any</option>
        <option v-for="os in operatingSystems" :key="os" :value="os">{{ os }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label text-white">Tenancy</label>
      <select class="form-select w-100 custom-form-select" v-model="tenancy">
        <option :value="null">Any</option>
        <option v-for="t in tenancyOptions" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont" v-if="compareMode === 'providers' && instanceTypeOptions.length">
      <label class="form-label text-white">Instance Type</label>
      <select class="form-select w-100 custom-form-select" v-model="instanceType">
        <option :value="null">Any</option>
        <option v-for="it in instanceTypeOptions" :key="it" :value="it">{{ it }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Granularity</label>
        <select v-model="granularity" class="form-select custom-form-select">
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
    </div>

    <div class="data-ex-form-cont">
      <div>
        <label class="form-label text-white">Date range</label>
        <VueDatePicker v-model="dateRange" :range="true" :dark="true" placeholder="Select your date range"/>
      </div>
    </div>

    <div>
      <label class="form-label text-white">Export</label>
      <div class="data-ex-form-cont d-flex gap-3">
        <button type="button" class="btn btn-outline-primary" :disabled="!entity1 || !entity2 || !service" @click="exportCSV">CSV</button>
        <button type="button" class="btn btn-outline-primary" :disabled="!entity1 || !entity2 || !service" @click="exportJSON">JSON</button>
      </div>
    </div>
  </div>

  <div class="comparison-container">
    <div class="comparison-kpi-container">


      <div class="comparison-kpi-card">
        <div class="data-ex-form-cont">
          <label class="form-label text-white">{{ entityLabel }}</label>
 
          <select class="form-select custom-form-select" v-model="entity1">
            <option :value="null" disabled selected>Select {{ entityLabel.toLowerCase() }}</option>
            <option v-for="e in filteredEntityOptions" :key="e" :value="e" :disabled="e === entity2">{{ e }}</option>
          </select>
          <div v-if="service && !filteredEntityOptions.length" class="text-white-50 small mt-1">
            No {{ entityLabel.toLowerCase() }} matches the current filters.
          </div>
 
          <div v-if="entity1 && service && billingFor(entity1)" class="price-highlight-box mt-2">
            <div class="price-highlight-label">Effective Price</div>
            <div class="price-highlight-value">
              {{ priceFor(entity1) }}
              <span class="price-unit">{{ billingFor(entity1).currencyCode }} / {{ billingFor(entity1).unitOfMeasure }}</span>
            </div>
            <div class="price-highlight-sku">{{ billingFor(entity1).skuName }}</div>
          </div>

          <div v-if="entity1 && entity2 && service && metric" class="mt-3">
            <div v-for="field in activeComparisonColumns" :key="field.id" class="kpi-score-row">
              <strong>{{ field.name }}</strong>
              <div class="kpi" :class="kpiCardColor(scoreFor(entity1, field).label)">
                {{ scoreFor(entity1, field).label ?? 'N/A' }} | {{ scoreFor(entity1, field).normalized?.toFixed(1) ?? 'N/A' }}%
              </div>
            </div>
          </div>
          
 
        </div>
      </div>
    
      <div class="comparison-kpi-card">
        <label class="form-label text-white">{{ entityLabel }}</label>
          <select class="form-select custom-form-select" v-model="entity2">
            <option :value="null" disabled selected>Select {{ entityLabel.toLowerCase() }}</option>
            <option v-for="e in filteredEntityOptions" :key="e" :value="e" :disabled="e === entity1">{{ e }}</option>
          </select>
          <div v-if="service && !filteredEntityOptions.length" class="text-white-50 small mt-1">
            No {{ entityLabel.toLowerCase() }} matches the current filters.
          </div>
 
          <div v-if="entity2 && service && billingFor(entity2)" class="price-highlight-box mt-2">
            <div class="price-highlight-label">Effective Price</div>
            <div class="price-highlight-value">
              {{ priceFor(entity2) }}
              <span class="price-unit">{{ billingFor(entity2).currencyCode }} / {{ billingFor(entity2).unitOfMeasure }}</span>
            </div>
            <div class="price-highlight-sku">{{ billingFor(entity2).skuName }}</div>
          </div>
 
      <div v-if="entity1 && entity2 && service && metric" class="mt-3">
        <div v-for="field in activeComparisonColumns" :key="field.id" class="kpi-score-row">
          <strong>{{ field.name }}</strong>
          <div class="kpi" :class="kpiCardColor(scoreFor(entity2, field).label)">
            {{ scoreFor(entity2, field).label ?? 'N/A' }} | {{ scoreFor(entity2, field).normalized?.toFixed(1) ?? 'N/A' }}%
          </div>
        </div>
      </div>
 
      </div>
    </div>


    <div style="width: 1000px; height: 750px;">
      <MetricChart
        :entities="chartEntities"
        :columns="activeComparisonColumns"
        :dataMap="activeMetricDataMap"
        :service="service"
        :granularity="granularity"
        :granularityLabels="activeGranularityLabels"
      />
    </div>  
    </div>

    <div v-if="entity1 && entity2 && service && metric" class="comparison-results">

      <div class="table-responsive comparison-table-container">
        <table class="comparison-table table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>{{ entity1 }}</th>
              <th>{{ entity2 }}</th>
              <th>Delta</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in activeComparisonColumns" :key="field.id">
              <td>{{ field.name }}</td>
              <td>{{ valueFor(entity1, field) }}</td>
              <td>{{ valueFor(entity2, field) }}</td>
              <td :class="Number(deltaFor(field)) < 0 ? 'negative-delta' : 'positive-delta'">{{ deltaFor(field) }}</td>
              <td>
                <span class="winner-badge" :class="winnerFor(field) === entity1 ? 'positive-badge' : 'negative-badge'">
                  {{ winnerFor(field) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="entity1 && entity2 && service && priceDeltaPct() !== null" class="price-delta-strip">
          <span>{{ entity1 }}: {{ priceFor(entity1) }} {{ billingFor(entity1)?.currencyCode }} / {{ billingFor(entity1)?.unitOfMeasure }}</span>
          <span class="price-delta-vs">vs</span>
          <span>{{ entity2 }}: {{ priceFor(entity2) }} {{ billingFor(entity2)?.currencyCode }} / {{ billingFor(entity2)?.unitOfMeasure }}</span>
          <div class="price-delta-summary" :class="Number(priceDeltaPct()) < 0 ? 'positive-delta' : 'negative-delta'">
            {{ Number(priceDeltaPct()) > 0 ? '+' : '' }}{{ priceDeltaPct() }}%
            {{ Number(priceDeltaPct()) > 0 ? `(${entity1} pricier)` : `(${entity2} pricier)` }}
          </div>
      </div>
    </div>
</div>
</template>

<style scoped src="@/assets/styles/views/Compare.scss"></style>