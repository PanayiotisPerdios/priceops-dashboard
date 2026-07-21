<script setup>
import { ref, computed, watch } from 'vue';
import { services } from '@/data/filters';
import { useProviderItems } from '@/composables/useProviderItems';
import { useEvaluation } from '@/composables/useEvaluation';
import { policyPresets } from '@/data/policyPresets';
import { getMetricsForService } from '@/data/metricRegistry';

const service = ref('Compute');

const items = useProviderItems(service);
const { weights, scored, applyPreset } = useEvaluation(items, service);

let lastPreset = 'balanced';

applyPreset('balanced', policyPresets);

function selectPreset(name) {
  lastPreset = name;
  applyPreset(name, policyPresets);
}

watch(service, () => {
  applyPreset(lastPreset, policyPresets);
});

const categories = computed(() => {
  const fields = getMetricsForService(service.value);
  return [...new Set(Object.values(fields).map(f => f.category))];
});
</script>

<template>
  <div class="p-4">
    <div class="d-flex gap-3 mb-3">
      <select class="form-select w-auto" v-model="service">
        <option v-for="s in services" :key="s" :value="s">{{ s }}</option>
      </select>

      <button class="btn btn-outline-primary" @click="selectPreset('costFirst')">Cost First</button>
      <button class="btn btn-outline-primary" @click="selectPreset('performanceFirst')">Performance First</button>
      <button class="btn btn-outline-primary" @click="selectPreset('balanced')">Balanced</button>
    </div>

    <table class="table text-white">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Provider</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in scored" :key="item.id">
          <td>{{ index + 1 }}</td>
          <td>{{ item.name }}</td>
          <td>{{ (item.score * 100).toFixed(1) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>