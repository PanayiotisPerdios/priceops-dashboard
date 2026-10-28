import { shallowRef, ref, computed } from 'vue';
import { loadUnifiedPricing, importPricingData, deriveFilterOptions } from '@/utils/pricingDataLoader';

const records = shallowRef([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref(null);
const source = ref(null);      
const sourceName = ref('');    
const importReport = ref(null);
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

  request = loadUnifiedPricing()
    .then(({ records: data, report }) => {
      if (source.value !== 'default') {
        return;
      }

      records.value = data;
      importReport.value = report;
      loaded.value = true;

      console.log('Default import report:', report);
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

export async function importPricingFile(file) {
  importReport.value = null;
  
  const text = await file.text();
  
  const extension = file.name.split('.').pop().toLowerCase();

  if (extension !== 'csv' && extension !== 'json') {
    throw new Error('Unsupported file format. Please upload CSV or JSON.');
  }

  const { records: data, report } = await importPricingData(text, extension);

  importReport.value = report;

  if (data.length === 0) {
    throw new Error('No usable pricing records found.');
  }

  records.value = data;
  source.value = 'custom';
  sourceName.value = file.name;
  loaded.value = true;
  error.value = null;

  console.log('Custom import report:', report);

  return data.length;

}

const options = computed(function () {
  return deriveFilterOptions(records.value);
});

export function usePricingData({ autoLoad = true } = {}) {
  if (autoLoad && !source.value) loadDefault();
  return { records, loading, loaded, error, options, source, sourceName, importReport };
}