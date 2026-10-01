<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { providers, domains } from '@/data/filters';
import { pricingRecords } from '@/data/mockPricingData';
import { policyPresets } from '@/data/policyPresets';
import { useScenarioScoring } from '@/composables/useScenarioScoring';
import MetricChart from '@/components/MetricChart.vue';

import {
  COMPARE_FIELDS, SCENARIO_CRITERIA, CHART_COLUMNS, providerFullNames, presetLabels,
} from '@/data/constants';
import {
  monthlyEstimate, annualEstimate, colorFor, valueFor,
  deltaFor as calcDeltaFor, winnerFor as calcWinnerFor,
} from '@/utils/calculationServices';
import { exportCompareCSV, exportCompareJSON } from '@/utils/exportHelpers';

const isScrolled = ref(false);
const handleScroll = () => { isScrolled.value = window.scrollY > 20; };
onMounted(() => window.addEventListener('scroll', handleScroll));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));

//Shared filters
const compareMode = ref('sku');

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

//Provider mode
const provider1 = ref(null);
const provider2 = ref(null);
const sku1 = ref(null);
const sku2 = ref(null);

const skuOptions1 = computed(() => filteredRecords.value.filter(r => r.provider === provider1.value));
const skuOptions2 = computed(() => filteredRecords.value.filter(r => r.provider === provider2.value));

const skuRecord1 = computed(() => filteredRecords.value.find(r => r.id === sku1.value) || null);
const skuRecord2 = computed(() => filteredRecords.value.find(r => r.id === sku2.value) || null);

//Scenario mode
const presetNames = Object.keys(policyPresets);
const scenarioPreset1 = ref(null);
const scenarioPreset2 = ref(null);

const weights1 = computed(() => policyPresets[scenarioPreset1.value] ?? { Cost: 0.5, Performance: 0.5 });
const weights2 = computed(() => policyPresets[scenarioPreset2.value] ?? { Cost: 0.5, Performance: 0.5 });

const { scored: scored1 } = useScenarioScoring(filteredRecords, SCENARIO_CRITERIA, weights1);
const { scored: scored2 } = useScenarioScoring(filteredRecords, SCENARIO_CRITERIA, weights2);

const scenarioRecord1 = computed(() => scenarioPreset1.value ? (scored1.value[0] ?? null): null);
const scenarioRecord2 = computed(() => scenarioPreset2.value ? (scored2.value[0] ?? null): null);

//Unified record1/record2 across both modes
const record1 = computed(() => compareMode.value === 'scenario' ? scenarioRecord1.value : skuRecord1.value);
const record2 = computed(() => compareMode.value === 'scenario' ? scenarioRecord2.value : skuRecord2.value);


const noMatches = computed(() => {
  if (compareMode.value === 'scenario') {
    return !filteredRecords.value.length;
  }
  return (!!provider1.value && !skuOptions1.value.length) || (!!provider2.value && !skuOptions2.value.length);
});

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

// RESETS
function resetSelection() {
  sku1.value = null;
  sku2.value = null;
  scenarioPreset1.value = null;
  scenarioPreset2.value = null;
}

function resetFilters() {
  provider1.value = null;
  provider2.value = null;
  sku1.value = null;
  sku2.value = null;
  scenarioPreset1.value = null;
  scenarioPreset2.value = null;
  domain.value = null;
  region.value = null;
  operatingSystem.value = null;
}

function deltaFor(field) {
  return calcDeltaFor(record1.value, record2.value, field);
}

function winnerFor(field) {
  return calcWinnerFor(record1.value, record2.value, field);
}

//Export
function exportCSV() {
  exportCompareCSV(record1.value, record2.value, COMPARE_FIELDS);
}
function exportJSON() {
  exportCompareJSON(record1.value, record2.value, COMPARE_FIELDS);
}

</script>

