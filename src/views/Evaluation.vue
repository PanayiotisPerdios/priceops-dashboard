<script setup>
import { ref, computed, watch } from 'vue';
import { services } from '@/data/filters';
import { useProviderItems } from '@/composables/useProviderItems';
import { useEvaluation } from '@/composables/useEvaluation';
import { policyPresets } from '@/data/policyPresets';
import { getMetricsForService } from '@/data/metricRegistry';

const service = ref('Compute');
const viewMode = ref('table');
const lastPreset = ref('balanced');
const expandedId = ref(null);

const items = useProviderItems(service);
const {
  categoryWeights,
  scored,
  paretoFrontier2D,
  applyPreset,
  setCategoryWeight,
} = useEvaluation(items, service);

applyPreset('balanced', policyPresets);

function selectPreset(name) {
  lastPreset.value = name;
  applyPreset(name, policyPresets);
}

watch(service, () => {
  applyPreset(lastPreset.value, policyPresets);
  expandedId.value = null;
});

const categories = computed(() => {
  const fields = getMetricsForService(service.value);
  return [...new Set(Object.values(fields).map(f => f.category))];
});

function toggleExpanded(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

const providerColors = {
  AWS: '#f0932b',
  'Google Cloud': '#4285f4',
  Azure: '#0078d4',
};
const fallbackPalette = ['#6366f1', '#ca309e', '#22c55e', '#eab308'];
function colorFor(id, index) {
  return providerColors[id] ?? fallbackPalette[index % fallbackPalette.length];
}

const quadrantAvailable = computed(
  () => categories.value.includes('Cost') && categories.value.includes('Performance')
);

const quadrantPoints = computed(() => {
  if (!quadrantAvailable.value) return [];
  return scored.value
    .filter(item => item.breakdown?.Cost != null && item.breakdown?.Performance != null)
    .map((item, index) => ({
      id: item.id,
      name: item.name,
      x: item.breakdown.Cost,
      y: item.breakdown.Performance,
      color: colorFor(item.id, index),
    }));
});

const paretoIds = computed(() => {
  if (!quadrantPoints.value.length) return new Set();
  return new Set(paretoFrontier2D(quadrantPoints.value).map(p => p.id));
});

const PAD = 32;
const SIZE = 320;
function toSvgX(x) {
  return PAD + x * (SIZE - PAD * 2);
}
function toSvgY(y) {
  return SIZE - PAD - y * (SIZE - PAD * 2);
}
</script>

<template>
<div class="page">
  <div class="p-4">
    <div class="d-flex gap-3 mb-3 flex-wrap align-items-center">
      <select class="form-select w-auto" v-model="service">
        <option v-for="s in services" :key="s" :value="s">{{ s }}</option>
      </select>

      <div class="btn-group">
        <button
          class="btn btn-outline-primary"
          :class="{ active: lastPreset === 'costFirst' }"
          @click="selectPreset('costFirst')"
        >Cost First</button>
        <button
          class="btn btn-outline-primary"
          :class="{ active: lastPreset === 'performanceFirst' }"
          @click="selectPreset('performanceFirst')"
        >Performance First</button>
        <button
          class="btn btn-outline-primary"
          :class="{ active: lastPreset === 'balanced' }"
          @click="selectPreset('balanced')"
        >Balanced</button>
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
        <input
          type="range"
          class="form-range"
          min="0"
          max="1"
          step="0.05"
          :value="categoryWeights[cat] ?? 0"
          @input="setCategoryWeight(cat, +$event.target.value)"
        />
        <span class="weight-value">{{ ((categoryWeights[cat] ?? 0) * 100).toFixed(0) }}%</span>
      </div>
    </div>
  
    <div v-if="viewMode === 'table'" class="evaluation-container">
      <div class="evaluation-table-wrap">
      <table class="table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Provider</th>
          <th>Score</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(item, index) in scored" :key="item.id">
          <tr class="rank-row" @click="toggleExpanded(item.id)">
            <td>{{ index + 1 }}</td>
            <td>{{ item.name }}</td>
            <td>{{ (item.score * 100).toFixed(1) }}%</td>
            <td class="text-end text-white-50">{{ expandedId === item.id ? '▲' : '▼' }}</td>
          </tr>
          <tr v-if="expandedId === item.id" class="breakdown-row">
            <td colspan="4">
              <div class="breakdown-bars">
                <div v-for="cat in categories" :key="cat" class="breakdown-bar-item">
                  <span class="breakdown-bar-label">{{ cat }}</span>
                  <div class="progress">
                    <div
                      class="progress-bar"
                      :style="{ width: ((item.breakdown[cat] ?? 0) * 100) + '%' }"
                    ></div>
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
      <div v-if="!quadrantAvailable" class="text-white-50">
        This service doesn't expose both Cost and Performance categories, so the quadrant chart isn't available.
      </div>
      <div v-else class="quadrant-chart-wrap">
        <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="quadrant-svg">
          <line :x1="PAD" :y1="SIZE/2" :x2="SIZE-PAD" :y2="SIZE/2" class="quadrant-gridline" />
          <line :x1="SIZE/2" :y1="PAD" :x2="SIZE/2" :y2="SIZE-PAD" class="quadrant-gridline" />
          <rect :x="PAD" :y="PAD" :width="SIZE-PAD*2" :height="SIZE-PAD*2" class="quadrant-border" />

          <text :x="SIZE/2" :y="SIZE-8" class="quadrant-axis-label" text-anchor="middle">Cost score →</text>
          <text :x="12" :y="SIZE/2" class="quadrant-axis-label" text-anchor="middle" :transform="`rotate(-90 12 ${SIZE/2})`">Performance score →</text>

          <g v-for="p in quadrantPoints" :key="p.id">
            <circle
              :cx="toSvgX(p.x)"
              :cy="toSvgY(p.y)"
              :r="paretoIds.has(p.id) ? 8 : 6"
              :fill="p.color"
              :class="{ 'pareto-point': paretoIds.has(p.id) }"
            />
            <text :x="toSvgX(p.x) + 10" :y="toSvgY(p.y) + 4" class="quadrant-point-label">{{ p.name }}</text>
          </g>
        </svg>
        <div class="quadrant-legend text-white-50 small">
          Highlighted (outlined) points sit on the Pareto frontier — no other option beats them on both cost and performance at once.
        </div>
      </div>
    </div>

    <div v-else class="breakdown-grid">
      <div v-for="cat in categories" :key="cat" class="breakdown-grid-row">
        <div class="breakdown-grid-label">{{ cat }}</div>
        <div class="breakdown-grid-bars">
          <div v-for="(item, index) in scored" :key="item.id" class="breakdown-grid-bar-item">
            <span class="breakdown-grid-name">{{ item.name }}</span>
            <div class="progress">
              <div
                class="progress-bar"
                :style="{
                  width: ((item.breakdown[cat] ?? 0) * 100) + '%',
                  backgroundColor: colorFor(item.id, index),
                }"
              ></div>
            </div>
            <span class="breakdown-grid-value">
              {{ item.breakdown[cat] != null ? (item.breakdown[cat] * 100).toFixed(0) + '%' : 'N/A' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped src="@/assets/styles/views/Evaluation.scss"></style>