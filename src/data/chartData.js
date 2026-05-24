export const metricDataMap = {
    Cost: [10, 20, 30],
    Usage: [100, 200, 150],
    Performance: [50, 70, 65],
    Efficiency: [80, 85, 90],
    Reliability: [99, 98, 97],
    'Amortized Cost': [5, 15, 25],
    'Blended Cost': [30, 40, 50],
    'Forecasted Cost': [1, 2, 3]
}

export const granularityLabels = {
    "daily": ['Mon', 'Tue', 'Wed', 'Thu'],
    "weekly": ['Week 1', 'Week 2', 'Week 3'],
    "monthly": ['Jan', 'Feb', 'Mar'],
    "hourly": ['01:00', '02:00', '03.00', '04.00']
}

export const providerMetricDataMap = {
  AWS: {
    'Cost': [10, 20, 30, 40],
    'Usage': [100, 200, 150, 250],
    'Performance': [40, 55, 60, 70],
    'Efficiency': [75, 78, 82, 85],
    'Reliability': [99, 98, 97, 99],
    'Amortized Cost': [5, 12, 18, 22],
    'Blended Cost': [30, 35, 40, 45],
    'Forecasted Cost': [12, 18, 25, 33]
  },

  Azure: {
    'Cost': [15, 25, 35, 45],
    'Usage': [120, 180, 220, 260],
    'Performance': [45, 60, 65, 75],
    'Efficiency': [72, 76, 80, 83],
    'Reliability': [98, 97, 98, 99],
    'Amortized Cost': [7, 14, 20, 26],
    'Blended Cost': [28, 33, 38, 44],
    'Forecasted Cost': [14, 20, 28, 36]
  },

  'Google Cloud': {
    'Cost': [8, 18, 28, 38],
    'Usage': [90, 210, 170, 240],
    'Performance': [50, 65, 70, 80],
    'Efficiency': [78, 82, 86, 88],
    'Reliability': [99, 99, 98, 99],
    'Amortized Cost': [4, 10, 16, 21],
    'Blended Cost': [25, 30, 36, 42],
    'Forecasted Cost': [10, 16, 22, 30]
  }
}