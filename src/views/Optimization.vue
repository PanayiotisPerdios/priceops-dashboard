
<script setup>
import { ref, computed } from 'vue';
import { getOptimizationRecommendations } from '@/services/optimizationService';

const regionGroup = ref('North America');
const operatingSystem = ref('Linux');
const pricingCategory = ref('Standard');
const hoursPerMonth = ref(730);
const minVCpu = ref(4);
const minMemoryGiB = ref(16);

const loading = ref(false);
const error = ref('');
const recommendations = ref([]);
const submittedRequest = ref(null);
const hasResults = ref(false);

const sortedRecommendations = computed(() =>
  [...recommendations.value].sort((a, b) => b.score - a.score)
);

function buildRequest() {
  return {
    regionGroup: regionGroup.value,
    operatingSystem: operatingSystem.value,
    pricingCategory: pricingCategory.value,
    hoursPerMonth: Number(hoursPerMonth.value),
    components: [
      {
        ServiceCategory: 'Compute',
        PriceComponent: 'Instance',
        PricingUnit: 'Hour',
        quantity: 1,
        minVCpu: Number(minVCpu.value),
        minMemoryGiB: Number(minMemoryGiB.value)
      }
    ]
  };
}

async function runOptimization() {
  loading.value = true;
  error.value = '';
  recommendations.value = [];
  submittedRequest.value = null;
  hasResults.value = false;

  try {
    const request = buildRequest();

    const response = await getOptimizationRecommendations(request);

    submittedRequest.value = request;
    recommendations.value = response.recommendations;
    hasResults.value = true;
  } catch (err) {
    error.value = err.message || 'Optimization failed.';
  } finally {
    loading.value = false;
  }
}

function formatCost(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
</script>

<template>
  <div class="optimization-container">
    <h2>Optimization</h2>

    <p class="text-secondary">
      Configure workload requirements and view optimization recommendations.
    </p>

    <div class="alert alert-info">
      Mock mode: recommendations are illustrative, not calculated by a real optimization engine.
    </div>

    <div class="optimization-panel">
      <h4>Workload Configuration</h4>

      <form @submit.prevent="runOptimization">
        <div class="form-grid">
          <div>
            <label class="form-label">Region Group</label>
            <select v-model="regionGroup" class="form-select">
              <option>North America</option>
              <option>South America</option>
              <option>Europe</option>
              <option>Asia Pacific</option>
              <option>Middle East</option>
              <option>Africa</option>
              <option>Global</option>
            </select>
          </div>

          <div>
            <label class="form-label">Operating System</label>
            <input v-model="operatingSystem" class="form-control" type="text" required/>
          </div>

          <div>
            <label class="form-label">Pricing Category</label>
            <select v-model="pricingCategory" class="form-select">
              <option>Standard</option>
              <option>Dynamic</option>
              <option>Committed</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label class="form-label">Hours per Month</label>
            <input v-model.number="hoursPerMonth" class="form-control" type="number" min="1" max="744" required/>
          </div>

          <div>
            <label class="form-label">Minimum vCPU</label>
            <input v-model.number="minVCpu" class="form-control" type="number" min="1" required/>
          </div>

          <div>
            <label class="form-label">Minimum RAM (GiB)</label>
            <input v-model.number="minMemoryGiB" class="form-control" type="number" min="1" required/>
          </div>
        </div>

        <button type="submit" class="btn btn-primary mt-3" :disabled="loading">
          {{ loading ? 'Loading...' : 'Run Optimization' }}
        </button>
      </form>
    </div>

    <div v-if="error" class="alert alert-danger mt-3">
      {{ error }}
    </div>

    <div v-if="hasResults" class="optimization-panel mt-4">
      <h4>Optimization Recommendations</h4>

      <p v-if="!recommendations.length" class="text-secondary">
        No recommendations returned.
      </p>

      <div v-else class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Provider</th>
              <th>SKU ID</th>
              <th>Monthly Cost</th>
              <th>Score</th>
              <th>Rationale</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="recommendation in sortedRecommendations" :key="`${recommendation.provider}-${recommendation.sku_id}`">
              <td>{{ recommendation.provider }}</td>
              <td>{{ recommendation.sku_id }}</td>
              <td>{{ formatCost(recommendation.monthly_cost) }}</td>
              <td>{{ recommendation.score.toFixed(2) }}</td>
              <td>{{ recommendation.rationale }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped src="@/assets/styles/views/Optimization.scss"></style>
