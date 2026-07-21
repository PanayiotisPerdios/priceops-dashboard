<script setup>
import { ref, computed } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale
} from 'chart.js'

import {
  Line,
  Bar,
  Pie
} from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale
)

import {
  providers,
  services,
  regions,
  metrics
} from '@/data/filters'

import { getMetricsForService } from '@/data/metricRegistry';

import {
  providerMetricDataMap,
  granularityLabels
} from '@/mock-data/providerMetricDataMap'

import {
  providerMockData
} from '@/mock-data/providerMockData'

import {
  getProviderValue,
  getScore,
  kpiCardColor
} from '@/utils/calculationServices'

const visualizationType = ref('Line')
const subfieldType = ref(null)

const provider = ref(null);
const service = ref(null);
const region = ref(null);
const dateRange = ref(null);
const metric = ref(null);
const granularity = ref('daily');

const activeComparisonColumns = computed(() => {
  if (!service.value) return [];

  const allMetrics = getMetricsForService(service.value);

  return Object.entries(allMetrics)
    .filter(([, def]) => !metric.value || def.category === metric.value)
    .map(([key, def]) => ({ id: key, ...def }));
});

const chartComponent = computed(() => {
  switch(visualizationType.value){
    case 'Bar':
      return Bar

    case 'Pie':
      return Pie

    case 'Line':
    default:
      return Line
  }
})

const timeNormalization = computed( () =>  {
  if (!dateRange.value) {
    return null;
  }
    
  return {
    startDate : dateRange.value[0],
    endDate : dateRange.value[1],
    granularity: granularity.value 
  }
}) 

const chartData = computed(() => {
  const key = subfieldType.value;
  const svc = service.value;
  const p = provider.value;

  const seriesData = providerMetricDataMap?.[p]?.[svc]?.[key] || [];

  if (visualizationType.value === 'Pie') {
    return {
      labels: granularityLabels[granularity.value] || [],
      datasets: [
        {
          label: subfieldType.value || 'Metric',
          data: seriesData,
          backgroundColor: ['#4ade80', '#1e44b9', '#ca309e', '#f59e0b'],
        }
      ]
    };
  }

  return {
    labels: granularityLabels[granularity.value] || [],
    datasets: [
      {
        label: activeComparisonColumns.value.find(f => f.id === key)?.name || 'Metric',
        data: seriesData,
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.2)',
        tension: 0.4,
      }
    ]
  };
});

const chartOptions = computed(() => {
  if (visualizationType.value === 'Pie') {
    return {
      responsive: true,
      plugins: {
        legend: { labels: { color: 'white' } }
      }
    }
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'white' } }
    },
    scales: {
      x: { ticks: { color: 'white' } },
      y: { ticks: { color: 'white' } }
    }
  }
})

function valueFor(field) {
  return getProviderValue(providerMockData, provider.value, service.value, metric.value, field.id);
}

function scoreFor(field) {
  const value = valueFor(field);
  return getScore(field, value);
}

function buildExportRows() {
  return activeComparisonColumns.value.map(field => ({
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

<div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2">
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
      <label class="form-label" style="color: white">Service</label>
      <select class="form-select w-100 custom-form-select" v-model="service">
        <option value=" " disabled selected>Select a service</option>  
        <option v-for="s in services" :key="s" :value="s">
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
  <div class="d-flex justify-content-start">
  <div style="width: 1000px; height: 750px;">
    <div class="d-flex gap-2 mb-3">
      <select class="form-select custom-form-select" style="width: 100px" v-model="visualizationType">
        <option>Line</option>
        <option>Bar</option>
        <option>Pie</option>
      </select>
      <select v-if="service" class="form-select custom-form-select" style="width: 200px" v-model="subfieldType">
        <option v-for="field in activeComparisonColumns" :key="field.id" :value="field.id">
          {{ field.name }}
        </option>
      </select>
    </div>

    <div v-if="!subfieldType" class="text-white text-center py-5">
      Select a metric above to see the chart.
    </div>
    <component v-else :is="chartComponent" :data="chartData" :options="chartOptions"/>
  </div>

  <div style="width: 900px;" class="table-responsive">
    <table v-if="service && provider" class="metrics-table table table-hover">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Metric</th>
          <th scope="col">Value</th>
          <th scope="col">Score</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(field, index) in activeComparisonColumns" :key="field.id">
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

</template>

<style scoped src="@/assets/styles/views/DataExploration.scss"></style>