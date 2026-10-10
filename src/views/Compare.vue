<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { policyPresets, DEFAULT_WEIGHTS } from '@/data/policyPresets';
import { usePricingData } from '@/composables/usePricingData';
import { useScenarioScoring } from '@/composables/useScenarioScoring';
import MetricChart from '@/components/MetricChart.vue';
 
import {
  COMPARE_FIELDS, SCENARIO_CRITERIA, CHART_COLUMNS, providerFullNames, presetLabels,
  SUBCATEGORY_LABELS, REGION_GROUP_LABELS, PRICING_MODEL_LABELS, DEFAULT_SUBCATEGORY, SKU_OPTION_LIMIT,
} from '@/data/constants';
import {
  monthlyEstimate, annualEstimate, colorFor, valueFor, uniqSorted,
  deltaFor as calcDeltaFor, winnerSideFor,
} from '@/utils/calculationServices';
import { exportCompareCSV, exportCompareJSON } from '@/utils/exportHelpers';

const { records, loading, error, options } = usePricingData();

const isScrolled = ref(false);

function handleScroll() {
  isScrolled.value = window.scrollY > 20;
}

onMounted( () => {
  window.addEventListener('scroll', handleScroll);
});
 
onUnmounted( () => {
  window.removeEventListener('scroll', handleScroll);
});

//Shared filters
const compareMode = ref('sku');

const domain = ref(null);
const subcategory = ref(DEFAULT_SUBCATEGORY);
const regionGroup = ref(null);
const operatingSystem = ref(null);
const dbEngine = ref(null);
const pricingModel = ref('on_demand');

