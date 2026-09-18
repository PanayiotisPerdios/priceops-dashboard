<script setup>
import { ref, computed, watch } from 'vue';
import {
  Chart as ChartJS, Title, Tooltip, Legend,
  LineElement, BarElement, PointElement, ArcElement,
  CategoryScale, LinearScale, RadialLinearScale,
  LineController, BarController, PieController, RadarController, ScatterController
} from 'chart.js'
import { Line, Bar, Pie, Radar, Scatter } from 'vue-chartjs'

ChartJS.register(
  Title, Tooltip, Legend,
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
  // Records to visualize: [{ id, name, color, ...numeric fields }]
  records: { type: Array, required: true },
  // Plottable numeric fields: [{ id: 'effective_price_hr', name: 'Price / hr' }, ...]
  columns: { type: Array, default: () => [] },
});

const emit = defineEmits(['select']);

const visualizationType = ref('Bar');
const subfieldType = ref(props.columns[0]?.id ?? null);
const xField = ref(props.columns[0]?.id ?? null);
const yField = ref(props.columns[1]?.id ?? props.columns[0]?.id ?? null);
const sortDir = ref('asc'); // 'asc' | 'desc' | 'name'
const showExtremes = ref(true);
const showAverage = ref(false);
const selectedId = ref(null);
const chartRef = ref(null);

const CHART_TYPES = ['Bar', 'Line', 'Pie', 'Radar', 'Scatter'];
const isCartesian = computed(() => visualizationType.value === 'Bar');
const isMultiMetric = computed(() => ['Line', 'Radar'].includes(visualizationType.value));

const chartComponent = computed(() => {
  switch (visualizationType.value) {
    case 'Line': return Line;
    case 'Pie': return Pie;
    case 'Radar': return Radar;
    case 'Scatter': return Scatter;
    case 'Bar':
    default: return Bar;
  }
});

const PALETTE = ['#4ade80', '#1e44b9', '#ca309e', '#f59e0b', '#6366f1', '#f97316'];
const HIGHLIGHT = '#fbbf24';

function colorFor(index) {
  return props.records[index]?.color || PALETTE[index % PALETTE.length];
}

function valueFor(record, fieldId) {
  return record?.[fieldId] ?? null;
}

function fieldName(fieldId) {
  return props.columns.find(c => c.id === fieldId)?.name ?? fieldId;
}

// Bar/Line share a sortable view of the records so "trend" charts read meaningfully
const sortedRecords = computed(() => {
  const arr = [...props.records];
  if (sortDir.value === 'name') {
    return arr.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }
  return arr.sort((a, b) => {
    const av = valueFor(a, subfieldType.value) ?? 0;
    const bv = valueFor(b, subfieldType.value) ?? 0;
    return sortDir.value === 'asc' ? av - bv : bv - av;
  });
});

function extremesOf(values) {
  const valid = values.map((v, i) => [v, i]).filter(([v]) => v != null);
  if (!valid.length) return { min: -1, max: -1 };
  let min = valid[0], max = valid[0];
  for (const pair of valid) {
    if (pair[0] < min[0]) min = pair;
    if (pair[0] > max[0]) max = pair;
  }
  return { min: min[1], max: max[1] };
}

function buildBarDataset() {
  const recs = sortedRecords.value;
  const values = recs.map(r => valueFor(r, subfieldType.value));
  const { min, max } = extremesOf(values);
  const validValues = values.filter(v => v != null);
  const avg = validValues.length ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;

  const datasets = [{
    label: fieldName(subfieldType.value),
    data: values,
    backgroundColor: recs.map((r, i) =>
      r.id === selectedId.value ? '#ffffff' : (showExtremes.value && (i === min || i === max)) ? HIGHLIGHT : colorFor(props.records.indexOf(r))
    ),
    order: 1,
  }];

  if (showAverage.value) {
    datasets.push({
      type: 'line',
      label: 'Average',
      data: recs.map(() => avg),
      borderColor: 'rgba(255,255,255,0.6)',
      borderDash: [6, 4],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      order: 0,
    });
  }

  return { labels: recs.map(r => r.name ?? r.id), datasets };
}

