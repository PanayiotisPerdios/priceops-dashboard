// src/composables/useScenarioScoring.js
import { computed } from 'vue';

/**
 * Shared weighted MCDA scoring for pricing records.
 * Extracted from Evaluation.vue's inline logic so both Evaluation.vue
 * and compare.vue (scenario mode) score items the same way.
 *
 * @param {import('vue').Ref<Array>} items - reactive array of pricing records to score
 * @param {Array<{id:string,name:string,category:string,direction:'higher'|'lower'}>} criteria
 * @param {import('vue').Ref<Object>} categoryWeights - reactive { [category]: weight (0-1) }
 */
export function useScenarioScoring(items, criteria, categoryWeights) {
  const categories = [...new Set(criteria.map(c => c.category))];

  function normalize(value, min, max, direction) {
    if (value == null || min === max) return null;
    const pct = (value - min) / (max - min);
    const clamped = Math.max(0, Math.min(1, pct));
    return direction === 'higher' ? clamped : 1 - clamped;
  }

  const criteriaRanges = computed(() => {
    const ranges = {};
    for (const c of criteria) {
      const values = items.value.map(r => r[c.id]).filter(v => v != null);
      ranges[c.id] = values.length
        ? { min: Math.min(...values), max: Math.max(...values) }
        : null;
    }
    return ranges;
  });

  const scored = computed(() => {
    return items.value
      .map(item => {
        const breakdown = {};
        for (const cat of categories) {
          const catScores = criteria
            .filter(c => c.category === cat)
            .map(c => {
              const range = criteriaRanges.value[c.id];
              return range ? normalize(item[c.id], range.min, range.max, c.direction) : null;
            })
            .filter(s => s != null);
          breakdown[cat] = catScores.length
            ? catScores.reduce((a, b) => a + b, 0) / catScores.length
            : null;
        }
        const totalWeight =
          categories.reduce((sum, cat) => sum + (categoryWeights.value[cat] ?? 0), 0) || 1;
        const score =
          categories.reduce(
            (sum, cat) => sum + (breakdown[cat] ?? 0) * (categoryWeights.value[cat] ?? 0),
            0
          ) / totalWeight;
        return { ...item, breakdown, score };
      })
      .sort((a, b) => b.score - a.score);
  });

  /** Top-scoring item per provider — used by compare.vue's scenario matrix. */
  const bestPerProvider = computed(() => {
    const best = {};
    for (const item of scored.value) {
      if (!best[item.provider] || item.score > best[item.provider].score) {
        best[item.provider] = item;
      }
    }
    return best;
  });

  return { categories, criteriaRanges, scored, bestPerProvider };
}