<script setup>
import { ref, computed, watch } from 'vue';
import { policyPresets, DEFAULT_WEIGHTS } from '@/data/policyPresets';
import { usePricingData } from '@/composables/usePricingData';
import { useScenarioScoring } from '@/composables/useScenarioScoring';
 
import {
  SCENARIO_CRITERIA as CRITERIA, presetLabels, SUBCATEGORY_LABELS, REGION_GROUP_LABELS,
  PRICING_MODEL_LABELS, DEFAULT_SUBCATEGORY, EVAL_TOP_N, QUADRANT_LIMIT,
} from '@/data/constants';
import { colorFor, paretoFrontier2D, uniqSorted, cheapestPerSku, fmt } from '@/utils/calculationServices';

const { records, loading, error, options } = usePricingData();

const domain = ref(null);
const subcategory = ref(DEFAULT_SUBCATEGORY);
const regionGroup = ref(null);
const operatingSystem = ref(null);
const dbEngine = ref(null);
const pricingModel = ref('on_demand');
const requireSpecs = ref(true);      
const bestRegionOnly = ref(true);

const viewMode = ref('table');
const lastPreset = ref('balanced');
const expandedId = ref(null);

watch(
  () => {
    return options.value.domains;
  },
  (domains) => {
    if (!domain.value && domains.length) {
      domain.value = domains.includes('Database') ? 'Database' : domains[0];
    }
  },
  { immediate: true }
);

const inDomain = computed( () => {
  return records.value.filter( (record) => {
    return record.domain === domain.value;
  });
});

const subcategoryOptions = computed( () => {
  return uniqSorted(inDomain.value.map( (record) => {
    return record.subcategory;
  }));
});
 
const engineOptions = computed( () => {
  return uniqSorted(inDomain.value.map( (record) => {
    return record.db_engine;
  }));
});

const poolBeforeDedupe = computed(function () {
  if (!domain.value) {
    return [];
  }
 
  return inDomain.value.filter( (record) => {
    if (subcategory.value && record.subcategory !== subcategory.value) {
      return false;
    }
 
    if (
      regionGroup.value &&
      record.region_group !== regionGroup.value &&
      record.region_group !== 'global'
    ) {
      return false;
    }
 
    if (operatingSystem.value && record.operating_system !== operatingSystem.value) {
      return false;
    }
    if (dbEngine.value && record.db_engine !== dbEngine.value) {
      return false;
    }
    if (pricingModel.value && record.pricing_model !== pricingModel.value) {
      return false;
    }
    if (requireSpecs.value && (record.vcpu_count == null || record.memory_gb == null)) {
      return false;
    }
 
    return true;
  });
});

const items = computed( () => {
  if (bestRegionOnly.value) {
    return cheapestPerSku(poolBeforeDedupe.value);
  }
  return poolBeforeDedupe.value;
});

const presetNames = Object.keys(policyPresets);
const categoryWeights = ref({});

function applyPreset(name) {
  const presetWeights = policyPresets[name] ?? DEFAULT_WEIGHTS;
  categoryWeights.value = { ...presetWeights };
}

applyPreset('balanced');

function selectPreset(name) {
  lastPreset.value = name;
  applyPreset(name);
}

function setCategoryWeight(cat, value) {
  categoryWeights.value = { ...categoryWeights.value, [cat]: value };
}

function onDomainChange() {
  if (subcategoryOptions.value.includes(DEFAULT_SUBCATEGORY)) {
    subcategory.value = DEFAULT_SUBCATEGORY;
  } else {
    subcategory.value = null;
  }
 
  dbEngine.value = null;
  operatingSystem.value = null;
}

watch(domain, () => {
  applyPreset(lastPreset.value);
  expandedId.value = null;
});

const { categories, scored } = useScenarioScoring(items, CRITERIA, categoryWeights);

const topScored = computed( () => {
  return scored.value.slice(0, EVAL_TOP_N);
});

const providerLegend = computed( () => {
  const seen = new Map();

  topScored.value.forEach( (item, index) => {
    if (!seen.has(item.provider)) {
      seen.set(item.provider, colorFor(item.provider, index));
    }
  });

  return [...seen].map( ([provider, color]) => {
    return { provider, color };
  });
});

