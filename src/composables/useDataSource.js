import { computed } from 'vue';
import { providerMockData } from '@/mock-data/providerMockData';
import { scenarioMockData } from '@/mock-data/scenarioMockData';
import {
  providerMetricDataMap,
  granularityLabels as providerGranularityLabels
} from '@/mock-data/providerMetricDataMap';
import {
  scenarioMetricDataMap,
  scenarioGranularityLabels
} from '@/mock-data/scenarioMetricDataMap';

// This is the single seam between "where data comes from" and "how views use it."
// Right now every getter below just returns the mock data. Later, swap the body
// of each function for a real API call (e.g. an async function that fetches from
// Thesis 1/2's REST endpoints) — every view stays unchanged because they only
// ever consume `dataset`, `metricDataMap`, `granularityLabels` from here.
//
// Note: today these are synchronous computeds wrapping static imports. Once this
// becomes a real fetch, these will need to be async (loading/error state) — see
// the note at the bottom of this file for how that transition would look.

export function useProviderDataSource() {
  const dataset = computed(() => providerMockData);
  const metricDataMap = computed(() => providerMetricDataMap);
  const granularityLabels = computed(() => providerGranularityLabels);
  return { dataset, metricDataMap, granularityLabels };
}

export function useScenarioDataSource() {
  const dataset = computed(() => scenarioMockData);
  const metricDataMap = computed(() => scenarioMetricDataMap);
  const granularityLabels = computed(() => scenarioGranularityLabels);
  return { dataset, metricDataMap, granularityLabels };
}

/*
  FUTURE API VERSION (for reference, not active yet):

  import { ref, computed } from 'vue';

  export function useProviderDataSource() {
    const dataset = ref({});
    const metricDataMap = ref({});
    const granularityLabels = ref({});
    const loading = ref(false);
    const error = ref(null);

    async function load() {
      loading.value = true;
      error.value = null;
      try {
        const res = await fetch('/api/providers/pricing');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        dataset.value = json.dataset;
        metricDataMap.value = json.metricDataMap;
        granularityLabels.value = json.granularityLabels;
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    load();
    return { dataset, metricDataMap, granularityLabels, loading, error };
  }
*/