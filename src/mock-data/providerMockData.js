import { providers, services } from '@/data/filters';
import { getMetricsForService } from '@/data/metricRegistry';

const PROVIDER_BIAS = {
  AWS: 0.55,          
  Azure: 0.62,
  'Google Cloud': 0.45,
};

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function generateValue(min, max, provider, seed) {
  const rand = seededRandom(seed);
  const bias = PROVIDER_BIAS[provider] ?? 0.5;
  const t = (rand() * 0.5) + (bias * 0.5);
  const value = min + t * (max - min);
  return Number(value.toFixed(value < 1 ? 6 : 2));
}

function buildProviderMockData() {
  const result = {};

  providers.forEach((provider) => {
    result[provider] = {};

    services.forEach((service) => {
      const fields = getMetricsForService(service);
      result[provider][service] = {};

      Object.entries(fields).forEach(([fieldId, def]) => {
        const category = def.category;
        const [min, max] = def.range;
        const seed = hashString(`${provider}-${service}-${fieldId}`);

        result[provider][service][category] = result[provider][service][category] || {};
        result[provider][service][category][fieldId] = generateValue(min, max, provider, seed);
      });
    });
  });

  return result;
}

export const providerMockData = buildProviderMockData();