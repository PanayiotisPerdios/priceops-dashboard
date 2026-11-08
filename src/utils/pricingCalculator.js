import { usageSpecFor, isMissing } from './usageSpec.js';

const DEFAULT_HOURS_PER_MONTH = 730;
export const MAX_HOURS_PER_MONTH = 744;

function valid(value) {
    return typeof value === 'number' &&
           Number.isFinite(value) &&
           value >= 0;
}

export function tierStartOf(row) {
  if (isMissing(row.TierStart)) {
    return 0;
  }
  return row.TierStart;
}

export function tierEndOf(row) {
  if (isMissing(row.TierEnd)) {
    return Infinity;
  }
  return row.TierEnd;
}

export function isFlatPrice(row) {
  const startIsZeroOrEmpty = isMissing(row.TierStart) || row.TierStart === 0;
  return startIsZeroOrEmpty && isMissing(row.TierEnd);
}

export function billableQuantity(record, usage) {
  let hours = DEFAULT_HOURS_PER_MONTH;

  if (!isMissing(usage.hoursPerMonth)) {
    hours = usage.hoursPerMonth;
  }

  if (!valid(hours) || hours > MAX_HOURS_PER_MONTH) {
    return null;
  }

  const spec = usageSpecFor(record.PricingUnit, record.PriceComponent);

  if (spec === null) {
    return null;
  }

  let amount = 1;

  if (spec.key !== null) {
    amount = usage[spec.key];

    if (isMissing(amount) && spec.recordField) {
      amount = record[spec.recordField];
    }

    if (isMissing(amount)) {
      amount = spec.defaultValue;
    }
  }

  if (!valid(amount)) {
    return null;
  }

  if (spec.perHour) {
    return hours * amount;
  }

  return amount;
}

export function calculateMonthlyCost(record, usage = {}) {
    if (!record || !usage || typeof usage !== 'object' || Array.isArray(usage)) {
        return null;
    }

    if (!valid(record.ListUnitPrice)) {
        return null;
    }

    if (record.PricingCurrency !== 'USD') {
        return null;
    }

    if (!isFlatPrice(record)) {
        return null;
    }

    const quantity = billableQuantity(record, usage);

    if (quantity === null) {
        return null;
    }

    const cost = record.ListUnitPrice * quantity

    if (!valid(cost)) {
        return null;
    }

    return cost;

}

export function calculateComponentCost(record, usage = {}, count = 1) {
  if (!Number.isInteger(count) || count <= 0) {
    return null;
  }

  const monthlyCost = calculateMonthlyCost(record, usage);

  if (monthlyCost == null) {
    return null;
  }

  const totalCost = monthlyCost * count;

  if (!Number.isFinite(totalCost)) {
        return null;
  }

  return totalCost;
}

export function calculateTieredCost(tierRows, usage = {}, count = 1) {
  if (tierRows.length === 0) {
    return null;
  }

  if (!Number.isInteger(count) || count < 1) {
    return null;
  }

  for (const tier of tierRows) {
    if (!valid(tier.ListUnitPrice) || tier.PricingCurrency !== 'USD') {
      return null;
    }
  }

  const quantity = billableQuantity(tierRows[0], usage);

  if (quantity === null) {
    return null;
  }

  const total = quantity * count;
  let cost = 0;

  for (const tier of tierRows) {
    const start = tierStartOf(tier);
    const end = tierEndOf(tier);
    const upper = Math.min(total, end);
    const billed = Math.max(0, upper - start);

    cost += billed * tier.ListUnitPrice;
  }

  if (!Number.isFinite(cost)) {
    return null;
  }

  return cost;
}
