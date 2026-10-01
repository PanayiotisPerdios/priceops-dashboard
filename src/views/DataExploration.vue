<script setup>
import { ref, computed } from 'vue';
import { pricingRecords } from '@/data/mockPricingData';
import MetricChart from '@/components/MetricChart.vue';

import { CHART_COLUMNS } from '@/data/constants';
import { colorFor } from '@/utils/calculationServices';
import { exportRowsCSV, exportRowsJSON } from '@/utils/exportHelpers';

const provider = ref(null);
const domain = ref(null);
const region = ref(null);
const operatingSystem = ref(null);
const minVcpu = ref(null);
const minMemory = ref(null);

const providers = computed(() => [...new Set(pricingRecords.map(r => r.provider))]);
const domains = computed(() => [...new Set(pricingRecords.map(r => r.domain))]);
const regions = computed(() => [
  ...new Set(
    pricingRecords
      .filter(r => !provider.value || r.provider === provider.value)
      .map(r => r.region)
  ),
]);
const operatingSystems = computed(() => [
  ...new Set(pricingRecords.map(r => r.operating_system).filter(Boolean)),
]);

const filteredRecords = computed(() =>
  pricingRecords.filter(r =>
    (!provider.value || r.provider === provider.value) &&
    (!domain.value || r.domain === domain.value) &&
    (!region.value || r.region === region.value) &&
    (!operatingSystem.value || r.operating_system === operatingSystem.value) &&
    (!minVcpu.value || (r.vcpu_count ?? 0) >= Number(minVcpu.value)) &&
    (!minMemory.value || (r.memory_gb ?? 0) >= Number(minMemory.value))
  )
);

const chartRecords = computed(() =>
  filteredRecords.value.map(r => ({
    id: r.id,
    name: r.skuName,
    color: colorFor(r.provider),
    vcpu_count: r.vcpu_count,
    memory_gb: r.memory_gb,
    effective_price_hr: r.effective_price_hr,
    data_quality_score: r.data_quality_score,
  }))
);

// RESETS
function resetFilters() {
  provider.value = null;
  domain.value = null;
  region.value = null;
  operatingSystem.value = null;
  minVcpu.value = null;
  minMemory.value = null;
}

function buildExportRows() {
  return filteredRecords.value.map(r => ({
    provider: r.provider,
    domain: r.domain,
    region: r.region,
    operating_system: r.operating_system,
    vcpu_count: r.vcpu_count,
    memory_gb: r.memory_gb,
    effective_price_hr: r.effective_price_hr,
    data_quality_score: r.data_quality_score,
  }));
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
  <div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2 flex-wrap">

    <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Provider</label>
        <select class="form-select w-100 custom-form-select" v-model="provider">
          <option :value="null">Any provider</option>  
          <option v-for="p in providers" :key="p" :value="p">
          {{ p }}
          </option>
        </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Domain</label>
      <select class="form-select w-100 custom-form-select" v-model="domain">
        <option :value="null">Any domain</option>
        <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Region</label>
      <select class="form-select w-100 custom-form-select" v-model="region">
        <option :value="null">Any region</option>  
        <option v-for="r in regions" :key="r" :value="r">
          {{ r }}
        </option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Operating System</label>
      <select class="form-select w-100 custom-form-select" v-model="operatingSystem">
        <option :value="null">Any</option>
        <option v-for="os in operatingSystems" :key="os" :value="os">
          {{ os }}
        </option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Min vCPU</label>
      <input type="number" min="0" class="form-control custom-form-select" v-model="minVcpu" placeholder="Any" />
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Min Memory (GB)</label>
      <input type="number" min="0" class="form-control custom-form-select" v-model="minMemory" placeholder="Any" />
    </div>

    <div class="data-ex-form-cont">
        <button type="button" class="btn btn-outline-light" @click="resetFilters">Reset</button>
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
        <label class="form-label" style="color: white">Date range</label>
        <VueDatePicker v-model="dateRange" :range="true" :dark="true" placeholder="Select your date range"/>
      </div>
    </div>

    <div>
      <label class="form-label" style="color: white">Export</label>
      <div class="data-ex-form-cont d-flex gap-3">
        <button type="button" class="btn btn-outline-primary" :disabled="!filteredRecords.length" @click="exportCSV">CSV</button>
        <button type="button" class="btn btn-outline-primary" :disabled="!filteredRecords.length" @click="exportJSON">JSON</button>
      </div>
    </div>  

  </div>


  <div v-if="provider" class="chart-host mb-4">
    <MetricChart :records="chartRecords" :columns="CHART_COLUMNS" />
  </div>

  <div v-if="provider" class="data-exploration-container">


    <div class="d-flex justify-content-start gap-5">

      <div v-if="provider" class="table-responsive metrics-table-container">
        <table  class="metrics-table table table-hover">
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">Domain</th>
              <th scope="col">Region</th>
              <th scope="col">OS</th>
              <th scope="col">vCPU</th>
              <th scope="col">Memory (GB)</th>
              <th scope="col">Price / hr</th>
              <th scope="col">Quality Score</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
                <td>{{ record.provider }}</td>
                <td>{{ record.domain }}</td>
                <td>{{ record.region }}</td>
                <td>{{ record.operating_system ?? 'N/A' }}</td>
                <td>{{ record.vcpu_count ?? 'N/A' }}</td>
                <td>{{ record.memory_gb ?? 'N/A' }}</td>
                <td>{{ record.effective_price_hr.toFixed(4) }} {{ record.currencyCode }}</td>
                <td>{{ record.data_quality_score }}</td>
              </tr>
          </tbody>
        </table>

        <p v-if="!filteredRecords.length" class="text-white-50">No records match the current filters.</p>
      </div>

    </div>

  </div>

</div>

</template>

<style scoped src="@/assets/styles/views/DataExploration.scss"></style>