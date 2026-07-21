export const policyPresets = {
  costFirst: {
    Cost: 0.5,
    'Blended Cost': 0.1,
    Performance: 0.15,
    Reliability: 0.15,
    Efficiency: 0.1,
  },
  performanceFirst: {
    Performance: 0.5,
    Efficiency: 0.2,
    Cost: 0.15,
    Reliability: 0.15,
  },
  balanced: {
    Cost: 0.2,
    Performance: 0.2,
    Reliability: 0.2,
    Efficiency: 0.2,
    'Blended Cost': 0.1,
    'Amortized Cost': 0.1,
  },
};