// Multi-metric profile per record — same normalization Radar uses, so the shared
// x-axis (fields) is comparable across units. Legend = record/provider name.
function buildLineDataset() {
  const ranges = {};
  props.columns.forEach(field => {
    const vals = props.records.map(r => valueFor(r, field.id)).filter(v => v != null);
    ranges[field.id] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
  });
  function normalize(fieldId, value) {
    const range = ranges[fieldId];
    if (value == null || !range) return null;
    if (range.max === range.min) return 100;
    return ((value - range.min) / (range.max - range.min)) * 100;
  }

  return {
    labels: props.columns.map(f => f.name),
    datasets: props.records.map((record, i) => ({
      label: record.name ?? record.id,
      data: props.columns.map(field => normalize(field.id, valueFor(record, field.id))),
      borderColor: record.id === selectedId.value ? '#ffffff' : colorFor(i),
      backgroundColor: (record.id === selectedId.value ? '#ffffff' : colorFor(i)) + '33',
      borderWidth: record.id === selectedId.value ? 3 : 2,
      pointRadius: 4,
      tension: 0.25,
      fill: false,
    })),
  };
}

function buildPieDataset() {
  return {
    labels: props.records.map(r => r.name ?? r.id),
    datasets: [{
      label: fieldName(subfieldType.value),
      data: props.records.map(r => valueFor(r, subfieldType.value)),
      backgroundColor: props.records.map((r, i) => r.id === selectedId.value ? '#ffffff' : colorFor(i)),
    }],
  };
}

function buildScatterDataset() {
  return {
    datasets: [{
      label: `${fieldName(xField.value)} vs ${fieldName(yField.value)}`,
      data: props.records
        .map((r, i) => ({ x: valueFor(r, xField.value), y: valueFor(r, yField.value), _label: r.name ?? r.id, _id: r.id }))
        .filter(p => p.x != null && p.y != null),
      backgroundColor: props.records.map((r, i) => r.id === selectedId.value ? '#ffffff' : colorFor(i)),
      pointRadius: (ctx) => ctx.raw?._id === selectedId.value ? 9 : 6,
    }],
  };
}

function buildRadarDataset() {
  const ranges = {};
  props.columns.forEach(field => {
    const vals = props.records.map(r => valueFor(r, field.id)).filter(v => v != null);
    ranges[field.id] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
  });
  function normalize(fieldId, value) {
    const range = ranges[fieldId];
    if (value == null || !range) return 0;
    if (range.max === range.min) return 100;
    return ((value - range.min) / (range.max - range.min)) * 100;
  }
  return {
    labels: props.columns.map(f => f.name),
    datasets: props.records.map((record, i) => ({
      label: record.name ?? record.id,
      data: props.columns.map(field => normalize(field.id, valueFor(record, field.id))),
      borderColor: record.id === selectedId.value ? '#ffffff' : colorFor(i),
      backgroundColor: (record.id === selectedId.value ? '#ffffff' : colorFor(i)) + '2a',
      pointBackgroundColor: record.id === selectedId.value ? '#ffffff' : colorFor(i),
      borderWidth: record.id === selectedId.value ? 3 : 1.5,
    })),
  };
}

const chartData = computed(() => {
  if (visualizationType.value === 'Radar') return buildRadarDataset();
  if (visualizationType.value === 'Line') return buildLineDataset();
  if (visualizationType.value === 'Pie') return buildPieDataset();
  if (visualizationType.value === 'Scatter') return buildScatterDataset();
  return buildBarDataset();
});

function handleChartClick(event, elements) {
  if (!elements?.length) return;
  const el = elements[0];
  let record = null;
  if (visualizationType.value === 'Scatter') {
    const point = chartData.value.datasets[el.datasetIndex]?.data[el.index];
    record = props.records.find(r => r.id === point?._id);
  } else if (visualizationType.value === 'Bar') {
    record = sortedRecords.value[el.index];
  } else if (visualizationType.value === 'Pie') {
    record = props.records[el.index];
  } else if (visualizationType.value === 'Line' || visualizationType.value === 'Radar') {
    record = props.records[el.datasetIndex];
  }
  if (!record) return;
  selectedId.value = selectedId.value === record.id ? null : record.id;
  emit('select', selectedId.value ? record : null);
}

