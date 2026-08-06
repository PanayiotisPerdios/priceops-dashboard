<script setup>
import { ref, computed } from 'vue';
import {
  Chart as ChartJS, Title, Tooltip, Legend, Filler,
  LineElement, BarElement, PointElement, ArcElement,
  CategoryScale, LinearScale, RadialLinearScale,
  LineController, BarController, PieController, RadarController, ScatterController
} from 'chart.js'
import { Line, Bar, Pie, Radar, Scatter } from 'vue-chartjs'

ChartJS.register(
  Title, Tooltip, Legend, Filler,
  LineElement, BarElement, PointElement, ArcElement,
  CategoryScale, LinearScale, RadialLinearScale,
  LineController, BarController, PieController, RadarController, ScatterController
)

const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    const active = chart.tooltip?._active;
    if (!active?.length || !chart.scales?.y) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }
};
ChartJS.register(crosshairPlugin);

const props = defineProps({
  entities: { type: Array, required: true },
  columns: { type: Array, default: () => [] },
  dataMap: { type: Object, required: true },
  service: { type: String, default: null },
  granularity: { type: String, default: 'daily' },
  granularityLabels: { type: Object, required: true },
});

const visualizationType = ref('Line');
const subfieldType = ref(null);
const showExtremes = ref(true);
const showAverage = ref(false);
const showGapFill = ref(true);
const chartRef = ref(null);

const CHART_TYPES = ['Line', 'Area', 'Bar', 'Scatter', 'Radar', 'Pie'];

const chartComponent = computed(() => {
  switch (visualizationType.value) {
    case 'Bar': return Bar;
    case 'Pie': return Pie;
    case 'Radar': return Radar;
    case 'Scatter': return Scatter;
    case 'Line':
    case 'Area':
    default: return Line;
  }
});

const isTimeSeries = computed(() =>
  ['Line', 'Area', 'Bar', 'Scatter'].includes(visualizationType.value)
);

const PIE_COLORS = ['#4ade80', '#1e44b9', '#ca309e', '#f59e0b', '#6366f1', '#f97316'];

function buildPieDataset() {
  if (props.entities.length > 1) {
    const values = props.entities.map((entity) => {
      const arr = seriesFor(entity);
      return arr.length ? arr[arr.length - 1] : 0;
    });
    return {
      labels: props.entities.map((e) => e.label),
      datasets: [{
        data: values,
        backgroundColor: props.entities.map((e) => e.color),
      }],
    };
  }

  const entity = props.entities[0];
  const labels = props.granularityLabels[props.granularity] || [];
  return {
    labels,
    datasets: [{
      label: entity?.label || 'Metric',
      data: seriesFor(entity),
      backgroundColor: PIE_COLORS,
    }],
  };
}


function seriesFor(entity) {
  return props.dataMap?.[entity.id]?.[props.service]?.[subfieldType.value] || [];
}

function extremesOf(arr) {
  if (!arr.length) return { min: -1, max: -1 };
  let minI = 0, maxI = 0;
  arr.forEach((v, i) => {
    if (v < arr[minI]) minI = i;
    if (v > arr[maxI]) maxI = i;
  });
  return { min: minI, max: maxI };
}

function buildTimeSeriesDatasets() {
  const labels = props.granularityLabels[props.granularity] || [];
  const isArea = visualizationType.value === 'Area';

  const mainDatasets = props.entities.map((entity) => {
    const data = seriesFor(entity);
    const { min, max } = extremesOf(data);
    const isScatter = visualizationType.value === 'Scatter';

    return {
      label: entity.label,
      data,
      borderColor: entity.color,
      backgroundColor: isArea ? entity.color + '33' : entity.color + '24',
      fill: isArea,
      showLine: !isScatter,
      tension: 0.35,
      _isMain: true,
      pointRadius: (ctx) => {
        const base = isScatter ? 5 : 3;
        const extremeSize = isScatter ? 8 : 6;
        return showExtremes.value && (ctx.dataIndex === min || ctx.dataIndex === max) ? extremeSize : base;
      },
      pointBackgroundColor: (ctx) => showExtremes.value && (ctx.dataIndex === min || ctx.dataIndex === max) ? '#fbbf24' : entity.color,
      pointBorderColor: (ctx) => showExtremes.value && (ctx.dataIndex === min || ctx.dataIndex === max) ? '#fbbf24' : entity.color,
    };
  });

  if (showGapFill.value && props.entities.length === 2 && (visualizationType.value === 'Line' || visualizationType.value === 'Area')) {
    mainDatasets[1] = { ...mainDatasets[1], fill: '-1', backgroundColor: 'rgba(255,255,255,0.06)' };
  }

  const avgDatasets = showAverage.value
    ? props.entities.map((entity) => {
        const data = seriesFor(entity);
        const avg = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0;
        return {
          label: `${entity.label} avg`,
          data: labels.map(() => avg),
          borderColor: entity.color,
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          _isMain: false,
        };
      })
    : [];

  return { labels, datasets: [...mainDatasets, ...avgDatasets] };
}

