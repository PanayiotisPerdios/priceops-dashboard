import { computed, unref } from 'vue';

export function useScenarioScoring(items, criteria, categoryWeights) {

  const activeCriteria = computed(() => {
    const currentCriteria = unref(criteria);

    if (currentCriteria === null || currentCriteria === undefined) {
      return [];
    }

    return currentCriteria;
  });


  const categories = computed(() => {
    const uniqueCategories = new Set();

    for (const criterion of activeCriteria.value) {
      uniqueCategories.add(criterion.category);
    }

    return Array.from(uniqueCategories);
  });


  const criteriaRanges = computed(() => {
    const ranges = {};

    for (const criterion of activeCriteria.value) {
      const values = [];

      for (const item of items.value) {
        const value = item[criterion.id];

        if (typeof value === 'number' && Number.isFinite(value)) {
          values.push(value);
        }
      }

      if (values.length > 0) {
        let min = Infinity;
        let max = -Infinity;

        for (const value of values) {
          if (value < min) {
            min = value;
          }

          if (value > max) {
            max = value;
          }
        }

        ranges[criterion.id] = {
          min: min,
          max: max
        };

      } else {
        ranges[criterion.id] = null;
      }
    }

    return ranges;
  });


  function normalizedScore(value, range, direction) {

    if (typeof value !== 'number') {
      return null;
    }

    if (!Number.isFinite(value)) {
      return null;
    }

    if (!range) {
      return null;
    }

    if (range.min === range.max) {
      return null;
    }

    const difference = value - range.min;
    const totalRange = range.max - range.min;

    const fraction = difference / totalRange;

    const clamped = Math.max(0, Math.min(1, fraction));

    if (direction === 'higher') {
      return clamped;
    } else {
      return 1 - clamped;
    }
  }


  const scored = computed(() => {
    const results = [];

    for (const item of items.value) {

      const breakdown = {};

      let weightedSum = 0;
      let availableWeight = 0;

      for (const category of categories.value) {

        const scores = [];

        for (const criterion of activeCriteria.value) {

          if (criterion.category !== category) {
            continue;
          }

          const value = item[criterion.id];
          const range = criteriaRanges.value[criterion.id];
          const direction = criterion.direction;

          const score = normalizedScore(value, range, direction);

          if (score !== null) {
            scores.push(score);
          }
        }

        let categoryScore = null;

        if (scores.length > 0) {
          let sum = 0;

          for (const score of scores) {
            sum += score;
          }

          categoryScore = sum / scores.length;
        }

        breakdown[category] = categoryScore;

        let weight = categoryWeights.value[category];

        if (weight === null || weight === undefined) {
          weight = 0;
        }

        if (categoryScore !== null && weight > 0) {
          weightedSum += categoryScore * weight;
          availableWeight += weight;
        }
      }

      let finalScore = null;

      if (availableWeight > 0) {
        finalScore = weightedSum / availableWeight;
      }

      const scoredItem = {
        ...item,
        breakdown: breakdown,
        score: finalScore
      };

      results.push(scoredItem);
    }


    results.sort(function (a, b) {
      let scoreA = a.score;
      let scoreB = b.score;

      if (scoreA === null || scoreA === undefined) {
        scoreA = -1;
      }

      if (scoreB === null || scoreB === undefined) {
        scoreB = -1;
      }

      return scoreB - scoreA;
    });

    return results;
  });


  const bestPerProvider = computed(() => {
    const best = {};

    for (const item of scored.value) {

      if (item.score === null) {
        continue;
      }

      const provider = item.ServiceProviderName;

      const currentBest = best[provider];

      if (!currentBest || item.score > currentBest.score) {
        best[provider] = item;
      }
    }

    return best;
  });


  return {
    categories: categories,
    criteriaRanges: criteriaRanges,
    scored: scored,
    bestPerProvider: bestPerProvider
  };
}