<script setup>
import { ref, computed } from 'vue';
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

import { tableColumnMap } from '@/data/tableColumns';

import {
  metricDataMap,
  granularityLabels,
} from '@/data/chartData'

import {
  providerMockData
} from '@/mock-data/providerMockData'

const visualizationType = ref('Line')

const provider = ref(null);
const service = ref(null);
const region = ref(null);
const dateRange = ref(null);
const metric = ref(null);
const granularity = ref('daily');

const activeComparisonColumns = computed(() => {
  return (tableColumnMap?.[service.value]?.[metric.value]?.fields || [])

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
  return {
    labels: granularityLabels[granularity.value] || [],
    datasets: [
      {
        label: metric.value || 'Metric',
        data: metricDataMap[metric.value] || [],
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

<div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-2">
  <div class="">
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
  <div>
    <label class="form-label text-white">Export</label>
    <div class="data-ex-form-cont d-flex gap-3">
        <button type="button" class="btn btn-outline-primary">CSV</button>
        <button type="button" class="btn btn-outline-primary">JSON</button>
        <button type="button" class="btn btn-outline-primary">Snapshot</button>
    </div>
  </div>  
  </div>
    <div class="d-flex justify-content-start">
    <div style="width: 1000px; height: 750px;">
      <select class="form-select custom-form-select" style="width: 100px"v-model="visualizationType">
        <option>Line</option>
        <option>Bar</option>
        <option>Pie</option>
      </select>
      <component :is="chartComponent" :data="chartData" :options="chartOptions"/>
  </div>

  <div style="width: 900px;" class="table-responsive">
    <table v-if="service && metric" class="metrics-table table table-hover">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th 
          v-for="(item, index) in activeComparisonColumns"
          :key="index"
          scope="col">
          {{ item }}</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <th scope="row">1</th>
          <td>Mark</td>
          <td>Otto</td>
          <td>@mdo</td>
        </tr>

        <tr>
          <th scope="row">2</th>
          <td>Jacob</td>
          <td>Thornton</td>
          <td>@fat</td>
        </tr>

        <tr>
          <th scope="row">3</th>
          <td>John</td>
          <td>Doe</td>
          <td>@social</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

</template>