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
  () => options.value.domains,
  domains => {
    if (!domain.value && domains.length) domain.value = domains.includes('Database') ? 'Database' : domains[0];
  },
  { immediate: true }
);

const inDomain = computed(() => records.value.filter(r => r.domain === domain.value));
const subcategoryOptions = computed(() => uniqSorted(inDomain.value.map(r => r.subcategory)));
const engineOptions = computed(() => uniqSorted(inDomain.value.map(r => r.db_engine)));

const poolBeforeDedupe = computed(() => {
  if (!domain.value) return [];
  return inDomain.value.filter(r =>
    (!subcategory.value || r.subcategory === subcategory.value) &&
    (!regionGroup.value || r.region_group === regionGroup.value || r.region_group === 'global') &&
    (!operatingSystem.value || r.operating_system === operatingSystem.value) &&
    (!dbEngine.value || r.db_engine === dbEngine.value) &&
    (!pricingModel.value || r.pricing_model === pricingModel.value) &&
    (!requireSpecs.value || (r.vcpu_count != null && r.memory_gb != null))
  );
});

const items = computed(() => (bestRegionOnly.value ? cheapestPerSku(poolBeforeDedupe.value) : poolBeforeDedupe.value));

const presetNames = Object.keys(policyPresets);
const categoryWeights = ref({});

function applyPreset(name) {
  categoryWeights.value = { ...(policyPresets[name] ?? DEFAULT_WEIGHTS) };
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
  subcategory.value = subcategoryOptions.value.includes(DEFAULT_SUBCATEGORY) ? DEFAULT_SUBCATEGORY : null;
  dbEngine.value = null;
  operatingSystem.value = null;
}

watch(domain, () => {
  applyPreset(lastPreset.value);
  expandedId.value = null;
});

const { categories, scored } = useScenarioScoring(items, CRITERIA, categoryWeights);

const topScored = computed(() => scored.value.slice(0, EVAL_TOP_N));

function toggleExpanded(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

const bestPerProvider = computed(() => {
  const seen = new Map();
  for (const item of scored.value) if (!seen.has(item.provider)) seen.set(item.provider, item);
  return [...seen.values()];
});

const xCat = ref('Cost');
const yCat = ref('Performance');

const allPoints = computed(() =>
  scored.value
    .filter(item => item.breakdown?.[xCat.value] != null && item.breakdown?.[yCat.value] != null)
    .map((item, index) => ({
      id: item.id,
      name: item.skuName,
      x: item.breakdown[xCat.value],
      y: item.breakdown[yCat.value],
      color: colorFor(item.provider, index),
    }))
);

const paretoIds = computed(() => {
  if (!allPoints.value.length) return new Set();
  return new Set(paretoFrontier2D(allPoints.value).map(p => p.id));
});

const quadrantPoints = computed(() => {
  const top = new Set(scored.value.slice(0, QUADRANT_LIMIT).map(i => i.id));
  return allPoints.value.filter(p => top.has(p.id) || paretoIds.value.has(p.id));
});

const quadrantAvailable = computed(() => quadrantPoints.value.length > 0);

const PAD = 32;
const SIZE = 320;
function toSvgX(x) { return PAD + x * (SIZE - PAD * 2); }
function toSvgY(y) { return SIZE - PAD - y * (SIZE - PAD * 2); }

</script>

<template>
<div class="page">
  <div class="p-4">
 
    <div v-if="loading" class="text-white-50">Loading pricing data…</div>
    <div v-else-if="error" class="text-danger">Could not load the pricing data: {{ error.message }}</div>
 
    <template v-else>
 
    <div class="d-flex gap-3 mb-3 flex-wrap align-items-center">
      <select class="form-select w-auto" v-model="domain" @change="onDomainChange">
        <option v-for="d in options.domains" :key="d" :value="d">{{ d }}</option>
      </select>
 
      <select class="form-select w-auto" v-model="subcategory">
        <option :value="null">Any type</option>
        <option v-for="s in subcategoryOptions" :key="s" :value="s">{{ SUBCATEGORY_LABELS[s] ?? s }}</option>
      </select>
 
      <select class="form-select w-auto" v-model="regionGroup">
        <option :value="null">Any area</option>
        <option v-for="g in options.regionGroups" :key="g" :value="g">{{ REGION_GROUP_LABELS[g] ?? g }}</option>
      </select>
 
      <select class="form-select w-auto" v-model="operatingSystem">
        <option :value="null">Any OS</option>
        <option v-for="os in options.operatingSystems" :key="os" :value="os">{{ os }}</option>
      </select>
 
      <select v-if="engineOptions.length" class="form-select w-auto" v-model="dbEngine">
        <option :value="null">Any engine</option>
        <option v-for="e in engineOptions" :key="e" :value="e">{{ e }}</option>
      </select>
 
      <select class="form-select w-auto" v-model="pricingModel">
        <option :value="null">Any pricing</option>
        <option v-for="m in options.pricingModels" :key="m" :value="m">{{ PRICING_MODEL_LABELS[m] ?? m }}</option>
      </select>
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
 
      <div v-if="!quadrantAvailable" class="text-white-50">
        Not enough scored records to plot a quadrant chart.
      </div>
      <div v-else class="quadrant-chart-wrap">
        <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="quadrant-svg">
          <line :x1="PAD" :y1="SIZE/2" :x2="SIZE-PAD" :y2="SIZE/2" class="quadrant-gridline" />
          <line :x1="SIZE/2" :y1="PAD" :x2="SIZE/2" :y2="SIZE-PAD" class="quadrant-gridline" />
          <rect :x="PAD" :y="PAD" :width="SIZE-PAD*2" :height="SIZE-PAD*2" class="quadrant-border" />
 
          <text :x="SIZE/2" :y="SIZE-8" class="quadrant-axis-label" text-anchor="middle">{{ xCat }} score →</text>
          <text :x="12" :y="SIZE/2" class="quadrant-axis-label" text-anchor="middle" :transform="`rotate(-90 12 ${SIZE/2})`">{{ yCat }} score →</text>
 
          <g v-for="p in quadrantPoints" :key="p.id">
            <circle :cx="toSvgX(p.x)" :cy="toSvgY(p.y)" :r="paretoIds.has(p.id) ? 8 : 6" :fill="p.color" :class="{ 'pareto-point': paretoIds.has(p.id) }"/>
            <text :x="toSvgX(p.x) + 10" :y="toSvgY(p.y) + 4" class="quadrant-point-label">{{ p.name }}</text>
          </g>
        </svg>
        <div class="quadrant-legend text-white-50 small">
          Highlighted (outlined) points sit on the Pareto frontier — no other option beats them on both {{ xCat.toLowerCase() }} and {{ yCat.toLowerCase() }} at once.
          Showing the top {{ QUADRANT_LIMIT }} ranked options plus every Pareto point.
        </div>
      </div>
    </div>
 
    <div v-else class="breakdown-grid">
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