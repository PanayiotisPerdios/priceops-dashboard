import { providerColors } from '@/data/constants';

const FALLBACK_PALETTE = ['#6366f1', '#ca309e', '#22c55e', '#eab308'];

const HOURS_PER_MONTH = 730;
const HOURS_PER_YEAR = 8760;

export function monthlyEstimate(record) {
  if (!record?.effective_price_hr) {
    return null;
  }
  return record.effective_price_hr * HOURS_PER_MONTH;
}

export function annualEstimate(record) {
  if (!record?.effective_price_hr) {
    return null;
  }
  return record.effective_price_hr * HOURS_PER_YEAR;
}

export function colorFor(provider, index = 0) {
  const configuredColor = providerColors[provider];

  if (configuredColor) {
    return configuredColor;
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

export function valueFor(record, field) {
  if (!record) {
    return null;
  }
  return record[field.id];
}

export function deltaFor(record1, record2, field) {
  const a = valueFor(record1, field);
  const b = valueFor(record2, field);
 
  if (a == null || b == null || !b) {
    return null;
  }
 
  const percentDifference = ((a - b) / b) * 100;
  return percentDifference.toFixed(1);
}

export function paretoFrontier2D(points) {
  function isDominated(point) {
    for (const other of points) {

      if (other.id === point.id) {
        continue;
      }
 
      const atLeastAsGoodOnBoth = other.x >= point.x && other.y >= point.y;
      const strictlyBetterOnOne = other.x > point.x || other.y > point.y;
 
      if (atLeastAsGoodOnBoth && strictlyBetterOnOne) {
        return true;
      }
    }
    return false;
  }
 
  return points.filter(function (point) {
    return !isDominated(point);
  });
}

export function winnerSideFor(record1, record2, field) {
  const a = valueFor(record1, field);
  const b = valueFor(record2, field);
 
  if (a == null || b == null || a === b) {
    return null;
  }
 
  let firstWins;
  if (field.direction === 'higher') {
    firstWins = a > b;
  } else {
    firstWins = a < b;
  }
 
  if (firstWins) {
    return 0;
  }
  return 1;
}

export function winnerFor(record1, record2, field) {
  const side = winnerSideFor(record1, record2, field);
 
  if (side === null) {
    return null;
  }
  if (side === 0) {
    return record1.provider;
  }
  return record2.provider;
}

export function uniqSorted(arr) {
  const truthyValues = arr.filter(Boolean);
  const unique = [...new Set(truthyValues)];
  return unique.sort();
}

export function median(sortedAsc) {
  if (sortedAsc.length === 0) {
    return null;
  }
 
  const middle = Math.floor(sortedAsc.length / 2);
 
  if (sortedAsc.length % 2 === 1) {
    return sortedAsc[middle];
  }
 
  return (sortedAsc[middle - 1] + sortedAsc[middle]) / 2;
}

export function cheapestPerSku(list) {
  const cheapestByKey = new Map();
 
  for (const record of list) {
    const key = [
      record.provider,
      record.skuName,
      record.operating_system ?? '',
      record.pricing_model ?? '',
    ].join('|');
 
    const currentCheapest = cheapestByKey.get(key);
 
    if (!currentCheapest || record.effective_price_hr < currentCheapest.effective_price_hr) {
      cheapestByKey.set(key, record);
    }
  }
 
  return [...cheapestByKey.values()];
}

export function fmt(value, digits = 4) {
  if (value == null) {
    return 'N/A';
  }
  return value.toFixed(digits);
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildExportRows(record1, record2) {
  return COMPARE_FIELDS.map(field => ({
    metric: field.name,
    [record1.provider]: valueFor(record1, field),
    [record2.provider]: valueFor(record2, field),
    delta: deltaFor(record1, record2, field),
    winner: winnerFor(record1, record2, field),
  }));
}

export function exportCSV(record1, record2) {
  const rows = buildExportRows(record1, record2);
  if (rows.length === 0) {
    return;
  }
 
  const header = `Metric,${record1.provider},${record2.provider},Delta,Winner\n`;
 
  const lines = rows.map(function (row) {
    const metric = `"${row.metric}"`;
    const value1 = row[record1.provider] ?? '';
    const value2 = row[record2.provider] ?? '';
    const delta = row.delta ?? '';
    const winner = `"${row.winner ?? ''}"`;
 
    return `${metric},${value1},${value2},${delta},${winner}`;
  });
 
  const body = lines.join('\n');
  const filename = `compare-${record1.id}-vs-${record2.id}.csv`;
 
  downloadFile(header + body, filename, 'text/csv');
}

export function exportJSON(record1, record2) {
  const rows = buildExportRows(record1, record2);
  if (rows.length === 0) {
    return;
  }
 
  const json = JSON.stringify(rows, null, 2);
  const filename = `compare-${record1.id}-vs-${record2.id}.json`;
 
  downloadFile(json, filename, 'application/json');
}