function toggleExpanded(id) {
  if (expandedId.value === id) {
    expandedId.value = null;
  } else {
    expandedId.value = id;
  }
}

const bestPerProvider = computed( () => {
  const bestByProvider = new Map();
 
  for (const item of scored.value) {
    if (!bestByProvider.has(item.provider)) {
      bestByProvider.set(item.provider, item);
    }
  }
 
  return [...bestByProvider.values()];
});

const xCat = ref('Cost');
const yCat = ref('Performance');

const allPoints = computed( () => {
  const withBothScores = scored.value.filter( (item) => {
    return item.breakdown?.[xCat.value] != null && item.breakdown?.[yCat.value] != null;
  });
 
  return withBothScores.map( (item, index) => {
    return {
      id: item.id,
      name: item.skuName,
      x: item.breakdown[xCat.value],
      y: item.breakdown[yCat.value],
      color: colorFor(item.provider, index),
    };
  });
});

const paretoIds = computed( () => {
  if (allPoints.value.length === 0) {
    return new Set();
  }
 
  const frontier = paretoFrontier2D(allPoints.value);
  return new Set(frontier.map( (point) => {
    return point.id;
  }));
});

const quadrantPoints = computed( () => {
  const topIds = new Set(
    scored.value.slice(0, QUADRANT_LIMIT).map( (item) => {
      return item.id;
    })
  );
 
  return allPoints.value.filter( (point) => {
    return topIds.has(point.id) || paretoIds.value.has(point.id);
  });
});

