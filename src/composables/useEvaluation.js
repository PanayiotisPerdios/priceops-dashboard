import { ref, computed } from 'vue';
import { getMetricsForService } from '@/data/metricRegistry';

function expandCategoryWeights(categoryWeights, fields) {
  const byCategory = {};
  for (const [fieldId, def] of Object.entries(fields)) {
    (byCategory[def.category] ||= []).push(fieldId);
  }

  const fieldWeights = {};
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

  const categoryWeights = ref({});

  const weights = computed(() => expandCategoryWeights(categoryWeights.value, fields.value));

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

  function categoryBreakdown(item) {
    const byCategory = {};
    for (const [fieldId, def] of Object.entries(fields.value)) {
      if (item.metrics?.[fieldId] == null) continue;
      const norm = normalize(fieldId, item.metrics[fieldId]);
      const bucket = (byCategory[def.category] ||= { sum: 0, count: 0 });
      bucket.sum += norm;
      bucket.count += 1;
    }
    const result = {};
    for (const [category, { sum, count }] of Object.entries(byCategory)) {
      result[category] = count ? sum / count : null;
    }
    return result;
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
      return {
        ...item,
        score: totalWeight ? score / totalWeight : 0,
        breakdown: categoryBreakdown(item),
      };
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


  function paretoFrontier2D(points) {
    return points.filter(candidate => {
      return !points.some(other => {
        if (other === candidate) return false;
        const betterX = other.x >= candidate.x;
        const betterY = other.y >= candidate.y;
        const strictlyBetter = other.x !== candidate.x || other.y !== candidate.y;
        return betterX && betterY && strictlyBetter;
      });
    });
  }

  function applyPreset(presetName, presets) {
    categoryWeights.value = { ...presets[presetName] };
  }

  function setCategoryWeight(category, value) {
    categoryWeights.value = { ...categoryWeights.value, [category]: value };
  }

  return {
    categoryWeights,
    weights,
    scored,
    ranges,
    paretoFrontier,
    paretoFrontier2D,
    applyPreset,
    setCategoryWeight,
  };
}