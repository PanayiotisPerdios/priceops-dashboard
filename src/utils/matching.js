export function median(sortedAsc) {
  if (!sortedAsc.length) return null;
  const mid = Math.floor(sortedAsc.length / 2);
  return sortedAsc.length % 2 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}
 
export function cheapestPerSku(list) {
  const best = new Map();
  for (const r of list) {
    const key = `${r.provider}|${r.skuName}|${r.operating_system ?? ''}|${r.pricing_model ?? ''}`;
    const cur = best.get(key);
    if (!cur || r.effective_price_hr < cur.effective_price_hr) best.set(key, r);
  }
  return [...best.values()];
}