const chartOptions = computed(() => {
  const isRadar = visualizationType.value === 'Radar';
  const isPie = visualizationType.value === 'Pie';
  const isScatter = visualizationType.value === 'Scatter';
  const isLine = visualizationType.value === 'Line';

  return {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    interaction: isRadar || isPie
      ? {}
      : isScatter
      ? { mode: 'nearest', intersect: true }
      : { mode: 'index', intersect: false },
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
            if (isPie) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
              return `${context.label}: ${context.parsed} (${pct}%)`;
            }
            if (isScatter) {
              return `${context.raw._label}: (${context.raw.x}, ${context.raw.y})`;
            }
            if (isLine) {
              return `${context.dataset.label}: ${context.parsed.y?.toFixed(1)}%`;
            }
            return undefined;
          },
        },
      },
    },
    scales: isPie
      ? {}
      : isRadar
      ? {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.12)' },
            grid: { color: 'rgba(255,255,255,0.12)' },
            pointLabels: { color: '#e5e7ea' },
            ticks: { display: false, backdropColor: 'transparent' },
          },
        }
      : {
          x: {
            type: isScatter ? 'linear' : 'category',
            title: isScatter ? { display: true, text: fieldName(xField.value), color: 'white' } : undefined,
            ticks: { color: 'white' },
          },
          y: {
            title: isScatter ? { display: true, text: fieldName(yField.value), color: 'white' } : undefined,
            ticks: { color: 'white' },
          },
        },
  };
});

function downloadChart() {
  const canvas = chartRef.value?.$el;
  if (!canvas?.toDataURL) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${subfieldType.value || visualizationType.value}-chart.png`;
  a.click();
}

// Reset selection when the underlying record set changes (e.g. filters change upstream)
watch(() => props.records, () => { selectedId.value = null; });
</script>

<template>
  <div class="metric-chart">
    <div class="chart-controls">
      <div class="d-flex gap-2 flex-wrap">
        <select class="form-select custom-form-select" style="width: 110px" v-model="visualizationType">
          <option v-for="t in CHART_TYPES" :key="t">{{ t }}</option>
        </select>

        <template v-if="visualizationType === 'Scatter'">
          <select class="form-select custom-form-select" style="width: 160px" v-model="xField">
            <option v-for="field in columns" :key="field.id" :value="field.id">X: {{ field.name }}</option>
          </select>
          <select class="form-select custom-form-select" style="width: 160px" v-model="yField">
            <option v-for="field in columns" :key="field.id" :value="field.id">Y: {{ field.name }}</option>
          </select>
        </template>

        <select
          v-else-if="!isMultiMetric"
          class="form-select custom-form-select"
          style="width: 200px"
          v-model="subfieldType"
        >
          <option :value="null" disabled>Select a metric</option>
          <option v-for="field in columns" :key="field.id" :value="field.id">{{ field.name }}</option>
        </select>

        <select
          v-if="isCartesian"
          class="form-select custom-form-select"
          style="width: 150px"
          v-model="sortDir"
        >
          <option value="asc">Sort: Value ↑</option>
          <option value="desc">Sort: Value ↓</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>
      
      <div class="d-flex align-items-center gap-3 flex-wrap chart-toggles" v-if="isCartesian">
        <label class="chart-toggle">
          <input type="checkbox" v-model="showExtremes" /> Highlight min/max
        </label>
        <label class="chart-toggle">
          <input type="checkbox" v-model="showAverage" /> Average line
        </label>
        <button type="button" class="btn btn-sm btn-outline-primary ms-auto" @click="downloadChart">
          Download PNG
        </button>
      </div>
      <button v-else type="button" class="btn btn-sm btn-outline-primary ms-auto" @click="downloadChart">
        Download PNG
      </button>
    </div>

    <div v-if="!records.length" class="text-white text-center py-5">No records to chart.</div>
    <template v-else>
      <component ref="chartRef" :is="chartComponent" :data="chartData" :options="chartOptions" />
      <div v-if="selectedId" class="text-white-50 small mt-2">
        Selected: {{ records.find(r => r.id === selectedId)?.name }} — click again to deselect.
      </div>
    </template>
  </div>
</template>

<style scoped src="@/assets/styles/components/MetricChart.scss"></style>