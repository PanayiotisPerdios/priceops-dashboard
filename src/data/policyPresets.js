export const policyPresets = {
  costFirst: {
    Cost: 0.6,
    Efficiency: 0.25,
    Performance: 0.15,
  },
  performanceFirst: {
    Cost: 0.15,
    Efficiency: 0.25,
    Performance: 0.6,
  },
  balanced: {
    Cost: 0.4,
    Efficiency: 0.3,
    Performance: 0.3,
  },
  valueFirst: {
    Cost: 0.2,
    Efficiency: 0.6,
    Performance: 0.2,
  },
};
 
export const DEFAULT_WEIGHTS = policyPresets.balanced;