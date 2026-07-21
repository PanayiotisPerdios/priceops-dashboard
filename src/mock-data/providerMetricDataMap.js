import { providers, services } from '@/data/filters';
import { getMetricsForService } from '@/data/metricRegistry';

const POINTS_PER_SERIES = 4;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function generateSeries(min, max, seed) {
  const rand = seededRandom(seed);
  const span = max - min;
  let current = min + rand() * span;
  const series = [];

  for (let i = 0; i < POINTS_PER_SERIES; i++) {
    const step = (rand() - 0.5) * span * 0.15; // small +/- 7.5% wobble per step
    current = Math.max(min, Math.min(max, current + step));
    series.push(Number(current.toFixed(2)));
  }

  return series;
}

function buildProviderMetricDataMap() {
  const result = {};

  providers.forEach((provider) => {
    result[provider] = {};

    services.forEach((service) => {
      const fields = getMetricsForService(service);
      result[provider][service] = {};

      Object.entries(fields).forEach(([fieldId, def]) => {
        const [min, max] = def.range || [0, 100];
        const seed = hashString(`${provider}-${service}-${fieldId}`);
        result[provider][service][fieldId] = generateSeries(min, max, seed);
      });
    });
  });

  return result;
}

export const providerMetricDataMap = buildProviderMetricDataMap();

export const granularityLabels = {
  daily: ['Mon', 'Tue', 'Wed', 'Thu'],
  weekly: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  monthly: ['Jan', 'Feb', 'Mar', 'Apr'],
  hourly: ['01:00', '02:00', '03:00', '04:00']
};