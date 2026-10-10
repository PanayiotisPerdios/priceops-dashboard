import { computed } from 'vue';

export function useScenarioScoring(items, criteria, categoryWeights) {
  const categories = [...new Set(criteria.map(c => c.category))];

  function normalize(value, min, max, direction) {
    if (value == null || min === max) {
      return null;
    }

    const fraction = (value - min) / (max - min);

    const clamped = Math.max(0, Math.min(1, fraction));

    if (direction === 'higher') {
      return clamped;
    }
    return 1 - clamped;
  }

  const criteriaRanges = computed(() => {
    const ranges = {};

    for (const criterion of criteria) {
      let min = Infinity;
      let max = -Infinity;
 
      for (const item of items.value) {
        const value = item[criterion.id];
 
        if (value == null) {
          continue;
        }
 
        if (value < min) {
          min = value;
        }
        if (value > max) {
          max = value;
        }
      }
 
      if (min <= max) {
        ranges[criterion.id] = { min, max };
      } else {
        ranges[criterion.id] = null;
      }
    }
 
    return ranges;
  });

  function scoreCategory(item, category) {
    const criteriaInCategory = criteria.filter( (criterion) => {
      return criterion.category === category;
    });
 
    const scores = [];
    for (const criterion of criteriaInCategory) {
      const range = criteriaRanges.value[criterion.id];
 
      if (!range) {
        continue;
      }
 
      const score = normalize(item[criterion.id], range.min, range.max, criterion.direction);
 
      if (score != null) {
        scores.push(score);
      }
    }
 
    if (scores.length === 0) {
      return null;
    }
 
    let sum = 0;
    for (const score of scores) {
      sum += score;
    }
    return sum / scores.length;
  }

   const scored = computed( () => {
    let totalWeight = 0;

    for (const category of categories) {
      totalWeight += categoryWeights.value[category] ?? 0;
    }
    if (totalWeight === 0) {
      totalWeight = 1;
    }
 
    const results = [];
 
    for (const item of items.value) {
      const breakdown = {};
      for (const category of categories) {
        breakdown[category] = scoreCategory(item, category);
      }
 

      let weightedSum = 0;
      for (const category of categories) {
        const categoryScore = breakdown[category] ?? 0;
        const weight = categoryWeights.value[category] ?? 0;
        weightedSum += categoryScore * weight;
      }
      const score = weightedSum / totalWeight;
 
      results.push({ ...item, breakdown, score });
    }
 
    results.sort(function (a, b) {
      return b.score - a.score;
    });
 
    return results;
  });

  const bestPerProvider = computed( () => {
    const best = {};
 
    for (const item of scored.value) {
      const currentBest = best[item.provider];
 
      if (!currentBest || item.score > currentBest.score) {
        best[item.provider] = item;
      }
    }
 
    return best;
  });

  return { categories, criteriaRanges, scored, bestPerProvider };
}