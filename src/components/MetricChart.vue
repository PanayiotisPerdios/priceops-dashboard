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
    const activeElements = chart.tooltip?._active;
 
    // Nothing hovered, or this chart has no y-scale (e.g. Pie/Radar) -> draw nothing
    if (!activeElements?.length || !chart.scales?.y) {
      return;
    }
 
    const { ctx, chartArea } = chart;
    const x = activeElements[0].element.x;
 
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};
ChartJS.register(crosshairPlugin);

const props = defineProps({
  // Records to visualize: [{ id, name, color, ...numeric fields }]
  records: { type: Array, required: true },
 
  // Plottable numeric fields: [{ id: 'effective_price_hr', name: 'Price / hr' }, ...]
  columns: {
    type: Array,
    default: function () {
      return [];
    },
  },
});

const emit = defineEmits(['select']);

const CHART_TYPES = ['Bar', 'Line', 'Pie', 'Radar', 'Scatter'];

const visualizationType = ref('Bar');

const subfieldType = ref(props.columns[0]?.id ?? null);

const xField = ref(props.columns[0]?.id ?? null);
const yField = ref(props.columns[1]?.id ?? props.columns[0]?.id ?? null);

const sortDir = ref('asc'); // 'asc' | 'desc' | 'name'
const showExtremes = ref(true);
const showAverage = ref(false);
const selectedId = ref(null);
const chartRef = ref(null);

const isCartesian = computed(function () {
  return visualizationType.value === 'Bar';
});

const isMultiMetric = computed(function () {
  return ['Line', 'Radar'].includes(visualizationType.value);
});

const chartComponent = computed(function () {
  switch (visualizationType.value) {
    case 'Line':
      return Line;
    case 'Pie':
      return Pie;
    case 'Radar':
      return Radar;
    case 'Scatter':
      return Scatter;
    case 'Bar':
    default:
      return Bar;
  }
});

const selectedRecord = computed(function () {
  return props.records.find(function (record) {
    return record.id === selectedId.value;
  });
});

const PALETTE = ['#4ade80', '#1e44b9', '#ca309e', '#f59e0b', '#6366f1', '#f97316'];
const HIGHLIGHT = '#fbbf24';
const SELECTED = '#ffffff';

function colorFor(index) {
  return props.records[index]?.color || PALETTE[index % PALETTE.length];
}

function displayColorFor(record, index) {
  if (record.id === selectedId.value) {
    return SELECTED;
  }
  return colorFor(index);
}

function valueFor(record, fieldId) {
  return record?.[fieldId] ?? null;
}

function fieldName(fieldId) {
  const column = props.columns.find(function (c) {
    return c.id === fieldId;
  });
  return column?.name ?? fieldId;
}

const PX_PER_BAR = 32;
const MAX_LEGEND_ITEMS = 12;
const isLarge = computed(function () {
  return props.records.length > 20;
});

// Bar gets a minimum width per bar; the wrapper scrolls horizontally instead of squashing
const canvasWrapStyle = computed(function () {
  if (visualizationType.value !== 'Bar') {
    return {};
  }
  return { width: `max(100%, ${props.records.length * PX_PER_BAR}px)` };
});

const showLegend = computed(function () {
  // Bar and Scatter always show it
  if (visualizationType.value === 'Bar' || visualizationType.value === 'Scatter') {
    return true;
  }
  // Line / Radar / Pie: only when it won't be overwhelming
  return props.records.length <= MAX_LEGEND_ITEMS;
});

function truncate(label, maxLength = 18) {
  const text = String(label ?? '');

  if (text.length > maxLength) {
    return text.slice(0, maxLength - 1) + '…';
  }
  return text;
}

