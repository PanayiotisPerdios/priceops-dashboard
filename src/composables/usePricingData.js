import { shallowRef, ref, computed } from 'vue';
import { loadUnifiedPricing, deriveFilterOptions } from '@/utils/unifiedPricingLoader';

export const LOADER_OPTIONS = { basis: 'resource' };

const records = shallowRef([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref(null);
let request = null;

function load() {
  if (request) {
    return request;
  }

  loading.value = true;
  error.value = null;

  request = loadUnifiedPricing(undefined, LOADER_OPTIONS)
    .then(data => {
      records.value = data;
      loaded.value = true;
    })
    .catch(e => {
      error.value = e;
      request = null;
    })
    .finally(() => {
      loading.value = false;
    });
  return request;
}

const options = computed(function () {
  return deriveFilterOptions(records.value);
});

export function usePricingData() {
  load();
  return { records, loading, loaded, error, options };
}