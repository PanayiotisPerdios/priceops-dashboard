export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


export function csvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let text;

  if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  const escapedText = text.replaceAll('"', '""');

  return `"${escapedText}"`;
}

export function rowsToCSV(rows, columns = null) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  let headers = [];

  if (columns !== null && columns !== undefined) {
    headers = columns;
  } else {
    const uniqueHeaders = new Set();

    for (const row of rows) {
      const keys = Object.keys(row);

      for (const key of keys) {
        uniqueHeaders.add(key);
      }
    }

    headers = Array.from(uniqueHeaders);
  }

  const escapedHeaders = [];

  for (const header of headers) {
    escapedHeaders.push(csvCell(header));
  }

  const headerLine = escapedHeaders.join(',');

  const lines = [headerLine];

  for (const row of rows) {
    const cells = [];

    for (const key of headers) {
      const value = row[key];
      const escapedValue = csvCell(value);

      cells.push(escapedValue);
    }

    const line = cells.join(',');
    lines.push(line);
  }

  return lines.join('\r\n');
}

export function exportRowsCSV(rows, filename = 'export.csv', columns = null) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const csv = rowsToCSV(rows, columns);

  const content = '\uFEFF' + csv;

  downloadFile(content, filename, 'text/csv;charset=utf-8');
}


export function exportRowsJSON(data, filename = 'export.json') {
  const content = JSON.stringify(data, null, 2);

  downloadFile(content, filename, 'application/json;charset=utf-8');
}

export function buildCompareExportRows(mode, currentRows) {
  const rows = [];

  if (mode === 'provider') {

    for (const item of currentRows) {
      const result = item.result;

      const row = {
        Mode: 'Provider',
        Provider: result.provider,
        Scenario: result.scenarioName,
        Complete: result.complete,
        MonthlyCostUSD: result.totalMonthlyCost,
        Issues: result.issues.join('; ')
      };

      rows.push(row);
    }

  } else if (mode === 'scenario') {

    for (const item of currentRows) {

      const results = [
        item.resultA,
        item.resultB
      ];

      for (const result of results) {

        const row = {
          Mode: 'Scenario',
          Provider: result.provider,
          Scenario: result.scenarioName,
          Complete: result.complete,
          MonthlyCostUSD: result.totalMonthlyCost,
          Issues: result.issues.join('; ')
        };

        rows.push(row);
      }
    }
  }

  return rows;
}

const COMPARE_COLUMNS = [
  'Mode',
  'Provider',
  'Scenario',
  'Complete',
  'MonthlyCostUSD',
  'Issues'
];

export function exportCompareCSV(mode, currentRows) {
  const rows = buildCompareExportRows(mode, currentRows);

  exportRowsCSV(rows, 'comparison.csv', COMPARE_COLUMNS);
}

export function exportCompareJSON(mode, scenarioA, scenarioB, currentRows) {
  let secondScenario = null;

  if (mode === 'scenario') {
    secondScenario = scenarioB;
  }

  const payload = {
    mode: mode,
    scenarioA: scenarioA,
    scenarioB: secondScenario,
    results: currentRows
  };

  exportRowsJSON(payload, 'comparison.json');
}

export function exportPricingCSV(rows, schemaFields, filename = 'pricing-data.csv') {
  const columns = [];

  for (const field of schemaFields) {
    columns.push(field.name);
  }

  exportRowsCSV(rows, filename, columns);
}

export function exportPricingJSON(rows, filename = 'pricing-data.json') {
  exportRowsJSON(rows,filename);
}