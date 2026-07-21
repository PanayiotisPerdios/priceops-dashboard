<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
  Bar
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
  getDelta,
  getWinner,
  getScore,
  kpiCardColor
} from '@/utils/calculationServices'


const visualizationType = ref('Line')
const subfieldType = ref(null)

const isScrolled = ref(false);

const provider1 = ref(null);
const provider2 = ref(null);
const region = ref(null);

const dateRange = ref(null);
const granularity = ref('daily');
const service = ref(null);
const metric = ref(null);

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


const handleScroll = () => {
  isScrolled.value = window.scrollY > 20;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const chartData = computed(() => {
  const key = subfieldType.value;
  const svc = service.value;

  return {
    labels: granularityLabels[granularity.value] || [],
    datasets: [
      {
        label: provider1.value || 'Provider A',
        data: providerMetricDataMap?.[provider1.value]?.[svc]?.[key] || [],
        borderColor: '#1e44b9',
        backgroundColor: 'rgba(76, 74, 222, 0.14)',
        tension: 0.4
      },
      {
        label: provider2.value || 'Provider B',
        data: providerMetricDataMap?.[provider2.value]?.[svc]?.[key] || [],
        borderColor: '#ca309e',
        backgroundColor: 'rgba(248, 113, 201, 0.14)',
        tension: 0.4
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

function scoreFor(provider, field) {
  const value = getProviderValue(providerMockData, provider, service.value, metric.value, field.id);
  return getScore(field, value);
}

function valueFor(provider, field) {
  return getProviderValue(providerMockData, provider, service.value, metric.value, field.id);
}

function deltaFor(field) {
  return getDelta(providerMockData, provider1.value, provider2.value, service.value, metric.value, field.id);
}

function winnerFor(field) {
  return getWinner(providerMockData, provider1.value, provider2.value, service.value, metric.value, field);
}

</script>

<template>

<div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2" 
:class="{ scrolled: isScrolled }">
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
        <option value=" " disabled selected>Select category</option>  
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
</div>
<div class="comparison-container">

  <div class="comparison-kpi-container">
    <div class="comparison-kpi-card">
      <div class="data-ex-form-cont">
        <label class="form-label text-white">Provider</label>

        <select class="form-select custom-form-select" v-model="provider1">
          <option disabled selected>Select a provider</option>
          <option v-for="p in providers" :key="p" :value="p">
            {{ p }}
          </option>
        </select>
        
          <div v-if="provider1 && provider2 && service && metric" class="mt-3">
            <div v-for="field in activeComparisonColumns" :key="field.id" class="kpi-score-row">
              <strong>{{ field.name }} </strong>
              <div class="kpi" :class="kpiCardColor(scoreFor(provider1, field).label)">
                  {{ scoreFor(provider1, field).label }}
                  | {{ scoreFor(provider1, field).normalized.toFixed(1) }}%
                </div>
            </div>  
          </div>  
      </div>
    </div>

  
    <div class="comparison-kpi-card">
        <div class="data-ex-form-cont">
          <label class="form-label text-white">Provider</label>

          <select class="form-select custom-form-select" v-model="provider2">
            <option disabled selected>Select a provider</option>
            <option v-for="p in providers" :key="p" :value="p">
              {{ p }}
            </option>
          </select>

          <div v-if="provider1 && provider2 && service && metric" class="mt-3">
            <div v-for="field in activeComparisonColumns" :key="field.id" class="kpi-score-row">
              <strong>{{ field.name }}</strong>
              <div class="kpi" :class="kpiCardColor(scoreFor(provider2, field).label)">
                {{ scoreFor(provider2, field).label }}
                | {{ scoreFor(provider2, field).normalized.toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
    </div>
  </div>

  <div class="custom-chart">
      <div class="d-flex justify-content-start">
        <div style="width: 1000px; height: 650px;">
          <div class="d-flex gap-2 mb-3">
            <select class="form-select custom-form-select" style="width: 100px" v-model="visualizationType">
              <option>Line</option>
              <option>Bar</option>
            </select>
            <select v-if="service" class="form-select custom-form-select" style="width: 200px"
              v-model="subfieldType">
              <option v-for="field in activeComparisonColumns" :key="field.id" :value="field.id">
                {{ field.name }}
              </option>
            </select>
          </div>
          <div v-if="!subfieldType" class="text-white text-center py-5">
            Select a metric above to see the comparison chart.
          </div>
          <component v-else :is="chartComponent" :data="chartData" :options="chartOptions" />
        </div>
      </div>
  </div>

  

</div>

  <div v-if="provider1 && provider2 && service && metric" style="width: 900px;" class="table-responsive comparison-table-container">
    <table class="comparison-table table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>{{ provider1 }}</th>
          <th>{{ provider2 }} </th>
          <th>Delta</th>
          <th>Winner</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="field in activeComparisonColumns" :key="field.id">
          <td>{{ field.name }}</td>
          <td>{{ valueFor(provider1, field) }}</td>
          <td>{{ valueFor(provider2, field) }}</td>
          <td :class="Number(deltaFor(field)) < 0 ? 'negative-delta' : 'positive-delta'">
            {{ deltaFor(field) }}
          </td>
          <td>
            <span class="winner-badge"
              :class="winnerFor(field) === provider1 ? 'positive-badge' : 'negative-badge'">
              {{ winnerFor(field) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>

<style scoped src="@/assets/styles/views/CompareProviders.scss"></style>