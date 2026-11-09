
<script setup>
import { ref, computed, watch } from 'vue';
import { policyPresets, DEFAULT_WEIGHTS } from '@/data/policyPresets';
import { usePricingData } from '@/composables/usePricingData';
import { useScenarioScoring } from '@/composables/useScenarioScoring';
import { SCENARIO_CRITERIA, presetLabels, EVAL_TOP_N, QUADRANT_LIMIT } from '@/data/constants';
import { colorFor, paretoFrontier2D, fmt } from '@/utils/calculationServices';
import { prepareEvaluationRecords, cheapestRegionPerSku, EVALUATION_SCOPES } from '@/utils/evaluationHelpers';
import { MAX_HOURS_PER_MONTH } from '@/utils/pricingCalculator';
import { usesOS } from '@/utils/usageSpec';

const { records, loading, error, sourceName } = usePricingData();

const domain = ref('Compute');
const subcategory = ref(null);
const regionGroup = ref('Europe');
const operatingSystem = ref(null);
const dbEngine = ref(null);
const storageClass = ref(null);
const deploymentOption = ref(null);
const pricingModel = ref('Standard');
const requireSpecs = ref(true);
const bestRegionOnly = ref(true);
const minVCpu = ref(4);
const minMemoryGiB = ref(16);
const hoursPerMonth = ref(730);
const storageGBMonths = ref(100);

const viewMode = ref('table');
const lastPreset = ref('balanced');
const expandedId = ref(null);

const domains = Object.keys(EVALUATION_SCOPES);

const inDomain = computed(() =>{ 
  return records.value.filter(row => row.ServiceCategory === domain.value);
});

function uniqueField(field) {
  const seen = new Set();
 
  for (const row of inDomain.value) {
    const value = row[field];
 
    if (value !== null && value !== undefined && value !== '') {
      seen.add(value);
    }
  }
 
  return [...seen].sort();
}

const subcategoryOptions = computed(() => uniqueField('ServiceSubcategory'));
const engineOptions = computed(() => uniqueField('DatabaseEngine'));
const regionOptions = computed(() => uniqueField('RegionGroup'));
const osOptions = computed(() => uniqueField('OperatingSystem'));
const pricingOptions = computed(() => uniqueField('PricingCategory'));


const isStorage = computed(() => domain.value === 'Storage');
const isDatabases = computed(() => domain.value === 'Databases');

const showOS = computed(() => usesOS({ ServiceCategory: domain.value }));

const activeCriteria = computed(() => {
  const criteria = SCENARIO_CRITERIA[domain.value];
 
  if (criteria === null || criteria === undefined) {
    return [];
  }
 
  return criteria;
});

function specFilter(value) {
  if (isStorage.value) {
    return null;
  }
 
  return value;
}

const poolBeforeDedupe = computed(() => prepareEvaluationRecords(records.value, {
  category: domain.value,
  subcategory: subcategory.value,
  regionGroup: regionGroup.value,
  operatingSystem: operatingSystem.value,
  dbEngine: dbEngine.value,
  storageClass: storageClass.value,
  deploymentOption: deploymentOption.value,
  pricingCategory: pricingModel.value,
  requireSpecs: requireSpecs.value,
  minVCpu: specFilter(minVCpu.value),
  minMemoryGiB: specFilter(minMemoryGiB.value),
  hoursPerMonth: hoursPerMonth.value,
  storageGBMonths: storageGBMonths.value
}));

const items = computed(() => {
  if (bestRegionOnly.value) {
    return cheapestRegionPerSku(poolBeforeDedupe.value);
  }
 
  return poolBeforeDedupe.value;
});

const presetNames = Object.keys(policyPresets);
const categoryWeights = ref({ ...DEFAULT_WEIGHTS });

function applyPreset(name) {
  const preset = policyPresets[name];
 
  if (preset === null || preset === undefined) {
    categoryWeights.value = { ...DEFAULT_WEIGHTS };
    return;
  }
 
  categoryWeights.value = { ...preset };
}

function selectPreset(name) { 
  lastPreset.value = name; 
  applyPreset(name); 
}

function setCategoryWeight(cat, value) { 
  categoryWeights.value = { ...categoryWeights.value, [cat]: value }; 
}

function weightOf(cat) {
  const weight = categoryWeights.value[cat];
 
  if (weight === null || weight === undefined) {
    return 0;
  }
 
  return weight;
}
 
