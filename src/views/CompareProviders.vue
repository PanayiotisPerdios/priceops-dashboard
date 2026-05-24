<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import '@/assets/main.scss'

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

import { tableColumnMap } from '@/data/tableColumns';

import {
  metricDataMap,
  granularityLabels,
  providerMetricDataMap
} from '@/data/chartData'

import {
  providerMockData
} from '@/mock-data/providerMockData'

import {
  normalizeValue,
  getScoreLabel,
  getProviderValue,
  getDelta,
  getWinner,
  getScore
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
  return (tableColumnMap?.[service.value]?.[metric.value]?.fields || [])

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
  if(window.scrollY > 20){
   isScrolled.value = true;
  }else{
   isScrolled.value = false;
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const chartData = computed(() => {
  return {
      labels: granularityLabels[granularity.value] || [],
      datasets: [
        {
          label: provider1.value || 'Provider A',
          data: providerMetricDataMap?.[provider1.value]?.[metric.value]  || [],
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74,222,128,0.2)',
          tension: 0.4
        },

        {
        label: provider2.value || 'Provider B',
        data: providerMetricDataMap?.[provider2.value]?.[metric.value] || [],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.2)',
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
        legend: {
          labels: {
            color: 'white'
          }
        }
      }
    }
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'white'
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'white'
        }
      },
      y: {
        ticks: {
          color: 'white'
        }
      }
    }
  }
})

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
      <label class="form-label" style="color: white">Metric</label>
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
</div>
<div class="comparison-container">

  <div class="comparison-kpi-card">

    <div class="data-ex-form-cont">
      <label class="form-label text-white">
        Provider
      </label>

      <select class="form-select custom-form-select" v-model="provider1">
        <option disabled selected>
          Select a provider
        </option>

        <option v-for="p in providers" :key="p" :value="p">
        {{ p }}
        </option>
      </select>
        <div v-if="provider1 && provider2 && metric && service" class="mt-3">
          <div v-for="(item,index) in activeComparisonColumns" :key="index" class="kpi-score-row">
            <strong>{{ item.name }}</strong>
              <div>
                {{ getScore(item, getProviderValue(providerMockData, provider1, service, metric, item.name)).label }}
      |         {{ getScore(item, getProviderValue(providerMockData, provider1, service, metric, item.name)).normalized.toFixed(1) }}%
              </div>
          </div>  
        </div>  
    </div>

  </div>

  <div class="custom-chart">  
    <div class="d-flex justify-content-start">
      <div style="width: 1000px; height: 650px;">
        <div class="d-flex gap-2 mb-3">
          <select class="form-select custom-form-select" style="width: 100px"v-model="visualizationType">
            <option>Line</option>
            <option>Bar</option>
          </select>
          <select v-if="service && metric" class="form-select custom-form-select" style="width: 200px" v-model="subfieldType">
            <option v-for="item in activeComparisonColumns" :key="item.name":value="item.name">
              {{ item.name }}
            </option>
          </select>
        </div>  
          <component :is="chartComponent" :data="chartData" :options="chartOptions"/>
      </div>
    </div>
  </div>
  <div class="comparison-kpi-card">

    <div class="data-ex-form-cont">
      <label class="form-label text-white">
        Provider
      </label>

      <select class="form-select custom-form-select" v-model="provider2">
        <option disabled selected>
          Select a provider
        </option>

        <option v-for="p in providers" :key="p" :value="p">
          {{ p }}
        </option>
      </select>

        <div v-if="provider1 && provider2 && metric && service" class="mt-3">
          <div v-for="(item,index) in activeComparisonColumns" :key="index" class="kpi-score-row">
            <strong>{{ item.name }}</strong>
              <div>
                {{ getScore(item, getProviderValue(providerMockData, provider2, service, metric, item.name)).label }}
      |         {{ getScore(item, getProviderValue(providerMockData, provider2, service, metric, item.name)).normalized.toFixed(1) }}%
              </div>
          </div>  
        </div>
    </div>

  </div>

</div>

 <div v-if="provider1 && provider2 && metric && service" style="width: 900px;" class="table-responsive comparison-table-container">
    <table v-if="provider1 && provider2" class="comparison-table table">
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
        <tr v-for="(item,index) in activeComparisonColumns" :key="index">
          <td>{{ item.name }}</td>

          <td>{{ getProviderValue(providerMockData, provider1, service, metric, item.name)}}</td>

          <td>{{ getProviderValue(providerMockData, provider2, service, metric, item.name) }}</td>

          <td :class="Number(getDelta(provider1, provider2, item.name, providerMockData, service, metric)) < 0
            ? 'negative-delta'
            : 'positive-delta'">
            {{ getDelta(provider1, provider2, item.name, providerMockData, service, metric) }}
          </td>

          <td>
            <span class="winner-badge" :class="getWinner(provider1, provider2, item, providerMockData, service, metric) === provider1
              ? 'positive-badge'
              : 'negative-badge'">
            {{ getWinner(provider1, provider2, item, providerMockData, service, metric) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

  </div>

</template>