const inDomain = computed( () => {
  return records.value.filter( (record) => {
    return !domain.value || record.domain === domain.value;
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

const filteredRecords = computed( () => {
  const selectedDomain = domain.value;
  const selectedSubcategory = subcategory.value;
  const selectedRegionGroup = regionGroup.value;
  const selectedOs = operatingSystem.value;
  const selectedEngine = dbEngine.value;
  const selectedPricingModel = pricingModel.value;
 
  return records.value.filter( (record) => {
    if (selectedDomain && record.domain !== selectedDomain) {
      return false;
    }
    if (selectedSubcategory && record.subcategory !== selectedSubcategory) {
      return false;
    }
 
    if (
      selectedRegionGroup &&
      record.region_group !== selectedRegionGroup &&
      record.region_group !== 'global'
    ) {
      return false;
    }
 
    if (selectedOs && record.operating_system !== selectedOs) {
      return false;
    }
    if (selectedEngine && record.db_engine !== selectedEngine) {
      return false;
    }
    if (selectedPricingModel && record.pricing_model !== selectedPricingModel) {
      return false;
    }
 
    return true;
  });
});

//Provider mode
const provider1 = ref(null);
const provider2 = ref(null);
const region1 = ref(null);
const region2 = ref(null);
const sku1 = ref(null);
const sku2 = ref(null);

function regionsFor(provider) {
  const rowsForProvider = filteredRecords.value.filter( (record) => {
    return record.provider === provider;
  });
 
  return uniqSorted(rowsForProvider.map( (record) => {
    return record.region;
  }));
}

const regionOptions1 = computed( () => {
  return regionsFor(provider1.value);
});

const regionOptions2 = computed( () => {
  return regionsFor(provider2.value);
});

function findFilteredById(id) {
  const found = filteredRecords.value.find( (record) => {
    return record.id === id;
  });
  return found || null;
}
 
const skuRecord1 = computed( () => {
  return findFilteredById(sku1.value);
});
 
const skuRecord2 = computed( () => {
  return findFilteredById(sku2.value);
});

function matching(provider, region) {
  if (!provider) {
    return [];
  }
 
  return filteredRecords.value.filter( (record) => {
    const providerMatches = record.provider === provider;
    const regionMatches = !region || record.region === region;
    return providerMatches && regionMatches;
  });
}

function limitedOptions(list, selected) {
  const sorted = [...list].sort( (a, b) => {
    const byName = a.skuName.localeCompare(b.skuName);
    if (byName !== 0) {
      return byName;
    }
    return a.effective_price_hr - b.effective_price_hr;
  });
 
  const limited = sorted.slice(0, SKU_OPTION_LIMIT);
 
  if (selected && !limited.includes(selected)) {
    limited.unshift(selected);
  }
 
  return limited;
}

const skuMatches1 = computed( () => {
  return matching(provider1.value, region1.value);
});
 
const skuMatches2 = computed( () => {
  return matching(provider2.value, region2.value);
});
 
const skuOptions1 = computed( () => {
  return limitedOptions(skuMatches1.value, skuRecord1.value);
});
 
const skuOptions2 = computed( () => {
  return limitedOptions(skuMatches2.value, skuRecord2.value);
});

function skuLabel(record) {
  return `${record.skuName} · ${record.region} · ${record.effective_price_hr.toFixed(4)}/hr`;
}
//Scenario mode
const presetNames = Object.keys(policyPresets);

const scenarioPreset1 = ref(null);
const scenarioPreset2 = ref(null);

const weights1 = computed( () => {
  return policyPresets[scenarioPreset1.value] ?? DEFAULT_WEIGHTS;
});
 
const weights2 = computed( () => {
  return policyPresets[scenarioPreset2.value] ?? DEFAULT_WEIGHTS;
});

const scoringPool = computed( () => {
  return filteredRecords.value.filter( (record) => {
    return record.vcpu_count != null && record.memory_gb != null;
  });
});

const { scored: scored1 } = useScenarioScoring(filteredRecords, SCENARIO_CRITERIA, weights1);
const { scored: scored2 } = useScenarioScoring(filteredRecords, SCENARIO_CRITERIA, weights2);

const scenarioRecord1 = computed( () => {
  if (!scenarioPreset1.value) {
    return null;
  }
  return scored1.value[0] ?? null;
});
 
const scenarioRecord2 = computed( () => {
  if (!scenarioPreset2.value) {
    return null;
  }
  return scored2.value[0] ?? null;
});

//Unified record1/record2 across both modes
const record1 = computed( () => {
  if (compareMode.value === 'scenario') {
    return scenarioRecord1.value;
  }
  return skuRecord1.value;
});
 
const record2 = computed( () => {
  if (compareMode.value === 'scenario') {
    return scenarioRecord2.value;
  }
  return skuRecord2.value;
});

const noMatches = computed( () => {
  if (compareMode.value === 'scenario') {
    return scoringPool.value.length === 0;
  }
 
  const sideAEmpty = !!provider1.value && skuMatches1.value.length === 0;
  const sideBEmpty = !!provider2.value && skuMatches2.value.length === 0;
  return sideAEmpty || sideBEmpty;
});

const sideLabels = computed( () => {
  const a = record1.value;
  const b = record2.value;
 
  if (!a || !b) {
    return ['', ''];
  }
 
  const sameProvider = a.provider === b.provider;
 
  const labelA = sameProvider ? `${a.provider} · ${a.region}` : a.provider;
  const labelB = sameProvider ? `${b.provider} · ${b.region}` : b.provider;
  return [labelA, labelB];
});
 
function subcategoryLabel(record) {
  return SUBCATEGORY_LABELS[record.subcategory] ?? record.subcategory;
}
 
function pricingModelLabel(model) {
  return PRICING_MODEL_LABELS[model] ?? model;
}

const comparabilityNotes = computed( () => {
  const a = record1.value;
  const b = record2.value;
 
  if (!a || !b) {
    return [];
  }
 
  const notes = [];
 
  if (a.resource_type !== b.resource_type) {
    notes.push(
      `Different resource types (${subcategoryLabel(a)} vs ${subcategoryLabel(b)}) - prices are not directly comparable.`
    );
  }
 
  if ((a.operating_system ?? null) !== (b.operating_system ?? null)) {
    notes.push(
      `Different OS / license (${a.operating_system ?? 'n/a'} vs ${b.operating_system ?? 'n/a'}).`
    );
  }
 
  if (a.pricing_model !== b.pricing_model) {
    notes.push(
      `Different pricing models (${pricingModelLabel(a.pricing_model)} vs ${pricingModelLabel(b.pricing_model)}).`
    );
  }
 
  if ((a.db_engine ?? null) !== (b.db_engine ?? null)) {
    notes.push(
      `Different database engines (${a.db_engine ?? 'n/a'} vs ${b.db_engine ?? 'n/a'}).`
    );
  }
 
  if (a.deployment && b.deployment && a.deployment !== b.deployment) {
    notes.push('Different deployment options (single vs multi-AZ).');
  }
 
  if (a.specs_inferred || b.specs_inferred) {
    notes.push('Some specs are estimated, not published by the provider.');
  }
 
  return notes;
});

function toChartRecord(record) {
  return {
    id: record.id,
    name: record.skuName,
    subtitle: `${record.provider} · ${record.region}`,
    color: colorFor(record.provider),
    vcpu_count: record.vcpu_count,
    memory_gb: record.memory_gb,
    effective_price_hr: record.effective_price_hr,
    price_per_vcpu_hr: record.price_per_vcpu_hr,
    data_quality_score: record.data_quality_score,
  };
}

const chartRecords = computed( () => {
  const chosen = [record1.value, record2.value].filter(Boolean);
  return chosen.map(toChartRecord);
});

const cards = computed( () => {
  const allCards = [
    { key: 'A', rec: record1.value, preset: scenarioPreset1.value },
    { key: 'B', rec: record2.value, preset: scenarioPreset2.value },
  ];
 
  return allCards.filter( (card) => {
    return card.rec;
  });
});

//Resets
function resetSelection() {
  sku1.value = null;
  sku2.value = null;
  scenarioPreset1.value = null;
  scenarioPreset2.value = null;
}

function onDomainChange() {
  dbEngine.value = null;
 
  if (subcategoryOptions.value.includes(DEFAULT_SUBCATEGORY)) {
    subcategory.value = DEFAULT_SUBCATEGORY;
  } else {
    subcategory.value = null;
  }
 
  resetSelection();
}

function resetFilters() {
  provider1.value = null;
  provider2.value = null;
  scenarioPreset1.value = null;
  scenarioPreset2.value = null;

  domain.value = null;
  subcategory.value = DEFAULT_SUBCATEGORY;
  regionGroup.value = null;
  operatingSystem.value = null;
  dbEngine.value = null;
  pricingModel.value = 'on_demand';
  
  resetSelection();
}

function deltaFor(field) {
  return calcDeltaFor(record1.value, record2.value, field);
}

function winnerSide(field) {
  return winnerSideFor(record1.value, record2.value, field);
}

//Export
function exportCSV() {
  exportCompareCSV(record1.value, record2.value, COMPARE_FIELDS);
}
function exportJSON() {
  exportCompareJSON(record1.value, record2.value, COMPARE_FIELDS);
}

</script>

<template>
<div class="page">
 
  <div class="btn-group">
    <button type="button" class="btn btn-outline-light" :class="{ active: compareMode === 'sku' }"
      @click="compareMode = 'sku'; resetFilters()">
      Provider
    </button>
    <button type="button" class="btn btn-outline-light" :class="{ active: compareMode === 'scenario' }"
      @click="compareMode = 'scenario'; resetFilters()">
      Scenario
    </button>
  </div>
 
  <div v-if="loading" class="text-white-50 mt-3">Loading pricing data…</div>
  <div v-else-if="error" class="text-danger mt-3">Could not load the pricing data: {{ error.message }}</div>
 
  <template v-else>
 
  <div class="top-filter-bar d-flex flex-column align-items-center gap-3 py-2" :class="{ scrolled: isScrolled }">
 
    <div class="d-flex justify-content-center align-items-end gap-3 flex-wrap">
 
      <template v-if="compareMode === 'sku'">
 
        <div class="comparison-select-group">
          <div class="data-ex-form-cont">
            <label class="form-label" style="color: white">Provider A</label>
            <select class="form-select w-100 custom-form-select" v-model="provider1" @change="region1 = null; sku1 = null">
              <option :value="null" disabled>Select provider</option>
              <option v-for="p in options.providers" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont">
            <label class="form-label" style="color: white">Region A</label>
            <select class="form-select custom-form-select" v-model="region1" :disabled="!provider1" @change="sku1 = null">
              <option :value="null">Any region</option>
              <option v-for="r in regionOptions1" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont sku-field">
            <label class="form-label" style="color: white">SKU A</label>
            <select class="form-select custom-form-select" v-model="sku1" :disabled="!provider1">
              <option :value="null" disabled>Select a SKU</option>
              <option v-for="r in skuOptions1" :key="r.id" :value="r.id" :disabled="r.id === sku2">
                {{ skuLabel(r) }}
              </option>
            </select>
            <small v-if="skuMatches1.length > SKU_OPTION_LIMIT" class="text-white-50">
              First {{ SKU_OPTION_LIMIT }} of {{ skuMatches1.length }} - narrow with region / filters
            </small>
          </div>
        </div>
 
        <div class="comparison-select-group">
          <div class="data-ex-form-cont">
            <label class="form-label" style="color: white">Provider B</label>
            <select class="form-select custom-form-select" v-model="provider2" @change="region2 = null; sku2 = null">
              <option :value="null" disabled>Select provider</option>
              <option v-for="p in options.providers" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont">
            <label class="form-label" style="color: white">Region B</label>
            <select class="form-select custom-form-select" v-model="region2" :disabled="!provider2" @change="sku2 = null">
              <option :value="null">Any region</option>
              <option v-for="r in regionOptions2" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
 
          <div class="data-ex-form-cont sku-field">
            <label class="form-label" style="color: white">SKU B</label>
            <select class="form-select custom-form-select" v-model="sku2" :disabled="!provider2">
              <option :value="null" disabled>Select a SKU</option>
              <option v-for="r in skuOptions2" :key="r.id" :value="r.id" :disabled="r.id === sku1">
                {{ skuLabel(r) }}
              </option>
            </select>
            <small v-if="skuMatches2.length > SKU_OPTION_LIMIT" class="text-white-50">
              First {{ SKU_OPTION_LIMIT }} of {{ skuMatches2.length }} - narrow with region / filters
            </small>
          </div>
        </div>
 
      </template>
 
      <template v-else>
 
        <div class="comparison-select-group">
          <div class="data-ex-form-cont">
            <label class="form-label" style="color: white">Scenario A</label>
            <select class="form-select w-100 custom-form-select" v-model="scenarioPreset1">
              <option v-if="!scenarioPreset1" :value="null" disabled selected hidden>Choose preset</option>
              <option v-for="name in presetNames" :key="name" :value="name" :disabled="name === scenarioPreset2">
                {{ presetLabels[name] ?? name }}
              </option>
            </select>
          </div>
        </div>
 
        <div class="comparison-select-group">
          <div class="data-ex-form-cont">
            <label class="form-label" style="color: white">Scenario B</label>
            <select class="form-select w-100 custom-form-select" v-model="scenarioPreset2">
              <option v-if="!scenarioPreset2" :value="null" disabled selected hidden>Choose preset</option>
              <option v-for="name in presetNames" :key="name" :value="name" :disabled="name === scenarioPreset1">
                {{ presetLabels[name] ?? name }}
              </option>
            </select>
          </div>
        </div>
 
      </template>
 
    </div>
 
    <div class="d-flex justify-content-center align-items-end gap-3 flex-wrap">
 
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Domain</label>
        <select class="form-select custom-form-select" v-model="domain" @change="onDomainChange">
          <option :value="null">Any domain</option>
          <option v-for="d in options.domains" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
 
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Resource type</label>
        <select class="form-select custom-form-select" v-model="subcategory" @change="resetSelection">
          <option :value="null">Any type</option>
          <option v-for="s in subcategoryOptions" :key="s" :value="s">{{ SUBCATEGORY_LABELS[s] ?? s }}</option>
        </select>
      </div>
 
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Area</label>
        <select class="form-select w-100 custom-form-select" v-model="regionGroup" @change="resetSelection">
          <option :value="null">Any area</option>
          <option v-for="g in options.regionGroups" :key="g" :value="g">{{ REGION_GROUP_LABELS[g] ?? g }}</option>
        </select>
      </div>
 
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Operating System</label>
        <select class="form-select w-100 custom-form-select" v-model="operatingSystem" @change="resetSelection">
          <option :value="null">Any</option>
          <option v-for="os in options.operatingSystems" :key="os" :value="os">{{ os }}</option>
        </select>
      </div>
 
      <div v-if="engineOptions.length" class="data-ex-form-cont">
        <label class="form-label" style="color: white">DB engine</label>
        <select class="form-select w-100 custom-form-select" v-model="dbEngine" @change="resetSelection">
          <option :value="null">Any engine</option>
          <option v-for="e in engineOptions" :key="e" :value="e">{{ e }}</option>
        </select>
      </div>
 
      <div class="data-ex-form-cont">
        <label class="form-label" style="color: white">Pricing model</label>
        <select class="form-select w-100 custom-form-select" v-model="pricingModel" @change="resetSelection">
          <option :value="null">Any</option>
          <option v-for="m in options.pricingModels" :key="m" :value="m">{{ PRICING_MODEL_LABELS[m] ?? m }}</option>
        </select>
      </div>
 
      <div class="data-ex-form-cont">
        <button type="button" class="btn btn-outline-light" @click="resetFilters">Reset</button>
      </div>
 
      <div>
        <label class="form-label" style="color: white">Export</label>
        <div class="data-ex-form-cont d-flex gap-3">
          <button type="button" class="btn btn-outline-primary" :disabled="!record1 || !record2" @click="exportCSV">CSV</button>
          <button type="button" class="btn btn-outline-primary" :disabled="!record1 || !record2" @click="exportJSON">JSON</button>
        </div>
      </div>
 
    </div>
 
  </div>
  
  <div class="text-center text-white-50 small mt-1">
    {{ filteredRecords.length.toLocaleString() }} records match the current filters
  </div>
  <div v-if="noMatches" class="text-center text-white-50 small mt-1">No records match the current filters</div>
  
  <div v-if="record1 && record2" class="comparison-results">
    <div v-if="comparabilityNotes.length" class="text-warning small mt-2">
        <div v-for="note in comparabilityNotes" :key="note">⚠ {{ note }}</div>
    </div>
  </div>
 
  <div v-if="record1 || record2" class="comparison-container">
    <div class="chart-host mb-5">
      <MetricChart :records="chartRecords" :columns="CHART_COLUMNS" />
    </div>
  </div>
 
  <div v-if="record1 && record2" class="comparison-results">
 
    <div class="comparison-kpi-container">
 
      <div v-for="card in cards" :key="card.key" class="pricing-card mt-3">
 
        <div class="pricing-card-header">
          <h3 class="pricing-card-title">{{ card.rec.instance_type || card.rec.skuName }}</h3>
          <span class="pricing-badge" :class="card.rec.specs_complete ? 'pricing-badge-confirmed' : 'pricing-badge-inferred'">
            {{ card.rec.specs_complete ? 'CONFIRMED' : 'INFERRED' }}
          </span>
        </div>
 
        <div class="pricing-card-subtitle">
          {{ providerFullNames[card.rec.provider] ?? card.rec.provider }} · {{ card.rec.provider }} - {{ card.rec.product_family ?? 'Unknown' }}
        </div>
 
        <div v-if="compareMode === 'scenario'" class="pricing-card-subtitle text-white-50 small">
          Top pick under "{{ presetLabels[card.preset] ?? card.preset }}" — score {{ (card.rec.score * 100).toFixed(1) }}%
        </div>
 
        <div class="pricing-card-specs">
          {{ card.rec.vcpu_count ?? '–' }} vCPU · {{ card.rec.memory_gb ?? '–' }} GB RAM
        </div>
 
        <div class="pricing-card-price">{{ card.rec.effective_price_hr.toFixed(4) }}</div>
        <div class="pricing-card-price-unit">{{ card.rec.currencyCode }} · per hour</div>
 
        <div class="pricing-card-estimates">
          <div>Est. monthly: {{ card.rec.currencyCode }} {{ monthlyEstimate(card.rec)?.toFixed(2) }}</div>
          <div>Est. annual: {{ card.rec.currencyCode }} {{ annualEstimate(card.rec)?.toFixed(2) }}</div>
          <div v-if="card.rec.price_per_vcpu_hr != null">Per vCPU-hr: {{ card.rec.currencyCode }} {{ card.rec.price_per_vcpu_hr.toFixed(4) }}</div>
        </div>
 
        <div class="pricing-card-meta">
          <div>
            <span class="pricing-card-meta-label">Region</span>{{ card.rec.provider }} - {{ card.rec.region }}<template v-if="card.rec.region_name"> ({{ card.rec.region_name }})</template>
          </div>
          <div><span class="pricing-card-meta-label">Area</span>{{ REGION_GROUP_LABELS[card.rec.region_group] ?? card.rec.region_group ?? 'Unknown' }}</div>
          <div><span class="pricing-card-meta-label">Type</span>{{ SUBCATEGORY_LABELS[card.rec.subcategory] ?? card.rec.subcategory }}</div>
          <div><span class="pricing-card-meta-label">Pricing</span>{{ PRICING_MODEL_LABELS[card.rec.pricing_model] ?? card.rec.pricing_model }}</div>
          <div v-if="card.rec.operating_system"><span class="pricing-card-meta-label">OS</span>{{ card.rec.operating_system }}</div>
          <div v-if="card.rec.db_engine"><span class="pricing-card-meta-label">Engine</span>{{ card.rec.db_engine }}</div>
          <div v-if="card.rec.deployment"><span class="pricing-card-meta-label">Deployment</span>{{ card.rec.deployment === 'multi_az' ? 'Multi-AZ' : 'Single-AZ' }}</div>
          <div v-if="card.rec.tenancy"><span class="pricing-card-meta-label">Tenancy</span>{{ card.rec.tenancy }}</div>
        </div>
 
      </div>
 
    </div>
 
    <div class="table-responsive comparison-table-container">
      <table class="comparison-table table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>{{ sideLabels[0] }}</th>
            <th>{{ sideLabels[1] }}</th>
            <th>Delta</th>
            <th>Winner</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in COMPARE_FIELDS" :key="field.id">
            <td>{{ field.name }}</td>
            <td>{{ valueFor(record1, field) ?? 'N/A' }}</td>
            <td>{{ valueFor(record2, field) ?? 'N/A' }}</td>
            <td v-if="deltaFor(field) !== null && deltaFor(field) !== undefined" :class="Number(deltaFor(field)) < 0 ? 'negative-delta' : 'positive-delta'">{{ deltaFor(field) }}%</td>
            <td v-else>N/A</td>
            <td>
              <span v-if="winnerSide(field) !== null" class="winner-badge" :class="winnerSide(field) === 0 ? 'positive-badge' : 'negative-badge'">
                {{ sideLabels[winnerSide(field)] }}
              </span>
              <span v-else>N/A</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
 
  </template>
</div>
</template>

<style scoped src="@/assets/styles/views/Compare.scss"></style>