function presetLabel(name) {
  const label = presetLabels[name];
 
  if (label === null || label === undefined) {
    return name;
  }
 
  return label;
}

function resetStaleSelections() {
  if (regionGroup.value !== null && !regionOptions.value.includes(regionGroup.value)) {
    regionGroup.value = null;
  }
 
  if (!pricingOptions.value.includes(pricingModel.value)) {
    if (pricingOptions.value.includes('Standard')) {
      pricingModel.value = 'Standard';
    } else if (pricingOptions.value.length > 0) {
      pricingModel.value = pricingOptions.value[0];
    } else {
      pricingModel.value = '';
    }
  }
}

function onDomainChange() {
  subcategory.value = null;
  dbEngine.value = null;
  operatingSystem.value = null;
  storageClass.value = null;
  deploymentOption.value = null;
  expandedId.value = null;
 
  resetStaleSelections();
 
  if (isStorage.value && storageClassOptions.value.includes('Standard')) {
    storageClass.value = 'Standard';
  }
 
  resetZoom();
}

watch(domain, onDomainChange);
watch(sourceName, onDomainChange);

const { categories, scored } = useScenarioScoring(items, activeCriteria, categoryWeights);

const topScored = computed(() => scored.value.slice(0, EVAL_TOP_N));

const bestPerProvider = computed(() => {
  const best = new Map();
 
  for (const item of scored.value) {
    if (item.score !== null && item.score !== undefined && !best.has(item.ServiceProviderName)) {
      best.set(item.ServiceProviderName, item);
    }
  }
 
  return [...best.values()];
});

const providerLegend = computed(() => {
  const seen = new Map();
 
  for (let index = 0; index < topScored.value.length; index++) {
    const item = topScored.value[index];
 
    if (!seen.has(item.ServiceProviderName)) {
      seen.set(item.ServiceProviderName, colorFor(item.ServiceProviderName, index));
    }
  }
 
  const legend = [];
 
  for (const [provider, color] of seen) {
    legend.push({ provider, color });
  }
 
  return legend;
});

function skuLabel(item) {
  return item.SkuName || item.SkuId;
}

function toggleExpanded(id) {
  if (expandedId.value === id) {
    expandedId.value = null;
  } else {
    expandedId.value = id;
  }
}

function expandIcon(id) {
  if (expandedId.value === id) {
    return '▲';
  }
 
  return '▼';
}

function scoreText(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
 
  return (value * 100).toFixed(1) + '%';
}

function breakdownPercent(item, cat) {
  const value = item.breakdown[cat];
 
  if (value === null || value === undefined) {
    return 0;
  }
 
  return value * 100;
}

const xCat = ref('Cost');
const yCat = ref('Performance');

watch(categories, values => {
  if (!values.includes(xCat.value)) {
    if (values.length > 0) {
      xCat.value = values[0];
    } else {
      xCat.value = 'Cost';
    }
  }
 
  if (!values.includes(yCat.value)) {
    if (values.length > 1) {
      yCat.value = values[1];
    } else if (values.length > 0) {
      yCat.value = values[0];
    } else {
      yCat.value = 'Cost';
    }
  }
}, { immediate: true });

const allPoints = computed(() => {
  const points = [];
 
  for (const item of scored.value) {
    const x = item.breakdown[xCat.value];
    const y = item.breakdown[yCat.value];
 
    if (x === null || x === undefined || y === null || y === undefined) {
      continue;
    }
 
    points.push({
      id: item.id,
      name: skuLabel(item),
      x,
      y,
      color: colorFor(item.ServiceProviderName, points.length)
    });
  }
 
  return points;
});

const paretoIds = computed(() => {
  const ids = new Set();
 
  for (const point of paretoFrontier2D(allPoints.value)) {
    ids.add(point.id);
  }
 
  return ids;
});

const quadrantPoints = computed(() => {
  const topIds = new Set();
  const topItems = scored.value.slice(0, QUADRANT_LIMIT);
 
  for (const item of topItems) {
    topIds.add(item.id);
  }
 
  const points = [];
 
  for (const point of allPoints.value) {
    if (topIds.has(point.id) || paretoIds.value.has(point.id)) {
      points.push(point);
    }
  }
 
  return points;
});

const quadrantAvailable = computed(() => {
  return quadrantPoints.value.length > 0 && xCat.value !== yCat.value;
});

const PAD = 48;
const SIZE = 640;
const PLOT = SIZE - PAD * 2;
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;

