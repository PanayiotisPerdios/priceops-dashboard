<script setup>
import { ref, computed } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import '@/assets/main.scss'

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from 'chart.js'
import { Line } from 'vue-chartjs'

const provider = ref(null);
const service = ref(null);
const region = ref(null);
const dateRange = ref(null);
const metric = ref(null);
const granularity = ref('daily');

const providers = [
  "AWS",
  "Google Cloud",
  "Azure"
]

const services = [
  "Compute",
  "Storage",
  "Database",
  "Networking",
  "Kubernetes",
  "Serverless"
]

const regions = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "asia-east1"
]

const metrics = [
  "Cost",
  "Usage",
  "Amortized Cost",
  "Blended Cost",
  "Forecasted Cost"
]

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

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
)

const chartData = computed(() => {
  let labels = [];

  if (granularity.value === 'daily'){
    labels = ['Mon', 'Tue', 'Wed', 'Thu'];
  } else if (granularity.value === 'weekly'){
    labels = ['Week 1', 'Week 2', 'Week 3'];
  } else if (granularity.value === 'monthly'){
    labels = ['Jan', 'Feb', 'Mar'];
  } else if (granularity.value === 'hourly'){
    labels = ['01:00', '02:00', '03.00', '04.00'];
  }

  let dataValues = [];

  if (metric.value == 'Cost'){
    dataValues = [10, 20, 30];
  } else if (metric.value == 'Usage'){
    dataValues = [100, 200, 150];
  } else if (metric.value == 'Amortized Cost'){
    dataValues = [5, 15, 25];
  } else if (metric.value == 'Blended Cost'){
    dataValues = [30, 40, 50];
  } else if (metric.value == 'Forecasted Cost'){
    dataValues = [1, 2, 3];
  }

  return {
    labels,
    datasets: [
      {
        label: metric.value || 'Metric',
        data: dataValues,
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  };
 
});

const chartOptions = computed(() => ({
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
      title: {
        display: true,
        text: granularity.value,
        color: 'white'
      },
      ticks: {
        color: 'white'
      }
    },
    y: {
      title: {
        display: true,
        text: metric.value || 'Value',
        color: 'white'
      },
      ticks: {
        color: 'white'
      }
    }
  }
}));

</script>

<template>

<div class="top-filter-bar d-flex justify-content-center align-items-end gap-3 py-3">
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
    <div class="d-flex justify-content-start">
    <div style="width: 1000px; height: 600px;">
      <Line :data="chartData" :options="chartOptions" />
  </div>

  <div class="table-responsive w-100">
    <table class="metrics-table table table-hover">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">First</th>
          <th scope="col">Last</th>
          <th scope="col">Handle</th>
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