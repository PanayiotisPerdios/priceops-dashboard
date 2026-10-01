import { valueFor, deltaFor, winnerFor } from './calculationServices';

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildCompareExportRows(record1, record2, fields) {
  return fields.map(field => ({
    metric: field.name,
    [record1.provider]: valueFor(record1, field),
    [record2.provider]: valueFor(record2, field),
    delta: deltaFor(record1, record2, field),
    winner: winnerFor(record1, record2, field),
  }));
}

export function exportCompareCSV(record1, record2, fields) {
  const rows = buildCompareExportRows(record1, record2, fields);
  if (!rows.length) return;
  const header = `Metric,${record1.provider},${record2.provider},Delta,Winner\n`;
  const body = rows.map(r =>
    `"${r.metric}",${r[record1.provider] ?? ''},${r[record2.provider] ?? ''},${r.delta ?? ''},"${r.winner ?? ''}"`
  ).join('\n');
  downloadFile(header + body, `compare-${record1.id}-vs-${record2.id}.csv`, 'text/csv');
}

export function exportCompareJSON(record1, record2, fields) {
  const rows = buildCompareExportRows(record1, record2, fields);
  if (!rows.length) return;
  downloadFile(JSON.stringify(rows, null, 2), `compare-${record1.id}-vs-${record2.id}.json`, 'application/json');
}

// ---- DataExploration.vue: flat record-list export ----

export function exportRowsCSV(rows, filename = 'data-exploration-export.csv') {
  if (!rows.length) return;
  const header = 'Provider,Domain,Region,OS,vCPU,Memory (GB),Price/hr,Quality Score\n';
  const body = rows
    .map(r => `"${r.provider}","${r.domain}","${r.region}","${r.operating_system ?? ''}",${r.vcpu_count ?? ''},${r.memory_gb ?? ''},${r.effective_price_hr},${r.data_quality_score}`)
    .join('\n');
  downloadFile(header + body, filename, 'text/csv');
}

export function exportRowsJSON(rows, filename = 'data-exploration-export.json') {
  if (!rows.length) return;
  downloadFile(JSON.stringify(rows, null, 2), filename, 'application/json');
}