import { ref, computed } from 'vue';
import { getMetricsForService } from '@/data/metricRegistry';
import { watch } from 'vue';


function expandCategoryWeights(categoryWeights, service) {
  const fields = getMetricsForService(service);
  const fieldWeights = {};

  const byCategory = {};
  for (const [fieldId, def] of Object.entries(fields)) {
    (byCategory[def.category] ||= []).push(fieldId);
  }

  for (const [category, weight] of Object.entries(categoryWeights)) {
    const fieldsInCategory = byCategory[category] || [];
    if (!fieldsInCategory.length) continue;
    const perField = weight / fieldsInCategory.length;
    fieldsInCategory.forEach(fieldId => {
      fieldWeights[fieldId] = (fieldWeights[fieldId] || 0) + perField;
    });
  }

  return fieldWeights;
}

export function useEvaluation(items, service) {
  const fields = computed(() => getMetricsForService(service.value ?? service));
  const weights = ref({});

  const ranges = computed(() => {
    const result = {};
    for (const key of Object.keys(fields.value)) {
      const values = items.value.map(i => i.metrics?.[key]).filter(v => v != null);
      if (!values.length) continue;
      result[key] = { min: Math.min(...values), max: Math.max(...values) };
    }
    return result;
  });

  function normalize(key, value) {
    const range = ranges.value[key];
    const def = fields.value[key];
    if (!range || !def || range.max === range.min) return 0.5;
    const norm = (value - range.min) / (range.max - range.min);
    return def.direction === 'lower' ? 1 - norm : norm;
  }

  const scored = computed(() => {
    return items.value.map(item => {
      let score = 0;
      let totalWeight = 0;
      for (const [key, w] of Object.entries(weights.value)) {
        if (item.metrics?.[key] == null) continue;
        score += normalize(key, item.metrics[key]) * w;
        totalWeight += w;
      }
      return { ...item, score: totalWeight ? score / totalWeight : 0 };
    }).sort((a, b) => b.score - a.score);
  });

  function paretoFrontier(xKey, yKey, xDirection = 'lower', yDirection = 'higher') {
    return items.value.filter(candidate => {
      return !items.value.some(other => {
        if (other === candidate) return false;
        const betterX = xDirection === 'lower'
          ? other.metrics[xKey] <= candidate.metrics[xKey]
          : other.metrics[xKey] >= candidate.metrics[xKey];
        const betterY = yDirection === 'lower'
          ? other.metrics[yKey] <= candidate.metrics[yKey]
          : other.metrics[yKey] >= candidate.metrics[yKey];
        const strictlyBetter =
          other.metrics[xKey] !== candidate.metrics[xKey] ||
          other.metrics[yKey] !== candidate.metrics[yKey];
        return betterX && betterY && strictlyBetter;
      });
    });
  }

  function applyPreset(presetName, presets) {
    weights.value = expandCategoryWeights(presets[presetName], service.value ?? service);
  }

  return { weights, scored, paretoFrontier, ranges, applyPreset };
}