function buildRadarDataset() {
  const latestByEntityAndField = {};
  props.entities.forEach((entity) => {
    latestByEntityAndField[entity.id] = {};
    props.columns.forEach((field) => {
      const arr = props.dataMap?.[entity.id]?.[props.service]?.[field.id] || [];
      latestByEntityAndField[entity.id][field.id] = arr.length ? arr[arr.length - 1] : null;
    });
  });

  const ranges = {};
  props.columns.forEach((field) => {
    const vals = props.entities
      .map((e) => latestByEntityAndField[e.id][field.id])
      .filter((v) => v != null);
    ranges[field.id] = { min: Math.min(...vals), max: Math.max(...vals) };
  });

  function normalize(field, value) {
    if (value == null) return 0;
    const { min, max } = ranges[field.id];
    if (max === min) return 100;
    return ((value - min) / (max - min)) * 100;
  }

  return {
    labels: props.columns.map((f) => f.name),
    datasets: props.entities.map((entity) => ({
      label: entity.label,
      data: props.columns.map((field) => normalize(field, latestByEntityAndField[entity.id][field.id])),
      borderColor: entity.color,
      backgroundColor: entity.color + '2a',
      pointBackgroundColor: entity.color,
      _isMain: true,
    })),
  };
}

const chartData = computed(() => {
  if (visualizationType.value === 'Radar') return buildRadarDataset();
  if (visualizationType.value === 'Pie') return buildPieDataset();

  return buildTimeSeriesDatasets();
});


const chartOptions = computed(() => {
  const isRadar = visualizationType.value === 'Radar';
  const isPie = visualizationType.value === 'Pie';
  const isScatter = visualizationType.value === 'Scatter';

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: isRadar || isPie ? {} : { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: 'white' },
        onClick(e, legendItem, legend) {
          const chart = legend.chart;
          const index = legendItem.datasetIndex;
          if (e.native?.shiftKey) {
            chart.data.datasets.forEach((_, i) => { chart.getDatasetMeta(i).hidden = i !== index; });
          } else {
            const meta = chart.getDatasetMeta(index);
            meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : !meta.hidden;
          }
          chart.update();
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            if (visualizationType.value !== 'Pie') return undefined; // fall back to Chart.js default
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
            return `${context.label}: ${context.parsed} (${pct}%)`;
          },

          footer(items) {
            const mainItems = items.filter((i) => i.dataset._isMain);
            if (mainItems.length !== 2) return '';
            const [a, b] = mainItems;
            const diff = a.parsed.y - b.parsed.y;
            const pct = b.parsed.y ? ((diff / b.parsed.y) * 100).toFixed(1) : '—';
            return `Δ ${diff.toFixed(2)} (${pct}%)`;
          },
        },
      },
    },
    scales: isPie
      ? {}
      : isRadar
      ? { r: {
          angleLines: { color: 'rgba(255,255,255,0.12)' },
          grid: { color: 'rgba(255,255,255,0.12)' },
          pointLabels: { color: '#e5e7ea' },
          ticks: { display: false, backdropColor: 'transparent' },
          } 
        }
      : { x: {
          type: isScatter ? 'category' : undefined,  
          ticks: { color: 'white' } 
          }, 
          y: { 
            ticks: { color: 'white' } 
          } 
        },
  };
});

function downloadChart() {
  const canvas = chartRef.value?.$el;
  if (!canvas?.toDataURL) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${props.service || 'chart'}-${subfieldType.value || visualizationType.value}.png`;
  a.click();
}

defineExpose({ subfieldType });
</script>

<template>
  <div class="metric-chart">
    <div class="chart-controls">
      <div class="d-flex gap-2 flex-wrap">
        <select class="form-select custom-form-select" style="width: 110px" v-model="visualizationType">
          <option v-for="t in CHART_TYPES" :key="t">{{ t }}</option>
        </select>
        <select
          v-if="service && visualizationType !== 'Radar'"
          class="form-select custom-form-select"
          style="width: 200px"
          v-model="subfieldType"
        >
          <option :value="null" disabled selected>Select a metric</option>
          <option v-for="field in columns" :key="field.id" :value="field.id">{{ field.name }}</option>
        </select>
      </div>

      <div class="d-flex align-items-center gap-3 flex-wrap chart-toggles" v-if="isTimeSeries">
        <label class="chart-toggle">
          <input type="checkbox" v-model="showExtremes" /> Highlight min/max
        </label>
        <label class="chart-toggle">
          <input type="checkbox" v-model="showAverage" /> Average line
        </label>
        <label
          class="chart-toggle"
          v-if="entities.length === 2 && (visualizationType === 'Line' || visualizationType === 'Area')"
        >
          <input type="checkbox" v-model="showGapFill" /> Fill gap
        </label>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary ms-auto"
          :disabled="!subfieldType"
          @click="downloadChart"
        >
          Download PNG
        </button>
      </div>
    </div>

    <div v-if="visualizationType !== 'Radar' && !subfieldType" class="text-white text-center py-5">
      Select a metric above to see the chart.
    </div>
    <component v-else ref="chartRef" :is="chartComponent" :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped src="@/assets/styles/components/MetricChart.scss"></style>