const svgEl = ref(null);
const zoom = ref(1);
const centerX = ref(0.5);
const centerY = ref(0.5);
const isDragging = ref(false);
const hoveredId = ref(null);
let lastPointer = { x: 0, y: 0 };

const span = computed(() => 1 / zoom.value);
const x0 = computed(() => centerX.value - span.value / 2);
const y0 = computed(() => centerY.value - span.value / 2);

function toSvgX(x) {
  return PAD + ((x - x0.value) / span.value) * PLOT;
}
 
function toSvgY(y) {
  return SIZE - PAD - ((y - y0.value) / span.value) * PLOT;
}

function shortName(name, max = 18) {
  if (name.length > max) {
    return name.slice(0, max - 1) + '…';
  }
 
  return name;
}
 
function labelAnchor(point) {
  if (toSvgX(point.x) > SIZE * 0.7) {
    return 'end';
  }
 
  return 'start';
}
 
function labelDx(point) {
  if (labelAnchor(point) === 'end') {
    return -10;
  }
 
  return 10;
}

function showLabel(point) {
  if (zoom.value >= 2) {
    return true;
  }
 
  if (paretoIds.value.has(point.id)) {
    return true;
  }
 
  return hoveredId.value === point.id;
}

function clampCenter() {
  const half = span.value / 2;
  
  centerX.value = Math.min(1 - half, Math.max(half, centerX.value));
  centerY.value = Math.min(1 - half, Math.max(half, centerY.value));
}

function pointerInfo(evt) {
  const rect = svgEl.value.getBoundingClientRect();
  const sx = ((evt.clientX - rect.left) * SIZE) / rect.width;
  const sy = ((evt.clientY - rect.top) * SIZE) / rect.height;
  const fx = (sx - PAD) / PLOT;
  const fy = (SIZE - PAD - sy) / PLOT;
 
  return {
    fx,
    fy,
    dx: x0.value + fx * span.value,
    dy: y0.value + fy * span.value
  };
}

function zoomAt(factor, evt) {
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * factor));
 
  if (newZoom === zoom.value) {
    return;
  }
 
  // Zoom around the middle, or around the pointer when there is an event.
  let fx = 0.5;
  let fy = 0.5;
  let dx = centerX.value;
  let dy = centerY.value;
 
  if (evt) {
    const info = pointerInfo(evt);
 
    fx = info.fx;
    fy = info.fy;
    dx = info.dx;
    dy = info.dy;
  }
 
  zoom.value = newZoom;
 
  const newSpan = 1 / newZoom;
 
  centerX.value = dx - fx * newSpan + newSpan / 2;
  centerY.value = dy - fy * newSpan + newSpan / 2;
  clampCenter();
}

function onWheel(evt) {
  if (evt.deltaY < 0) {
    zoomAt(1.25, evt);
  } else {
    zoomAt(1 / 1.25, evt);
  }
}

function resetZoom() {
  zoom.value = 1;
  centerX.value = 0.5;
  centerY.value = 0.5;
}

function startDrag(evt) {
  if (zoom.value <= 1) {
    return;
  }
  
  isDragging.value = true;
  lastPointer = { x: evt.clientX, y: evt.clientY };
}

function onDrag(evt) {
  if (!isDragging.value) {
    return;
  }
 
  const rect = svgEl.value.getBoundingClientRect();
  const dxSvg = ((evt.clientX - lastPointer.x) * SIZE) / rect.width;
  const dySvg = ((evt.clientY - lastPointer.y) * SIZE) / rect.height;
 
  centerX.value -= (dxSvg / PLOT) * span.value;
  centerY.value += (dySvg / PLOT) * span.value;
  clampCenter();
 
  lastPointer = { x: evt.clientX, y: evt.clientY };
}

function endDrag() {
  isDragging.value = false;
}

watch([xCat, yCat], resetZoom);
</script>