<template>
<div class="page">

  <div class="btn-group">
    <button type="button" class="btn btn-outline-light" :class="{ active: compareMode === 'sku'}" 
      @click="compareMode = 'sku'; resetFilters()">
      Provider
    </button>
    <button type="button" class="btn btn-outline-light" :class="{ active: compareMode === 'scenario' }" 
      @click="compareMode = 'scenario'; resetFilters()">
      Scenario
    </button>
  </div>

  <div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2 flex-wrap"
    :class="{ scrolled: isScrolled }">

    <template v-if="compareMode === 'sku'">

      <div class="comparison-select-group">
        <div class="data-ex-form-cont">
          <label class="form-label" style="color: white">Provider A</label>
          <select class="form-select w-100 custom-form-select" v-model="provider1" @change="sku1 = null">
            <option :value="null">Any provider</option>
            <option v-for="p in providers" :key="p" :value="p" :disabled="p === provider2">
              {{ p }}
            </option>
          </select>
        </div>

        <div class="data-ex-form-cont">
          <label class="form-label" style="color: white">SKU</label>
          <select class="form-select custom-form-select" v-model="sku1">
            <option :value="null" disabled selected>Select a SKU</option>
            <option v-for="r in skuOptions1" :key="r.id" :value="r.id" :disabled="r.id === sku2">
              {{ r.skuName }}
            </option>
          </select>
        </div>
      </div>

      <div class="comparison-select-group">
        <div class="data-ex-form-cont">
          <label class="form-label" style="color: white">Provider B</label>
          <select class="form-select custom-form-select" v-model="provider2" @change="sku2 = null">
            <option :value="null">Any provider</option>
            <option v-for="p in providers" :key="p" :value="p" :disabled="p === provider1">
              {{ p }}
            </option>
          </select>
        </div>

        <div class="data-ex-form-cont">
          <label class="form-label" style="color: white">SKU</label>
          <select class="form-select custom-form-select" v-model="sku2">
            <option :value="null" disabled selected>Select a SKU</option>
            <option v-for="r in skuOptions2" :key="r.id" :value="r.id" :disabled="r.id === sku1">
              {{ r.skuName }}
            </option>
          </select>
        </div>
      </div>

    </template>

    <template v-else>

      <div class="comparison-select-group">
        <div class="data-ex-form-cont">
          <label class="form-label" style="color: white">Scenario A</label>
          <select class="form-select w-100 custom-form-select" v-model="scenarioPreset1">
            <option v-if="!scenarioPreset1" :value="null" disabled selected hidden>Choose preset</option>
            <option v-for="name in presetNames" :key="name" :value="name" :disabled="name === scenarioPreset2">
              {{ presetLabels[name] ?? name }}
            </option>
          </select>
        </div>
      </div>

      <div class="comparison-select-group">
        <div class="data-ex-form-cont">
          <label class="form-label" style="color: white">Scenario B</label>
          <select class="form-select w-100 custom-form-select" v-model="scenarioPreset2">
            <option v-if="!scenarioPreset2" :value="null" disabled selected hidden>Choose preset</option>
            <option v-for="name in presetNames" :key="name" :value="name" :disabled="name === scenarioPreset1">
              {{ presetLabels[name] ?? name }}
            </option>
          </select>
        </div>
      </div>

    </template>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Domain</label>
      <select class="form-select custom-form-select" v-model="domain" @change="resetSelection">
        <option :value="null">Any domain</option>
        <option v-for="d in domains" :key="d" :value="d">
          {{ d }}
        </option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Region</label>
      <select class="form-select w-100 custom-form-select" v-model="region" @change="resetSelection">
        <option :value="null">Any region</option>
        <option v-for="r in regionOptions" :key="r" :value="r">
          {{ r }}
        </option>
      </select>
    </div>

    <div class="data-ex-form-cont">
      <label class="form-label" style="color: white">Operating System</label>
      <select class="form-select w-100 custom-form-select" v-model="operatingSystem" @change="resetSelection">
        <option :value="null">Any</option>
        <option v-for="os in operatingSystemOptions" :key="os" :value="os">
          {{ os }}
        </option>
      </select>
    </div>

    <div class="data-ex-form-cont">
        <button type="button" class="btn btn-outline-light" @click="resetFilters">Reset</button>
    </div>

    <div>
      <label class="form-label" style="color: white">Export</label>
      <div class="data-ex-form-cont d-flex gap-3">
        <button type="button" class="btn btn-outline-primary" :disabled="!record1 || !record2" @click="exportCSV">CSV</button>
        <button type="button" class="btn btn-outline-primary" :disabled="!record1 || !record2" @click="exportJSON">JSON</button>
      </div>
    </div>

  </div>

  <div v-if="record1 || record2" class="comparison-container">

    <div class="chart-host mb-4">
      <MetricChart :records="chartRecords" :columns="CHART_COLUMNS" />
    </div>

  </div>

  <div v-if="record1 && record2" class="comparison-results">
    <div class="comparison-kpi-container">

      <div v-if="noMatches" class="text-white-50 small mt-1">
        No records match the current filters
      </div>

      <template v-else>

        <div v-if="record1" class="pricing-card mt-3">

          <div class="pricing-card-header">
            <h3 class="pricing-card-title">{{ record1.instance_type || record1.skuName }}</h3>
            <span class="pricing-badge" :class="record1.specs_complete ? 'pricing-badge-confirmed' : 'pricing-badge-inferred'">
              {{ record1.specs_complete ? 'CONFIRMED' : 'INFERRED' }}
            </span>
          </div>

          <div class="pricing-card-subtitle">
            {{ providerFullNames[record1.provider] }} · {{ record1.provider }} - {{ record1.product_family ?? 'Unknown' }}
          </div>

          <div v-if="compareMode === 'scenario'" class="pricing-card-subtitle text-white-50 small">
            Top pick under "{{ presetLabels[scenarioPreset1] ?? scenarioPreset1 }}" — score {{ (record1.score * 100).toFixed(1) }}%
          </div>

          <div class="pricing-card-specs">
            {{ record1.vcpu_count ?? '–' }} vCPU · {{ record1.memory_gb ?? '–' }} GB RAM
          </div>

          <div class="pricing-card-price">{{ record1.effective_price_hr.toFixed(4) }}</div>
          <div class="pricing-card-price-unit">{{ record1.currencyCode }} · per hour</div>

          <div class="pricing-card-estimates">
            <div>Est. monthly: {{ record1.currencyCode }} {{ monthlyEstimate(record1)?.toFixed(2) }}</div>
            <div>Est. annual: {{ record1.currencyCode }} {{ annualEstimate(record1)?.toFixed(2) }}</div>
          </div>

          <div class="pricing-card-meta">
            <div><span class="pricing-card-meta-label">Region</span>{{ record1.provider }} - {{ record1.region }}</div>
            <div><span class="pricing-card-meta-label">OS</span>{{ record1.operating_system ?? 'Unknown' }}</div>
            <div><span class="pricing-card-meta-label">Tenancy</span>{{ record1.tenancy ?? 'Unknown' }}</div>
            <div><span class="pricing-card-meta-label">Family</span>{{ record1.product_family ?? 'Unknown' }}</div>
          </div>

        </div>

        <div v-if="record2" class="pricing-card mt-3">

          <div class="pricing-card-header">
            <h3 class="pricing-card-title">{{ record2.instance_type || record2.skuName }}</h3>
            <span class="pricing-badge" :class="record2.specs_complete ? 'pricing-badge-confirmed' : 'pricing-badge-inferred'">
              {{ record2.specs_complete ? 'CONFIRMED' : 'INFERRED' }}
            </span>
          </div>

          <div class="pricing-card-subtitle">
            {{ providerFullNames[record2.provider] }} · {{ record2.provider }} - {{ record2.product_family ?? 'Unknown' }}
          </div>

          <div v-if="compareMode === 'scenario'" class="pricing-card-subtitle text-white-50 small">
            Top pick under "{{ presetLabels[scenarioPreset2] ?? scenarioPreset2 }}" — score {{ (record2.score * 100).toFixed(1) }}%
          </div>

          <div class="pricing-card-specs">
            {{ record2.vcpu_count ?? '–' }} vCPU · {{ record2.memory_gb ?? '–' }} GB RAM
          </div>

          <div class="pricing-card-price">{{ record2.effective_price_hr.toFixed(4) }}</div>
          <div class="pricing-card-price-unit">{{ record2.currencyCode }} · per hour</div>

          <div class="pricing-card-estimates">
            <div>Est. monthly: {{ record2.currencyCode }} {{ monthlyEstimate(record2)?.toFixed(2) }}</div>
            <div>Est. annual: {{ record2.currencyCode }} {{ annualEstimate(record2)?.toFixed(2) }}</div>
          </div>

          <div class="pricing-card-meta">
            <div><span class="pricing-card-meta-label">Region</span>{{ record2.provider }} - {{ record2.region }}</div>
            <div><span class="pricing-card-meta-label">OS</span>{{ record2.operating_system ?? 'Unknown' }}</div>
            <div><span class="pricing-card-meta-label">Tenancy</span>{{ record2.tenancy ?? 'Unknown' }}</div>
            <div><span class="pricing-card-meta-label">Family</span>{{ record2.product_family ?? 'Unknown' }}</div>
          </div>

        </div>

      </template>

    </div>

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