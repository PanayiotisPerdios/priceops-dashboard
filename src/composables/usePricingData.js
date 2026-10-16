import { shallowRef, ref, computed } from 'vue';
import { loadUnifiedPricing, parseUnifiedCsv, csvToObjects, deriveFilterOptions } from '@/utils/unifiedPricingLoader';
import { isAppSchema, parseAppRows } from '@/utils/appSchemaImport';

export const LOADER_OPTIONS = { basis: 'resource' };

const records = shallowRef([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref(null);
const source = ref(null);      
const sourceName = ref('');    
let request = null;

export function loadDefault() {
  if(source.value === "custom"){
    return Promise.resolve();
  }

  if (request) {
    return request;
  }

  source.value = 'default';
  sourceName.value = 'Built-in dataset';
  loading.value = true;
  error.value = null;

  request = loadUnifiedPricing(undefined, LOADER_OPTIONS)
    .then(data => {
      if (source.value !== 'default') {
        return;
      }

      records.value = data;
      loaded.value = true;
    })
    .catch(e => {
      error.value = e;
      request = null;
      source.value = null;
    })
    .finally(() => {
      loading.value = false;
    });
  return request;
}

export async function importCsvFile(file) {
  const text = await file.text();
  const rows = csvToObjects(text);

  const data = isAppSchema(rows[0])
    ? parseAppRows(rows)
    : parseUnifiedCsv(text, LOADER_OPTIONS);

  if (data.length === 0) {
    throw new Error('No usable rows. Need at least provider, region and a price per hour.');
  }

  records.value = data;
  source.value = 'custom';
  sourceName.value = file.name;
  loaded.value = true;
  error.value = null;
  return data.length;
}

const options = computed(function () {
  return deriveFilterOptions(records.value);
});

export function usePricingData({ autoLoad = true } = {}) {
  if (autoLoad && !source.value) loadDefault();
  return { records, loading, loaded, error, options, source, sourceName };
}