const sortedRecords = computed(function () {
  const records = [...props.records];
 
  if (sortDir.value === 'name') {
    return records.sort(function (a, b) {
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }
 
  return records.sort(function (a, b) {
    const aValue = valueFor(a, subfieldType.value) ?? 0;
    const bValue = valueFor(b, subfieldType.value) ?? 0;
 
    if (sortDir.value === 'asc') {
      return aValue - bValue;
    }
    return bValue - aValue;
  });
});

function extremesOf(values) {
  const valid = [];
  values.forEach(function (value, index) {
    if (value != null) {
      valid.push([value, index]);
    }
  });
 
  if (valid.length === 0) {
    return { min: -1, max: -1 };
  }
 
  let min = valid[0];
  let max = valid[0];
 
  for (const pair of valid) {
    if (pair[0] < min[0]) {
      min = pair;
    }
    if (pair[0] > max[0]) {
      max = pair;
    }
  }
 
  return { min: min[1], max: max[1] };
}

const indexById = computed(function () {
  const map = new Map();
  props.records.forEach(function (record, index) {
    map.set(record.id, index);
  });
  return map;
});

function computeFieldRanges() {
  const ranges = {};
 
  for (const field of props.columns) {
    const values = [];
    for (const record of props.records) {
      const value = valueFor(record, field.id);
      if (value != null) {
        values.push(value);
      }
    }
 
    if (values.length > 0) {
      ranges[field.id] = { min: Math.min(...values), max: Math.max(...values) };
    } else {
      ranges[field.id] = null;
    }
  }
 
  return ranges;
}

function normalizeToPercent(ranges, fieldId, value, valueWhenMissing) {
  const range = ranges[fieldId];
 
  if (value == null || !range) {
    return valueWhenMissing;
  }
  if (range.max === range.min) {
    return 100;
  }
  return ((value - range.min) / (range.max - range.min)) * 100;
}

function barColorFor(record, position, minIndex, maxIndex) {
  if (record.id === selectedId.value) {
    return SELECTED;
  }
 
  const isExtreme = position === minIndex || position === maxIndex;
  if (showExtremes.value && isExtreme) {
    return HIGHLIGHT;
  }
 
  return colorFor(indexById.value.get(record.id));
}
 
function buildBarDataset() {
  const records = sortedRecords.value;
  const values = records.map(function (record) {
    return valueFor(record, subfieldType.value);
  });
 
  const { min, max } = extremesOf(values);
 
  // Average of the values that exist (0 if none)
  const validValues = values.filter(function (v) {
    return v != null;
  });
  let average = 0;
  if (validValues.length > 0) {
    const total = validValues.reduce(function (a, b) {
      return a + b;
    }, 0);
    average = total / validValues.length;
  }
 
  const datasets = [{
    label: fieldName(subfieldType.value),
    data: values,
    backgroundColor: records.map(function (record, position) {
      return barColorFor(record, position, min, max);
    }),
    maxBarThickness: 90,
    order: 1,
  }];
 
  // Optional dashed average line drawn over the bars
  if (showAverage.value) {
    datasets.push({
      type: 'line',
      label: 'Average',
      data: records.map(function () {
        return average;
      }),
      borderColor: 'rgba(255,255,255,0.6)',
      borderDash: [6, 4],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      order: 0,
    });
  }
 
  return {
    labels: records.map(function (record) {
      return record.name ?? record.id;
    }),
    datasets: datasets,
  };
}
 
function buildLineDataset() {
  const ranges = computeFieldRanges();
 
  return {
    labels: props.columns.map(function (field) {
      return field.name;
    }),
    datasets: props.records.map(function (record, index) {
      const isSelected = record.id === selectedId.value;
      const color = displayColorFor(record, index);
 
      return {
        label: record.name ?? record.id,
        data: props.columns.map(function (field) {
          return normalizeToPercent(ranges, field.id, valueFor(record, field.id), null);
        }),
        borderColor: color,
        backgroundColor: color + '33',   // same color, ~20% opacity
        borderWidth: isSelected ? 3 : 2,
        pointRadius: 4,
        tension: 0.25,
        fill: false,
      };
    }),
  };
}
 
function buildPieDataset() {
  return {
    labels: props.records.map(function (record) {
      return record.name ?? record.id;
    }),
    datasets: [{
      label: fieldName(subfieldType.value),
      data: props.records.map(function (record) {
        return valueFor(record, subfieldType.value);
      }),
      backgroundColor: props.records.map(function (record, index) {
        return displayColorFor(record, index);
      }),
    }],
  };
}
 
function buildScatterDataset() {
  // One point per record that has BOTH an x and a y value
  const points = [];
  for (const record of props.records) {
    const x = valueFor(record, xField.value);
    const y = valueFor(record, yField.value);
 
    if (x != null && y != null) {
      points.push({ x: x, y: y, _label: record.name ?? record.id, _id: record.id });
    }
  }
 
  return {
    datasets: [{
      label: `${fieldName(xField.value)} vs ${fieldName(yField.value)}`,
      data: points,
      // NOTE: colors are indexed by position in props.records, not by position in `points`
      backgroundColor: props.records.map(function (record, index) {
        return displayColorFor(record, index);
      }),
      // Selected point is drawn larger
      pointRadius: function (context) {
        if (context.raw?._id === selectedId.value) {
          return 9;
        }
        return 6;
      },
    }],
  };
}
 
// One polygon per record across all fields (normalized 0-100).
// Missing values count as 0.
function buildRadarDataset() {
  const ranges = computeFieldRanges();
 
  return {
    labels: props.columns.map(function (field) {
      return field.name;
    }),
    datasets: props.records.map(function (record, index) {
      const isSelected = record.id === selectedId.value;
      const color = displayColorFor(record, index);
 
      return {
        label: record.name ?? record.id,
        data: props.columns.map(function (field) {
          return normalizeToPercent(ranges, field.id, valueFor(record, field.id), 0);
        }),
        borderColor: color,
        backgroundColor: color + '2a',   // same color, ~16% opacity
        pointBackgroundColor: color,
        borderWidth: isSelected ? 3 : 1.5,
      };
    }),
  };
}
 
// Pick the right builder for the current chart type
const chartData = computed(function () {
  switch (visualizationType.value) {
    case 'Radar':
      return buildRadarDataset();
    case 'Line':
      return buildLineDataset();
    case 'Pie':
      return buildPieDataset();
    case 'Scatter':
      return buildScatterDataset();
    default:
      return buildBarDataset();
  }
});
 
function handleChartClick(event, elements) {
  if (!elements?.length) {
    return;
  }
 
  const clicked = elements[0];
  let record = null;
 
  // What a click "means" depends on how each chart type lays out its data
  switch (visualizationType.value) {
    case 'Scatter': {
      // Each point carries its record id
      const point = chartData.value.datasets[clicked.datasetIndex]?.data[clicked.index];
      record = props.records.find(function (r) {
        return r.id === point?._id;
      });
      break;
    }
    case 'Bar':
      // Bars follow the sorted order
      record = sortedRecords.value[clicked.index];
      break;
    case 'Pie':
      record = props.records[clicked.index];
      break;
    case 'Line':
    case 'Radar':
      // One dataset per record
      record = props.records[clicked.datasetIndex];
      break;
  }
 
  if (!record) {
    return;
  }
 
  // Clicking the selected record again deselects it
  if (selectedId.value === record.id) {
    selectedId.value = null;
  } else {
    selectedId.value = record.id;
  }
 
  emit('select', selectedId.value ? record : null);
}
 
function interactionOptions() {
  const type = visualizationType.value;
 
  if (type === 'Radar' || type === 'Pie') {
    return {};
  }
  if (type === 'Scatter') {
    return { mode: 'nearest', intersect: true };
  }
  // Bar and Line: highlight everything at the hovered x position
  return { mode: 'index', intersect: false };
}
 

function onLegendClick(event, legendItem, legend) {
  const chart = legend.chart;
  const index = legendItem.datasetIndex;
 
  if (event.native?.shiftKey) {
    chart.data.datasets.forEach(function (_dataset, i) {
      chart.getDatasetMeta(i).hidden = i !== index;
    });
  } else {
    const meta = chart.getDatasetMeta(index);
    if (meta.hidden === null) {
      meta.hidden = !chart.data.datasets[index].hidden;
    } else {
      meta.hidden = !meta.hidden;
    }
  }
 
  chart.update();
}
 
function tooltipLabel(context) {
  const type = visualizationType.value;
 
  if (type === 'Pie') {
    const total = context.dataset.data.reduce(function (a, b) {
      return a + b;
    }, 0);
    const percent = total ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
    return `${context.label}: ${context.parsed} (${percent}%)`;
  }
 
  if (type === 'Scatter') {
    return `${context.raw._label}: (${context.raw.x}, ${context.raw.y})`;
  }
 
  if (type === 'Line') {
    return `${context.dataset.label}: ${context.parsed.y?.toFixed(1)}%`;
  }
 
  return undefined;
}
 

function xTickLabel(value) {
  return truncate(this.getLabelForValue(value));
}
 
function scaleOptions() {
  const type = visualizationType.value;
  const isScatter = type === 'Scatter';
 
  // Pie has no axes
  if (type === 'Pie') {
    return {};
  }
 
  // Radar has a single radial axis
  if (type === 'Radar') {
    return {
      r: {
        angleLines: { color: 'rgba(255,255,255,0.12)' },
        grid: { color: 'rgba(255,255,255,0.12)' },
        pointLabels: { color: '#e5e7ea' },
        ticks: { display: false, backdropColor: 'transparent' },
      },
    };
  }
 
  // Bar, Line and Scatter: normal x / y axes
  return {
    x: {
      type: isScatter ? 'linear' : 'category',
      title: isScatter ? { display: true, text: fieldName(xField.value), color: 'white' } : undefined,
      ticks: {
        color: 'white',
        autoSkip: !isLarge.value,
        maxRotation: isLarge.value ? 90 : 45,
        minRotation: isLarge.value ? 90 : 0,
        callback: isScatter ? undefined : xTickLabel,
      },
    },
    y: {
      title: isScatter ? { display: true, text: fieldName(yField.value), color: 'white' } : undefined,
      ticks: { color: 'white' },
    },
  };
}
 
const chartOptions = computed(function () {
  // Skip animation for big datasets to keep it responsive
  let animation = { duration: 700, easing: 'easeOutQuart' };
  if (props.records.length > 150) {
    animation = false;
  }
 
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: animation,
    onClick: handleChartClick,
    interaction: interactionOptions(),
    plugins: {
      legend: {
        display: showLegend.value,
        labels: { color: 'white' },
        onClick: onLegendClick,
      },
      tooltip: {
        callbacks: { label: tooltipLabel },
      },
    },
    scales: scaleOptions(),
  };
});
 

function downloadChart() {
  const canvas = chartRef.value?.$el;
  if (!canvas?.toDataURL) {
    return;
  }
 
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${subfieldType.value || visualizationType.value}-chart.png`;
  link.click();
}
 
watch(
  function () {
    return props.records;
  },
  function () {
    selectedId.value = null;
  }
);

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

        <select v-else-if="!isMultiMetric" class="form-select custom-form-select" style="width: 200px" v-model="subfieldType">
          <option :value="null" disabled>Select a metric</option>
          <option v-for="field in columns" :key="field.id" :value="field.id">{{ field.name }}</option>
        </select>

        <select v-if="isCartesian" class="form-select custom-form-select" style="width: 150px" v-model="sortDir">
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
      <div class="chart-scroll">
        <div class="chart-canvas-wrap" :style="canvasWrapStyle">
          <component ref="chartRef" :is="chartComponent" :data="chartData" :options="chartOptions" />
        </div>
      </div>  
      <div v-if="selectedId" class="text-white-50 small mt-2">
        Selected: {{ records.find(r => r.id === selectedId)?.name }} — click again to deselect.
      </div>
    </template>
  </div>
</template>

<style scoped src="@/assets/styles/components/MetricChart.scss"></style>