const quadrantAvailable = computed( () => {
  return quadrantPoints.value.length > 0;
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
let lastPointer = { x: 0, y: 0 };

const span = computed( () => {
  return 1 / zoom.value;
});
const x0 = computed( () => {
  return centerX.value - span.value / 2;
});
const y0 = computed( () => {
  return centerY.value - span.value / 2;
});

function toSvgX(x) {
  return PAD + ((x - x0.value) / span.value) * PLOT;
}

function toSvgY(y) {
  return SIZE - PAD - ((y - y0.value) / span.value) * PLOT;
}

const hoveredId = ref(null);

function shortName(name, max = 18) {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

function labelAnchor(p) {
  return toSvgX(p.x) > SIZE * 0.7 ? 'end' : 'start';
}

function labelDx(p) {
  return labelAnchor(p) === 'end' ? -10 : 10;
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
  return { fx, fy, dx: x0.value + fx * span.value, dy: y0.value + fy * span.value };
}

function zoomAt(factor, evt) {
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * factor));
  if (newZoom === zoom.value) {
    return;
  }

  let fx = 0.5, fy = 0.5, dx = centerX.value, dy = centerY.value;
  if (evt) {
    ({ fx, fy, dx, dy } = pointerInfo(evt));
  }

  zoom.value = newZoom;
  const newSpan = 1 / newZoom;
  centerX.value = dx - fx * newSpan + newSpan / 2;
  centerY.value = dy - fy * newSpan + newSpan / 2;
  clampCenter();
}

function onWheel(evt) {
  zoomAt(evt.deltaY < 0 ? 1.25 : 1 / 1.25, evt);
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

function showLabel(p) {
  return zoom.value >= 2 || paretoIds.value.has(p.id) || hoveredId.value === p.id;
}

</script>

<template>
<div class="page">
  <div class="p-4">
 
    <div v-if="loading" class="text-white-50">Loading pricing data…</div>
    <div v-else-if="error" class="text-danger">Could not load the pricing data: {{ error.message }}</div>
 
    <template v-else>
 
    <div class="d-flex gap-3 mb-3 flex-wrap align-items-center">

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Domain</label>
        <select class="form-select w-auto custom-form-select" v-model="domain" @change="onDomainChange">
          <option v-for="d in options.domains" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Resource type</label>
        <select class="form-select w-auto custom-form-select" v-model="subcategory">
          <option :value="null">Any type</option>
          <option v-for="s in subcategoryOptions" :key="s" :value="s">{{ SUBCATEGORY_LABELS[s] ?? s }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Area</label>
        <select class="form-select w-auto custom-form-select" v-model="regionGroup">
          <option :value="null">Any area</option>
          <option v-for="g in options.regionGroups" :key="g" :value="g">{{ REGION_GROUP_LABELS[g] ?? g }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Operating System</label>
        <select class="form-select w-auto custom-form-select" v-model="operatingSystem">
          <option :value="null">Any OS</option>
          <option v-for="os in options.operatingSystems" :key="os" :value="os">{{ os }}</option>
        </select>
      </div>

      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">DB engine</label>
        <select v-if="engineOptions.length" class="form-select w-auto custom-form-select" v-model="dbEngine">
          <option :value="null">Any engine</option>
          <option v-for="e in engineOptions" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
      
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Pricing model</label>
        <select class="form-select w-auto custom-form-select" v-model="pricingModel">
          <option :value="null">Any pricing</option>
          <option v-for="m in options.pricingModels" :key="m" :value="m">{{ PRICING_MODEL_LABELS[m] ?? m }}</option>
        </select>
      </div>

    </div>
 
    <div class="d-flex gap-3 mb-3 flex-wrap align-items-center">
      <div class="btn-group">
        <button v-for="name in presetNames" :key="name" class="btn btn-outline-primary"
          :class="{ active: lastPreset === name }" @click="selectPreset(name)">
          {{ presetLabels[name] ?? name }}
        </button>
      </div>
 
      <div class="form-check text-white">
        <input id="req-specs" type="checkbox" class="form-check-input" v-model="requireSpecs" />
        <label for="req-specs" class="form-check-label">Known vCPU + memory only</label>
      </div>
 
      <div class="form-check text-white">
        <input id="best-region" type="checkbox" class="form-check-input" v-model="bestRegionOnly" />
        <label for="best-region" class="form-check-label">Cheapest region per SKU</label>
      </div>
 
      <div class="btn-group ms-auto">
        <button class="btn btn-outline-light" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">Table</button>
        <button class="btn btn-outline-light" :class="{ active: viewMode === 'quadrant' }" @click="viewMode = 'quadrant'">Quadrant</button>
        <button class="btn btn-outline-light" :class="{ active: viewMode === 'breakdown' }" @click="viewMode = 'breakdown'">Breakdown</button>
      </div>
    </div>
 
    <div class="weight-panel mb-4">
      <div class="weight-panel-title">Criteria weights</div>
      <div class="weight-row" v-for="cat in categories" :key="cat">
        <label class="weight-label">{{ cat }}</label>
        <input type="range" class="form-range" min="0" max="1" step="0.05" :value="categoryWeights[cat] ?? 0" @input="setCategoryWeight(cat, +$event.target.value)"/>
        <span class="weight-value">{{ ((categoryWeights[cat] ?? 0) * 100).toFixed(0) }}%</span>
      </div>
    </div>
 
    <div v-if="bestPerProvider.length" class="d-flex gap-3 flex-wrap mb-4">
      <div v-for="item in bestPerProvider" :key="item.provider" class="border rounded p-2 text-white small" style="min-width: 260px">
        <div class="text-white-50">Best {{ item.provider }} option</div>
        <div class="fw-bold">{{ item.skuName }}</div>
        <div>{{ item.region }} · {{ fmt(item.effective_price_hr) }} {{ item.currencyCode }}/hr · {{ item.vcpu_count }} vCPU / {{ item.memory_gb }} GB</div>
        <div>Score {{ (item.score * 100).toFixed(1) }}%</div>
      </div>
    </div>
 
    <div class="text-white-50 small mb-2">
      {{ items.length.toLocaleString() }} candidates<span v-if="items.length > EVAL_TOP_N"> · showing the top {{ EVAL_TOP_N }}</span>
    </div>
 
    <div v-if="!items.length" class="text-white-50">No records match these filters.</div>
 
    <div v-else-if="viewMode === 'table'" class="evaluation-container">
      <div class="evaluation-table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Provider</th>
              <th>SKU</th>
              <th>Region</th>
              <th>Price / hr</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(item, index) in topScored" :key="item.id">
              <tr class="rank-row" @click="toggleExpanded(item.id)">
                <td>{{ index + 1 }}</td>
                <td>{{ item.provider }}</td>
                <td>{{ item.skuName }}</td>
                <td>{{ item.region }}</td>
                <td>{{ fmt(item.effective_price_hr) }}</td>
                <td>{{ (item.score * 100).toFixed(1) }}%</td>
                <td class="text-end text-white-50">{{ expandedId === item.id ? '▲' : '▼' }}</td>
              </tr>
              <tr v-if="expandedId === item.id" class="breakdown-row">
                <td colspan="7">
                  <div class="text-white-50 small mb-2">
                    {{ item.vcpu_count }} vCPU · {{ item.memory_gb }} GB ·
                    {{ fmt(item.price_per_vcpu_hr) }} per vCPU-hr · {{ fmt(item.price_per_gb_hr) }} per GB-hr ·
                    {{ REGION_GROUP_LABELS[item.region_group] ?? item.region_group }}
                    <span v-if="item.specs_inferred"> · specs estimated</span>
                  </div>
                  <div class="breakdown-bars">
                    <div v-for="cat in categories" :key="cat" class="breakdown-bar-item">
                      <span class="breakdown-bar-label">{{ cat }}</span>
                      <div class="progress">
                        <div class="progress-bar" :style="{ width: ((item.breakdown[cat] ?? 0) * 100) + '%' }"></div>
                      </div>
                      <span class="breakdown-bar-value">
                        {{ item.breakdown[cat] != null ? (item.breakdown[cat] * 100).toFixed(0) + '%' : 'N/A' }}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
 
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
        Not enough scored records to plot a quadrant chart.
      </div>

      <div v-else class="quadrant-chart-wrap">
        <div class="quadrant-zoom-controls">
          <button type="button" class="btn btn-sm btn-outline-light" :disabled="zoom >= MAX_ZOOM" @click="zoomAt(1.5)">+</button>
          <button type="button" class="btn btn-sm btn-outline-light" :disabled="zoom <= MIN_ZOOM" @click="zoomAt(1 / 1.5)">−</button>
          <button type="button" class="btn btn-sm btn-outline-light" :disabled="zoom === 1" @click="resetZoom">Reset</button>
          <span class="text-white-50 small">×{{ zoom.toFixed(1) }}</span>
        </div>

        <svg ref="svgEl" :viewBox="`0 0 ${SIZE} ${SIZE}`" class="quadrant-svg"
            :class="{ 'is-zoomed': zoom > 1, 'is-dragging': isDragging }"
            @wheel.prevent="onWheel" @mousedown="startDrag" @mousemove="onDrag"
            @mouseup="endDrag" @mouseleave="endDrag">

          <defs>
            <clipPath id="quadrant-clip">
              <rect :x="PAD - 10" :y="PAD - 10" :width="PLOT + 20" :height="PLOT + 20" />
            </clipPath>
          </defs>

          <g clip-path="url(#quadrant-clip)">
            <line :x1="PAD" :y1="toSvgY(0.5)" :x2="SIZE - PAD" :y2="toSvgY(0.5)" class="quadrant-gridline" />
            <line :x1="toSvgX(0.5)" :y1="PAD" :x2="toSvgX(0.5)" :y2="SIZE - PAD" class="quadrant-gridline" />

            <g v-for="p in quadrantPoints" :key="p.id"
              @mouseenter="hoveredId = p.id" @mouseleave="hoveredId = null">
              <title>{{ p.name }}</title>
              <circle :cx="toSvgX(p.x)" :cy="toSvgY(p.y)" :r="paretoIds.has(p.id) ? 8 : 6"
                      :fill="p.color" :class="{ 'pareto-point': paretoIds.has(p.id) }" />
              <text v-if="showLabel(p)"
                    :x="toSvgX(p.x) + labelDx(p)" :y="toSvgY(p.y) + 4"
                    :text-anchor="labelAnchor(p)" class="quadrant-point-label">
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
            <span class="breakdown-grid-name">{{ item.skuName }}</span>
            <div class="progress">
              <div class="progress-bar" :style="{ width: ((item.breakdown[cat] ?? 0) * 100) + '%', backgroundColor: colorFor(item.provider, index),}"></div>
            </div>
            <span class="breakdown-grid-value">
              {{ item.breakdown[cat] != null ? (item.breakdown[cat] * 100).toFixed(0) + '%' : 'N/A' }}
            </span>
          </div>
        </div>
      </div>
    </div>
 
    </template>
  </div>
</div>
</template>

<style scoped src="@/assets/styles/views/Evaluation.scss"></style>