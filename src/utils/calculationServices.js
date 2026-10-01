import { providerColors } from '@/data/constants';

const FALLBACK_PALETTE = ['#6366f1', '#ca309e', '#22c55e', '#eab308'];

export function monthlyEstimate(record) {
  if (!record?.effective_price_hr) return null;
  return record.effective_price_hr * 730;
}

export function annualEstimate(record) {
  if (!record?.effective_price_hr) return null;
  return record.effective_price_hr * 8760;
}

export function colorFor(provider, index = 0) {
  return providerColors[provider] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

export function valueFor(record, field) {
  return record ? record[field.id] : null;
}

export function deltaFor(record1, record2, field) {
  const a = valueFor(record1, field);
  const b = valueFor(record2, field);
  if (a == null || b == null || !b) return null;
  return (((a - b) / b) * 100).toFixed(1);
}

//A point is on the frontier if no other point beats or matches it on both axes with a strict edge on at least one.
export function paretoFrontier2D(points) {
  return points.filter(
    p => !points.some(q => q.id !== p.id && q.x >= p.x && q.y >= p.y && (q.x > p.x || q.y > p.y))
  );
}

export function winnerFor(record1, record2, field) {
  const a = valueFor(record1, field);
  const b = valueFor(record2, field);
  if (a == null || b == null) return null;
  const aWins = field.direction === 'higher' ? a >= b : a <= b;
  return aWins ? record1.provider : record2.provider;
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
  if (!rows.length) return;
  const header = `Metric,${record1.provider},${record2.provider},Delta,Winner\n`;
  const body = rows.map(r =>
    `"${r.metric}",${r[record1.provider] ?? ''},${r[record2.provider] ?? ''},${r.delta ?? ''},"${r.winner ?? ''}"`
  ).join('\n');
  downloadFile(header + body, `compare-${record1.id}-vs-${record2.id}.csv`, 'text/csv');
}

export function exportJSON(record1, record2) {
  const rows = buildExportRows(record1, record2);
  if (!rows.length) return;
  downloadFile(JSON.stringify(rows, null, 2), `compare-${record1.id}-vs-${record2.id}.json`, 'application/json');
}