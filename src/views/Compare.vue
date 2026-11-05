<script setup>
import { ref, computed, watch } from 'vue';
import { usePricingData } from '@/composables/usePricingData';
import { evaluateScenario, evaluateAllProviders, PROVIDERS } from '@/utils/scenarioEvaluator';
import { exportCompareCSV, exportCompareJSON} from '@/utils/exportHelpers';
import { colorFor } from '@/utils/calculationServices';
import MetricChart from '@/components/MetricChart.vue';

const { records, loading, error, sourceName } = usePricingData();
const compareMode = ref('provider');
const activeTab = ref('details');
const providerA = ref('AWS');
const providerB = ref('Azure');
const compareChartColumns = [
  { id: 'monthlyCost', name: 'Monthly cost (USD)' }
];

const usageFields = [
  { key: 'hourlyUnits', label: 'Hourly units' },
  { key: 'vcpu', label: 'Billed vCPU (optional override)' },
  { key: 'memoryGB', label: 'Billed RAM (GB)' },
  { key: 'gbHoursCapacity', label: 'Other GB-hour capacity' },
  { key: 'storageGBMonths', label: 'Storage (GB-months)' },
  { key: 'backupGBMonths', label: 'Backup (GB-months)' },
  { key: 'gbMonths', label: 'Other GB-months' },
  { key: 'transferGB', label: 'Transferred GB' },
  { key: 'gb', label: 'Other GB' },
  { key: 'billableDays', label: 'Billable days' },
  { key: 'billableMonths', label: 'Billable months' },
  { key: 'billableYears', label: 'Billable years' },
  { key: 'acu', label: 'ACU' },
  { key: 'iopsMonths', label: 'IOPS-months' },
  { key: 'mbpsMonths', label: 'MBps-months' },
  { key: 'tagMonths', label: 'Tag-months' },
  { key: 'requests', label: 'Requests' }
];

function newComponent() {
  return {
    ServiceCategory: 'Compute',
    ServiceSubcategory: '',
    ServiceName: '',
    PriceComponent: 'Instance',
    PricingUnit: '',
    quantity: 1,
    minVCpu: 4,
    minMemoryGiB: 16,
    requiresOS: true,
    usage: {}
  };
}

function newScenario(name) {
  return {
    name,
    regionGroup: 'Europe',
    operatingSystem: 'Linux',
    pricingCategory: 'Standard',
    hoursPerMonth: 730,
    policy: 'costFirst',
    components: [newComponent()]
  };
}

const scenarioA = ref(newScenario('Scenario A'));
const scenarioB = ref(newScenario('Scenario B'));

function distinct(values) {
  return [...new Set(values.filter(value => value != null && value !== ''))].sort();
}

const providerOptions = computed(() => {
  const found = distinct(records.value.map(row => row.ServiceProviderName));
  return PROVIDERS.filter(provider => found.includes(provider));
});

const regionOptions = computed(() => distinct(records.value.map(row => row.RegionGroup)));
const pricingOptions = computed(() => distinct(records.value.map(row => row.PricingCategory)));
const osOptions = computed(() => distinct(records.value.map(row => row.OperatingSystem)));
const categoryOptions = computed(() => distinct(records.value.map(row => row.ServiceCategory)));
const componentOptions = computed(() => distinct(records.value.map(row => row.PriceComponent)));
const unitOptions = computed(() => distinct(records.value.map(row => row.PricingUnit)));

function rowsForComponent(component) {
  return records.value.filter(row => {
    if (component.ServiceCategory && row.ServiceCategory !== component.ServiceCategory) return false;
    if (component.PriceComponent && row.PriceComponent !== component.PriceComponent) return false;
    return true;
  });
}

function subcategoryOptions(component) {
  return distinct(rowsForComponent(component).map(row => row.ServiceSubcategory));
}

function serviceOptions(component) {
  return distinct(rowsForComponent(component)
    .filter(row => !component.ServiceSubcategory || row.ServiceSubcategory === component.ServiceSubcategory)
    .map(row => row.ServiceName));
}

function addComponent(scenario) {
  scenario.components.push(newComponent());
}

function removeComponent(scenario, index) {
  if (scenario.components.length > 1) scenario.components.splice(index, 1);
}

