<script setup>
import { ref, computed } from 'vue';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, BarElement,
  PointElement, ArcElement, CategoryScale, LinearScale
} from 'chart.js'
import { Line, Bar, Pie } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, LineElement, BarElement, PointElement, ArcElement, CategoryScale, LinearScale)

const props = defineProps({
  entities: { type: Array, required: true },
  columns: { type: Array, default: () => [] },
  dataMap: { type: Object, required: true },
  service: { type: String, default: null },
  granularity: { type: String, default: 'daily' },
  granularityLabels: { type: Object, required: true },
  allowPie: { type: Boolean, default: false },
});

const visualizationType = ref('Line');
const subfieldType = ref(null);

const chartComponent = computed(() => {
  switch (visualizationType.value) {
    case 'Bar': return Bar;
    case 'Pie': return Pie;
    case 'Line':
    default: return Line;
  }
});

const PIE_COLORS = ['#4ade80', '#1e44b9', '#ca309e', '#f59e0b'];

const chartData = computed(() => {
  const key = subfieldType.value;
  const svc = props.service;
  const labels = props.granularityLabels[props.granularity] || [];

  if (visualizationType.value === 'Pie') {
    const entity = props.entities[0];
    return {
      labels,
      datasets: [
        {
          label: entity?.label || 'Metric',
          data: props.dataMap?.[entity?.id]?.[svc]?.[key] || [],
          backgroundColor: PIE_COLORS,
        }
      ]
    };
  }

  return {
    labels,
    datasets: props.entities.map((entity) => ({
      label: entity.label,
      data: props.dataMap?.[entity.id]?.[svc]?.[key] || [],
      borderColor: entity.color,
      backgroundColor: entity.color + '24', // ~14% alpha hex suffix
      tension: 0.4,
    }))
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: 'white' } } },
  scales: visualizationType.value === 'Pie' ? {} : {
    x: { ticks: { color: 'white' } },
    y: { ticks: { color: 'white' } }
  }
}));

defineExpose({ subfieldType });
</script>

<template>
  <div class="metric-chart">
    <div class="d-flex gap-2 mb-3">
      <select class="form-select custom-form-select" style="width: 100px" v-model="visualizationType">
        <option>Line</option>
        <option>Bar</option>
        <option v-if="allowPie">Pie</option>
      </select>
      <select v-if="service" class="form-select custom-form-select" style="width: 200px" v-model="subfieldType">
        <option :value="null" disabled selected>Select a metric</option>
        <option v-for="field in columns" :key="field.id" :value="field.id">
          {{ field.name }}
        </option>
      </select>
    </div>

    <div v-if="!subfieldType" class="text-white text-center py-5">
      Select a metric above to see the chart.
    </div>
    <component v-else :is="chartComponent" :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped src="@/assets/styles/components/MetricChart.scss"></style>