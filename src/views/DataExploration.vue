<script setup>
import { ref, computed } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import MetricChart from '@/components/MetricChart.vue'
import { useDomainServiceFilter } from '@/composables/useDomainServiceFilter';

import {
  providers,
  domains,
  regions,
  services,
  metrics,
  pricingModels,
  operatingSystems,
  tenancyOptions,
  instanceTypesByProvider
} from '@/data/filters'


import { getMetricsForService } from '@/data/metricRegistry';

import { useProviderDataSource } from '@/composables/useDataSource';

import {
  getProviderValue,
  getScore,
  getDynamicRange,
  kpiCardColor,
  getBilling
} from '@/utils/calculationServices'

const { domain, service, availableServices } = useDomainServiceFilter();

const { 
  dataset: activeDataset, 
  metricDataMap: providerMetricDataMap, 
  granularityLabels: providerGranularityLabels 
} = useProviderDataSource();

const provider = ref(null);
const region = ref(null);
const dateRange = ref(null);
const metric = ref(null);
const granularity = ref('daily');

const pricingModel = ref(null);
const operatingSystem = ref(null);
const tenancy = ref(null);
const instanceType = ref(null);

const activeColumns = computed(() => {
  if (!service.value) return [];

  const allMetrics = getMetricsForService(service.value);

  return Object.entries(allMetrics)
    .filter(([, def]) => !metric.value || def.category === metric.value)
    .map(([key, def]) => ({ id: key, ...def }));
});

const chartEntities = computed(() => {
  if (!provider.value) return [];
  return [{ id: provider.value, label: provider.value, color: '#4ade80' }];
});

const instanceTypeOptions = computed(() => {
  if (!provider.value) return [];
  return instanceTypesByProvider[provider.value] ?? [];
});

function valueFor(field) {
  return getProviderValue(activeDataset.value, provider.value, service.value, metric.value, field.id);
}

function scoreFor(field) {
  const value = valueFor(field);
  return getScore(field, value);
}

function billingFor(entity) {
  if (!provider || !service.value) return null;
  return getBilling(activeDataset.value, provider, service.value);
}

function buildExportRows() {
  return activeColumns.value.map(field => ({
    metric: field.name,
    value: valueFor(field),
    category: field.category,
  }));
}

function exportCSV() {
  const rows = buildExportRows();
  const header = 'Metric,Value,Category\n';
  const body = rows.map(r => `"${r.metric}",${r.value ?? ''},"${r.category}"`).join('\n');
  downloadFile(header + body, `export-${provider.value}-${service.value}.csv`, 'text/csv');
}

function exportJSON() {
  const rows = buildExportRows();
  downloadFile(JSON.stringify(rows, null, 2), `export-${provider.value}-${service.value}.json`, 'application/json');
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
  <div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2 flex-wrap">
    <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Provider</label>
        <select class="form-select w-100 custom-form-select" v-model="provider">
          <option value=" " disabled selected>Select a provider</option>  
          <option v-for="p in providers" :key="p" :value="p">
          {{ p }}
          </option>
        </select>
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
          <option value=" " disabled selected>Select region</option>  
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

    <div class="data-ex-form-cont">
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
          <button type="button" class="btn btn-outline-primary" :disabled="!provider || !service" @click="exportCSV">CSV</button>
          <button type="button" class="btn btn-outline-primary" :disabled="!provider || !service" @click="exportJSON">JSON</button>
      </div>
    </div>  
    </div>
  <div v-if="service && provider && metric" class="data-exploration-container">
    <div class="d-flex justify-content-start gap-5">
    <div style="width: 1000px; height: 750px;">
      <MetricChart
        :entities="chartEntities"
        :columns="activeColumns"
        :dataMap="providerMetricDataMap"
        :service="service"
        :granularity="granularity"
        :granularityLabels="providerGranularityLabels"
      />
    </div>

    <div v-if="service && provider && metric" class="table-responsive metrics-table-container">
      <table  class="metrics-table table table-hover">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Metric</th>
            <th scope="col">Value</th>
            <th scope="col">Score</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(field, index) in activeColumns" :key="field.id">
            <th scope="row">{{ index + 1 }}</th>
            <td>{{ field.name }}</td>
            <td>{{ valueFor(field) }}</td>
            <td>
              <span class="kpi" :class="kpiCardColor(scoreFor(field).label)">
                {{ scoreFor(field).label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  </div>
</div>

</template>

<style scoped src="@/assets/styles/views/DataExploration.scss"></style>