function resetComponentFilters(component) {
  component.ServiceSubcategory = '';
  component.ServiceName = '';
}

function numericOrEmpty(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function setUsage(component, key, value) {
  const number = numericOrEmpty(value);
  if (number === undefined) delete component.usage[key];
  else component.usage[key] = number;
}

function getUsage(component, key) {
  return component.usage[key] ?? '';
}

// Convert optional empty filter values to absent properties before evaluation.
function preparedScenario(scenario) {
  const result = {
    name: scenario.name,
    regionGroup: scenario.regionGroup || null,
    operatingSystem: scenario.operatingSystem || null,
    pricingCategory: scenario.pricingCategory || null,
    hoursPerMonth: scenario.hoursPerMonth,
    policy: 'costFirst',
    components: []
  };

  for (const component of scenario.components) {
    const prepared = {
      ServiceCategory: component.ServiceCategory,
      PriceComponent: component.PriceComponent,
      quantity: component.quantity,
      requiresOS: component.requiresOS,
      usage: { ...component.usage }
    };

    if (component.ServiceSubcategory){
      prepared.ServiceSubcategory = component.ServiceSubcategory;
    } 
    
    if (component.ServiceName) {
      prepared.ServiceName = component.ServiceName;
    }

    if (component.PricingUnit){
      prepared.PricingUnit = component.PricingUnit;
    }

    if (component.minVCpu !== '' && component.minVCpu != null){
      prepared.minVCpu = component.minVCpu;
    }

    if (component.minMemoryGiB !== '' && component.minMemoryGiB != null){
      prepared.minMemoryGiB = component.minMemoryGiB;
    }

    result.components.push(prepared);
  }
  return result;
}

const providerResultA = computed(() => evaluateScenario(records.value, preparedScenario(scenarioA.value), providerA.value));
const providerResultB = computed(() => evaluateScenario(records.value, preparedScenario(scenarioA.value), providerB.value));
const scenarioResultsA = computed(() => evaluateAllProviders(records.value, preparedScenario(scenarioA.value)));
const scenarioResultsB = computed(() => evaluateAllProviders(records.value, preparedScenario(scenarioB.value)));

const currentRows = computed(() => {
  if (compareMode.value === 'provider') {
    return [
      { label: providerA.value, result: providerResultA.value },
      { label: providerB.value, result: providerResultB.value }
    ];
  }
  const rows = [];
  for (const provider of PROVIDERS) {
    rows.push({
      label: provider,
      resultA: scenarioResultsA.value.find(result => result.provider === provider),
      resultB: scenarioResultsB.value.find(result => result.provider === provider)
    });
  }
  return rows;
});

function money(value) {
  if (value == null || !Number.isFinite(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function difference(a, b) {
  if (a == null || b == null) return null;
  return b - a;
}

const compareChartRecords = computed(() => {
  const result = [];

  if (compareMode.value === 'provider') {
    for (const item of currentRows.value) {
      if (!item.result.complete || !Number.isFinite(item.result.totalMonthlyCost)) {
          continue;
      }

      result.push({
        id: `provider|${item.label}`,
        name: item.label,
        color: colorFor(item.label),
        monthlyCost: item.result.totalMonthlyCost
      });
    }
  } else {
    for (const item of currentRows.value) {
      const scenarioResults = [item.resultA, item.resultB];

      for (let index = 0; index < scenarioResults.length; index++) {
        const scenarioResult = scenarioResults[index];

        if (!scenarioResult ||
            !scenarioResult.complete ||
            !Number.isFinite(scenarioResult.totalMonthlyCost)) {
          continue;
        }

        result.push({
          id: `scenario|${item.label}|${index}`,
          name: `${item.label} — Scenario ${index === 0 ? 'A' : 'B'}`,
          color: colorFor(item.label),
          monthlyCost: scenarioResult.totalMonthlyCost
        });
      }
    }
  }

  return result;
});

function exportCSV() {
  exportCompareCSV(compareMode.value, currentRows.value);
}

function exportJSON() {
  const mode = compareMode.value;

  const firstScenario = preparedScenario(scenarioA.value);

  let secondScenario = null;

  if (mode === 'scenario') {
    secondScenario = preparedScenario(scenarioB.value);
  }

  const results = currentRows.value;

  exportCompareJSON(mode, firstScenario, secondScenario, results);
}

watch(sourceName, () => {
  scenarioA.value = newScenario('Scenario A');
  scenarioB.value = newScenario('Scenario B');
});

</script>

<template>
  <div class="page comparison-page">
    
    <div class="btn-group mb-3">
      <button type="button" class="btn btn-outline-light" :class="{ active: compareMode === 'provider' }" @click="compareMode = 'provider'">Provider</button>
      <button type="button" class="btn btn-outline-light" :class="{ active: compareMode === 'scenario' }" @click="compareMode = 'scenario'">Scenario</button>
    </div>

    <div v-if="loading" class="text-white-50">Loading pricing data…</div>
    <div v-else-if="error" class="text-danger">Could not load pricing data: {{ error.message }}</div>
    
    <template v-else>
      <div v-if="compareMode === 'provider'" class="comparison-select-group mb-3 flex-wrap">
        
        <div class="data-ex-form-cont">
          <label class="form-label text-white">Provider A</label>
          <select v-model="providerA" class="form-select custom-form-select">
            <option v-for="provider in providerOptions" :key="provider" :value="provider">{{ provider }}</option>
          </select>
        </div>

        <div class="data-ex-form-cont">
          <label class="form-label text-white">Provider B</label>
          <select v-model="providerB" class="form-select custom-form-select">
            <option v-for="provider in providerOptions" :key="provider" :value="provider">{{ provider }}</option>
          </select>
        </div>

        <span v-if="providerA === providerB" class="text-warning small align-self-center">Choose different providers.</span>
      </div>

      <p class="text-white-50 small">Costs are calculated from your imported pricing records. Policy: Cost First (cheapest eligible priceable record per workload component).</p>

      <div class="scenario-editors">
        <section v-for="(scenario, scenarioIndex) in (compareMode === 'provider' ? [scenarioA] : [scenarioA, scenarioB])" :key="scenarioIndex" class="comparison-table-container scenario-editor">
          <h4 class="text-white mb-3">{{ compareMode === 'provider' ? 'Shared workload' : `Scenario ${scenarioIndex === 0 ? 'A' : 'B'}` }}</h4>

          <div class="scenario-form-grid">
            
            <div>
              <label class="form-label">Name</label>
              <input v-model="scenario.name" class="form-control" type="text" />
            </div>

            <div>
              <label class="form-label">Hours per month</label>
              <input v-model.number="scenario.hoursPerMonth" class="form-control" type="number" min="0" max="744" step="1" />
            </div>

            <div>
              <label class="form-label">Region group</label>
              <select v-model="scenario.regionGroup" class="form-select custom-form-select">
                <option value="">Any</option>
                <option v-for="region in regionOptions" :key="region" :value="region">{{ region }}</option>
              </select>
            </div>

            <div>
              <label class="form-label">Pricing category</label>
              <select v-model="scenario.pricingCategory" class="form-select custom-form-select">
                <option value="">Any</option>
                <option v-for="category in pricingOptions" :key="category" :value="category">{{ category }}</option>
              </select>
            </div>

            <div>
              <label class="form-label">Operating system</label>
              <select v-model="scenario.operatingSystem" class="form-select custom-form-select">
                <option value="">Any</option>
                <option v-for="os in osOptions" :key="os" :value="os">{{ os }}</option>
              </select>
            </div>

            <div>
              <label class="form-label">Policy</label>
              <input class="form-control" value="Cost First" disabled />
            </div>

          </div>

          <div v-for="(component, index) in scenario.components" :key="index" class="scenario-component mt-3">
            
            <div class="d-flex justify-content-between align-items-center mb-2">
              <strong class="text-white">Component {{ index + 1 }}</strong>
              <button type="button" class="btn btn-sm btn-outline-danger" :disabled="scenario.components.length === 1" @click="removeComponent(scenario, index)">Remove</button>
            </div>

            <div class="scenario-form-grid">
              
              <div>
                <label class="form-label">Service category</label>
                <select v-model="component.ServiceCategory" class="form-select custom-form-select" @change="resetComponentFilters(component)">
                  <option v-for="category in categoryOptions" :key="category" :value="category">{{ category }}</option>
                </select>
              </div>

              <div>
                <label class="form-label">Price component</label>
                <select v-model="component.PriceComponent" class="form-select custom-form-select" @change="resetComponentFilters(component)">
                  <option v-for="item in componentOptions" :key="item" :value="item">{{ item }}</option>
                </select>
              </div>

              <div>
                <label class="form-label">Subcategory</label>
                <select v-model="component.ServiceSubcategory" class="form-select custom-form-select" @change="component.ServiceName = ''">
                  <option value="">Any</option>
                  <option v-for="item in subcategoryOptions(component)" :key="item" :value="item">{{ item }}</option>
                </select>
              </div>

              <div>
                <label class="form-label">Service</label>
                <select v-model="component.ServiceName" class="form-select custom-form-select">
                  <option value="">Any</option>
                  <option v-for="item in serviceOptions(component)" :key="item" :value="item">{{ item }}</option>
                </select>
              </div>

              <div>
                <label class="form-label">Pricing unit</label>
                <select v-model="component.PricingUnit" class="form-select custom-form-select">
                  <option value="">Any supported unit</option>
                  <option v-for="item in unitOptions" :key="item" :value="item">{{ item }}</option>
                </select>
              </div>

              <div>
                <label class="form-label">Quantity</label>
                <input v-model.number="component.quantity" class="form-control" type="number" min="1" step="1" />
              </div>

              <div>
                <label class="form-label">Min vCPU (optional)</label>
                <input v-model.number="component.minVCpu" class="form-control" type="number" min="0" step="1" />
              </div>

              <div>
                <label class="form-label">Min RAM GiB (optional)</label>
                <input v-model.number="component.minMemoryGiB" class="form-control" type="number" min="0" step="1" />
              </div>

              <label class="scenario-checkbox"><input v-model="component.requiresOS" type="checkbox" /> Require matching OS</label>
              
            </div>
            <details class="mt-3">
              <summary class="text-white">Usage quantities</summary>
              <div class="scenario-form-grid mt-2">
                <div v-for="field in usageFields" :key="field.key">
                  <label class="form-label">{{ field.label }}</label>
                  <input :value="getUsage(component, field.key)" type="number" min="0" step="any" class="form-control" @input="setUsage(component, field.key, $event.target.value)" />
                </div>
              </div>
              <p class="text-white-50 small mt-2 mb-0">Leave unused quantities empty. For example, GB-Month storage needs storageGBMonths; GB-Hour RAM needs memoryGB. Annual billing may use billableYears = 1/12 for a monthly equivalent.</p>
            </details>
          </div>
          <button type="button" class="btn btn-outline-primary mt-3" @click="addComponent(scenario)">+ Add component</button>
        </section>
      </div>

      <div class="d-flex gap-2 justify-content-end my-3">
        <button class="btn btn-outline-primary" type="button" @click="exportCSV">Export CSV</button>
        <button class="btn btn-outline-primary" type="button" @click="exportJSON">Export JSON</button>
      </div>

      <div v-if="compareMode === 'provider' && providerA === providerB" class="text-warning text-center">Select two different providers to compare.</div>
      
      <template v-else>

        <!-- Comparison tabs -->
        <div class="comparison-container">
          <div class="tabs-wrapper">
            
            <ul class="nav nav-tabs">
              <li class="nav-item"><button class="nav-link" :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'">Details</button></li>
              <li class="nav-item"><button class="nav-link" :class="{ active: activeTab === 'chart' }" @click="activeTab = 'chart'">Chart</button></li>
            </ul>

            <!-- Chart tab -->
            <div v-if="activeTab === 'chart'" class="comparison-table-container">
              
              <h5 class="text-white">Monthly cost comparison (USD)</h5>
              <div v-if="!compareChartRecords.length" class="text-white-50 py-3">
                No complete scenario evaluations to chart. Check the workload filters and usage quantities.
              </div>

              <template v-else>
                <MetricChart :records="compareChartRecords" :columns="compareChartColumns" :types="['Bar', 'Pie']"/>
              </template>

              <p class="text-white-50 small mt-3 mb-0">
                Only complete evaluations are plotted. Each value is the total calculated monthly cost of all workload components, not the unit price of a single SKU.
              </p>
            </div>
        
            <!-- Details tab -->
            <div v-else class="comparison-table-container">
              
              <!-- Provider comparison table -->
              <template v-if="compareMode === 'provider'">
                <div class="table-responsive">
                  <table class="table comparison-table">
                    
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>{{ providerA }}</th>
                        <th>{{ providerB }}</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <th>Complete</th>
                        <td>{{ providerResultA.complete ? 'Yes' : 'No' }}</td>
                        <td>{{ providerResultB.complete ? 'Yes' : 'No' }}</td>
                      </tr>

                      <tr>
                        <th>Total monthly cost</th>
                        <td>{{ money(providerResultA.totalMonthlyCost) }}</td>
                        <td>{{ money(providerResultB.totalMonthlyCost) }}</td>
                      </tr>

                      <tr>
                        <th>Difference (B − A)</th>
                        <td colspan="2">{{ money(difference(providerResultA.totalMonthlyCost, providerResultB.totalMonthlyCost)) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- Scenario comparison table -->
              <template v-else>
                <div class="table-responsive">
                  <table class="table comparison-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Scenario A</th>
                        <th>Scenario B</th>
                        <th>Difference (B − A)</th>
                      </tr>
                    </thead>
                    
                    <tbody>
                      <tr v-for="item in currentRows" :key="item.label">
                        <th>{{ item.label }}</th>
                        <td>{{ money(item.resultA.totalMonthlyCost) }}</td>
                        <td>{{ money(item.resultB.totalMonthlyCost) }}</td>
                        <td>{{ money(difference(item.resultA.totalMonthlyCost, item.resultB.totalMonthlyCost)) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>
        </div>

        <section v-if="activeTab === 'details'" class="comparison-kpi-section mt-4">

          <!-- Provider KPI cards -->
          <template v-if="compareMode === 'provider'">
            <div class="comparison-kpi-container">
              <div v-for="item in currentRows" :key="item.label" class="pricing-card">
                <h5 class="pricing-card-title">
                  {{ item.label }}
                </h5>

                <div class="pricing-card-price">
                  {{ money(item.result.totalMonthlyCost) }}
                </div>

                <div class="pricing-card-price-unit">
                  per month
                </div>

                <p v-for="issue in item.result.issues" :key="issue" class="text-warning small mt-2">
                  {{ issue }}
                </p>

                <div v-for="component in item.result.components" :key="component.componentIndex" class="pricing-card-meta d-block">
                  <strong>{{ component.skuName }}</strong>

                  <div>
                    {{ component.ServiceCategory }} / {{ component.PriceComponent }}
                  </div>

                  <div>
                    {{ component.PricingUnit }} · {{ component.region || 'Unknown region' }}
                  </div>

                  <div>
                    {{ component.vcpu ?? '–' }} vCPU · {{ component.memoryGiB ?? '–' }} GiB RAM
                  </div>

                  <div>
                    Quantity: {{ component.quantity }} · {{ money(component.monthlyCost) }}/month
                  </div>

                </div>

              </div>
            </div>
          </template>

          <!-- Scenario KPI cards -->
          <template v-else>
            <div v-for="item in currentRows" :key="item.label" class="mb-4">
              <h5 class="text-white">
                {{ item.label }}
              </h5>

              <div class="comparison-kpi-container">
                <div v-for="(result, index) in [ item.resultA, item.resultB ]" :key="index" class="pricing-card">
                  <h6 class="pricing-card-title">
                    Scenario {{ index === 0 ? 'A' : 'B' }} — {{ result.scenarioName }}
                  </h6>

                  <div class="pricing-card-price">
                    {{ money(result.totalMonthlyCost) }}
                  </div>

                  <p v-for="issue in result.issues" :key="issue" class="text-warning small mt-2">
                    {{ issue }}
                  </p>

                  <div v-for="component in result.components" :key="component.componentIndex" class="pricing-card-meta d-block">
                    <strong>{{ component.skuName }}</strong>

                    <div>
                      {{ component.PriceComponent }} · {{ component.PricingUnit }} · {{ component.region }}
                    </div>

                    <div>
                      Quantity: {{ component.quantity }} · {{ money(component.monthlyCost) }}/month
                    </div>

                  </div>

                </div>
              </div>
            </div>
          </template>

        </section>
      </template>
    </template>
  </div>
</template>

<style scoped src="@/assets/styles/views/Compare.scss"></style>