<template>
  <div class="page">
    <div class="p-4">
 
      <div v-if="loading" class="text-white-50">Loading pricing data…</div>
      <div v-else-if="error" class="text-danger">Could not load the pricing data: {{ error.message }}</div>
 
      <template v-else>
 
        <!-- Filters -->
        <div class="d-flex gap-3 mb-3 flex-wrap align-items-center">
 
          <div class="data-ex-form-cont">
            <label class="form-label text-white">Category</label>
            <select class="form-select custom-form-select" v-model="domain">
              <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont">
            <label class="form-label text-white">Subcategory</label>
            <select class="form-select custom-form-select" v-model="subcategory">
              <option :value="null">Any</option>
              <option v-for="s in subcategoryOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont">
            <label class="form-label text-white">Area</label>
            <select class="form-select custom-form-select" v-model="regionGroup">
              <option :value="null">Any</option>
              <option v-for="g in regionOptions" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
 
          <div v-if="showOS" class="data-ex-form-cont">
            <label class="form-label text-white">OS</label>
            <select class="form-select custom-form-select" v-model="operatingSystem">
              <option :value="null">Any</option>
              <option v-for="os in osOptions" :key="os" :value="os">{{ os }}</option>
            </select>
          </div>
 
          <div v-if="isDatabases" class="data-ex-form-cont">
            <label class="form-label text-white">DB engine</label>
            <select class="form-select custom-form-select" v-model="dbEngine">
              <option :value="null">Any</option>
              <option v-for="e in engineOptions" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
 
          <div v-if="isDatabases" class="data-ex-form-cont">
            <label class="form-label text-white">Deployment</label>
            <select class="form-select custom-form-select" v-model="deploymentOption">
              <option :value="null">Any</option>
              <option v-for="o in deploymentOptions" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>
 
          <div v-if="isStorage" class="data-ex-form-cont">
            <label class="form-label text-white">Storage class</label>
            <select class="form-select custom-form-select" v-model="storageClass">
              <option :value="null">Any</option>
              <option v-for="c in storageClassOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont">
            <label class="form-label text-white">Pricing category</label>
            <select class="form-select custom-form-select" v-model="pricingModel">
              <option v-for="m in pricingOptions" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont">
            <label class="form-label text-white">Hours / month</label>
            <input class="form-control" type="number" min="0" :max="MAX_HOURS_PER_MONTH" step="1" v-model.number="hoursPerMonth" />
          </div>
 
          <template v-if="!isStorage">
            <div class="data-ex-form-cont">
              <label class="form-label text-white">Min vCPU</label>
              <input class="form-control" type="number" min="0" step="1" v-model.number="minVCpu" />
            </div>
 
            <div class="data-ex-form-cont">
              <label class="form-label text-white">Min RAM (GiB)</label>
              <input class="form-control" type="number" min="0" step="1" v-model.number="minMemoryGiB" />
            </div>
          </template>
 
          <div v-else class="data-ex-form-cont">
            <label class="form-label text-white">Storage GB-months</label>
            <input class="form-control" type="number" min="0" step="1" v-model.number="storageGBMonths" />
          </div>
 
        </div>
 
        <div class="text-white-50 small mb-3">
          Comparing {{ EVALUATION_SCOPES[domain].priceComponent }} charges billed per {{ EVALUATION_SCOPES[domain].pricingUnit }} in USD. Monthly cost is calculated for the specified usage.
        </div>
 
        <!-- Presets, options, view mode -->
        <div class="d-flex gap-3 mb-3 flex-wrap align-items-center">
 
          <div class="btn-group">
            <button v-for="name in presetNames" :key="name" class="btn btn-outline-primary" :class="{ active: lastPreset === name }" @click="selectPreset(name)">
              {{ presetLabel(name) }}
            </button>
          </div>
 
          <div v-if="!isStorage" class="form-check text-white">
            <input id="req-specs" type="checkbox" class="form-check-input" v-model="requireSpecs" />
            <label for="req-specs" class="form-check-label">Known vCPU + memory only</label>
          </div>
 
          <div class="form-check text-white">
            <input id="best-region" type="checkbox" class="form-check-input" v-model="bestRegionOnly" />
            <label for="best-region" class="form-check-label">Cheapest region per SKU (within matching configuration)</label>
          </div>
 
          <div class="btn-group ms-auto">
            <button class="btn btn-outline-light" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">Table</button>
            <button class="btn btn-outline-light" :class="{ active: viewMode === 'quadrant' }" @click="viewMode = 'quadrant'">Quadrant</button>
            <button class="btn btn-outline-light" :class="{ active: viewMode === 'breakdown' }" @click="viewMode = 'breakdown'">Breakdown</button>
          </div>
 
        </div>
 
        <!-- Criteria weights -->
        <div class="weight-panel mb-4">
          <div class="weight-panel-title">Criteria weights</div>
 
          <div class="weight-row" v-for="cat in categories" :key="cat">
            <label class="weight-label">{{ cat }}</label>
            <input type="range" class="form-range" min="0" max="1" step="0.05" :value="weightOf(cat)" @input="setCategoryWeight(cat, Number($event.target.value))"/>
            <span class="weight-value">{{ (weightOf(cat) * 100).toFixed(0) }}%</span>
          </div>
        </div>
 
        <!-- Best option per provider -->
        <div v-if="bestPerProvider.length" class="d-flex gap-3 flex-wrap mb-4">
          <div v-for="item in bestPerProvider" :key="item.ServiceProviderName" class="border rounded p-2 text-white small" style="min-width: 260px">
            <div class="text-white-50">Best {{ item.ServiceProviderName }} option</div>
            <div class="fw-bold">{{ skuLabel(item) }}</div>
            <div>{{ item.RegionId }} · {{ fmt(item.monthlyCost) }} USD/month · {{ item.VCpu }} vCPU / {{ item.MemoryGiB }} GB</div>
            <div>Score {{ scoreText(item.score) }}</div>
          </div>
        </div>
 
        <div class="text-white-50 small mb-2">
          {{ items.length.toLocaleString() }} candidates<span v-if="items.length > EVAL_TOP_N"> · showing the top {{ EVAL_TOP_N }}</span>
        </div>
 
        <div v-if="!items.length" class="text-white-50">No records match these filters.</div>
 
        <!-- Table view -->
        <div v-else-if="viewMode === 'table'" class="evaluation-container">
          <div class="evaluation-table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Provider</th>
                  <th>SKU</th>
                  <th>Region</th>
                  <th>Monthly cost (USD)</th>
                  <th>Score</th>
                  <th></th>
                </tr>
              </thead>
 
              <tbody>
                <template v-for="(item, index) in topScored" :key="item.id">
 
                  <tr class="rank-row" @click="toggleExpanded(item.id)">
                    <td>{{ index + 1 }}</td>
                    <td>{{ item.ServiceProviderName }}</td>
                    <td>{{ skuLabel(item) }}</td>
                    <td>{{ item.RegionId }}</td>
                    <td>{{ fmt(item.monthlyCost) }}</td>
                    <td>{{ scoreText(item.score) }}</td>
                    <td class="text-end text-white-50">{{ expandIcon(item.id) }}</td>
                  </tr>
 
                  <tr v-if="expandedId === item.id" class="breakdown-row">
                    <td colspan="7">
                      <div class="text-white-50 small mb-2">
                        {{ item.RegionGroup }} · {{ item.PricingUnit }} · {{ item.PriceComponent }}
                        <template v-if="!isStorage"> · {{ item.VCpu }} vCPU · {{ item.MemoryGiB }} GiB ·
                          {{ fmt(item.costPerVCpu) }} USD/month/vCPU · {{ fmt(item.costPerMemoryGiB) }} USD/month/GiB</template>
                      </div>
 
                      <div class="breakdown-bars">
                        <div v-for="cat in categories" :key="cat" class="breakdown-bar-item">
                          <span class="breakdown-bar-label">{{ cat }}</span>
                          <div class="progress">
                            <div class="progress-bar" :style="{ width: breakdownPercent(item, cat) + '%', backgroundColor: colorFor(item.ServiceProviderName, index) }"></div>
                          </div>
                          <span class="breakdown-bar-value">{{ scoreText(item.breakdown[cat]) }}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
 
                </template>
              </tbody>
            </table>
          </div>
        </div>
 
        <!-- Quadrant view -->
        <div v-else-if="viewMode === 'quadrant'" class="quadrant-container">
          <div class="d-flex gap-3 mb-2 align-items-center text-white">
            <label class="small">X axis</label>
            <select class="form-select form-select-sm w-auto" v-model="xCat">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
 
            <label class="small">Y axis</label>
            <select class="form-select form-select-sm w-auto" v-model="yCat">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
 
          <div class="provider-legend">
            <div v-for="entry in providerLegend" :key="entry.provider" class="provider-legend-item">
              <span class="provider-legend-dot" :style="{ backgroundColor: entry.color }"></span>
              {{ entry.provider }}
            </div>
          </div>
 
          <div v-if="!quadrantAvailable" class="text-white-50">
            Not enough comparable category scores to plot two distinct axes.
          </div>
 
          <div v-else class="quadrant-chart-wrap">
            <div class="quadrant-zoom-controls">
              <button type="button" class="btn btn-sm btn-outline-light" :disabled="zoom >= MAX_ZOOM" @click="zoomAt(1.5)">+</button>
              <button type="button" class="btn btn-sm btn-outline-light" :disabled="zoom <= MIN_ZOOM" @click="zoomAt(1 / 1.5)">−</button>
              <button type="button" class="btn btn-sm btn-outline-light" :disabled="zoom === 1" @click="resetZoom">Reset</button>
              <span class="text-white-50 small">×{{ zoom.toFixed(1) }}</span>
            </div>
 
            <svg ref="svgEl" :viewBox="`0 0 ${SIZE} ${SIZE}`" class="quadrant-svg" :class="{ 'is-zoomed': zoom > 1, 'is-dragging': isDragging }"
              @wheel.prevent="onWheel"
              @mousedown="startDrag"
              @mousemove="onDrag"
              @mouseup="endDrag"
              @mouseleave="endDrag"
            >
 
              <defs>
                <clipPath id="quadrant-clip">
                  <rect :x="PAD - 10" :y="PAD - 10" :width="PLOT + 20" :height="PLOT + 20" />
                </clipPath>
              </defs>
 
              <g clip-path="url(#quadrant-clip)">
                <line :x1="PAD" :y1="toSvgY(0.5)" :x2="SIZE - PAD" :y2="toSvgY(0.5)" class="quadrant-gridline" />
                <line :x1="toSvgX(0.5)" :y1="PAD" :x2="toSvgX(0.5)" :y2="SIZE - PAD" class="quadrant-gridline" />
 
                <g v-for="p in quadrantPoints" :key="p.id" @mouseenter="hoveredId = p.id" @mouseleave="hoveredId = null">
                  <title>{{ p.name }}</title>
 
                  <circle :cx="toSvgX(p.x)" :cy="toSvgY(p.y)" :r="paretoIds.has(p.id) ? 8 : 6" :fill="p.color" :class="{ 'pareto-point': paretoIds.has(p.id) }"/>
 
                  <text v-if="showLabel(p)" :x="toSvgX(p.x) + labelDx(p)" :y="toSvgY(p.y) + 4" :text-anchor="labelAnchor(p)" class="quadrant-point-label">
                    {{ hoveredId === p.id ? p.name : shortName(p.name) }}
                  </text>
                </g>
              </g>
 
              <rect :x="PAD" :y="PAD" :width="PLOT" :height="PLOT" class="quadrant-border" />
 
              <text :x="SIZE / 2" :y="SIZE - 8" class="quadrant-axis-label" text-anchor="middle">{{ xCat }} score →</text>
              <text :x="16" :y="SIZE / 2" class="quadrant-axis-label" text-anchor="middle" :transform="`rotate(-90 16 ${SIZE / 2})`">{{ yCat }} score →</text>
            </svg>
 
            <div class="quadrant-legend text-white-50 small">
              Highlighted (outlined) points sit on the Pareto frontier — no other option beats them on both {{ xCat.toLowerCase() }} and {{ yCat.toLowerCase() }} at once.
              Showing the top {{ QUADRANT_LIMIT }} ranked options plus every Pareto point.
              Scroll to zoom, drag to pan, hover a point to see its name.
            </div>
          </div>
        </div>
 
        <!-- Breakdown view -->
        <div v-else class="breakdown-grid">
 
          <div class="provider-legend">
            <div v-for="entry in providerLegend" :key="entry.provider" class="provider-legend-item">
              <span class="provider-legend-dot" :style="{ backgroundColor: entry.color }"></span>
              {{ entry.provider }}
            </div>
          </div>
 
          <div v-for="cat in categories" :key="cat" class="breakdown-grid-row">
            <div class="breakdown-grid-label">{{ cat }}</div>
 
            <div class="breakdown-grid-bars">
              <div v-for="(item, index) in topScored" :key="item.id" class="breakdown-grid-bar-item">
                <span class="breakdown-grid-name">{{ skuLabel(item) }}</span>
 
                <div class="progress">
                  <div class="progress-bar":style="{ width: breakdownPercent(item, cat) + '%', backgroundColor: colorFor(item.ServiceProviderName, index) }">
                  </div>
                </div>
 
                <span class="breakdown-grid-value">{{ scoreText(item.breakdown[cat]) }}</span>
              </div>
            </div>
          </div>
 
        </div>
 
      </template>
    </div>
  </div>
</template>
 
<style scoped src="@/assets/styles/views/Evaluation.scss"></style>
 