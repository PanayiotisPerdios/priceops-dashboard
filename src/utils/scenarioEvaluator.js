
import {
  calculateComponentCost,
  calculateTieredCost,
  isFlatPrice,
  tierStartOf
} from './pricingCalculator.js';

import {
  PROVIDERS,
  validateProvider,
  validateScenario,
  validateComponent,
  validateUsage
} from './scenarioValidation.js';

import { isMissing, usesOS } from './usageSpec.js';

// Preserve existing imports from scenarioEvaluator.js.
export { PROVIDERS } from './scenarioValidation.js';

const finite = value =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0;

const COMPONENT_FILTER_FIELDS = [
  'ServiceCategory',
  'ServiceSubcategory',
  'ServiceName',
  'PriceComponent',
  'PricingUnit',
  'StorageClass',
  'DatabaseEngine',
  'DeploymentOption',
  'ServiceTier',
  'Tenancy',
  'CommitmentTerm',
  'CommitmentType'
];

// Check provider and scenario-wide requirements.
function matchesScenario(row, scenario, provider) {
  if (row.ServiceProviderName !== provider) {
    return false;
  }

  if (row.PricingCurrency !== 'USD') {
    return false;
  }

  if (
    scenario.regionGroup != null &&
    row.RegionGroup !== scenario.regionGroup
  ) {
    return false;
  }

  if (
    scenario.pricingCategory != null &&
    row.PricingCategory !== scenario.pricingCategory
  ) {
    return false;
  }

  return true;
}

// Check component-specific requirements.
function matchesComponent(row, component, scenario) {
  const isInstance = component.PriceComponent === 'Instance';
  

  for (const field of COMPONENT_FILTER_FIELDS) {
    const requestedValue = component[field];

    if (requestedValue != null && requestedValue !== '') {
      if (row[field] !== requestedValue) {
        return false;
      }
    }
  }

  const noTenancyRequested = isMissing(component.Tenancy) || component.Tenancy === '';

  if (noTenancyRequested && row.Tenancy === 'Dedicated') {
    return false;
  }

  // Resolve the required operating system.
  let requiredOS = null;

  if (component.OperatingSystem != null) {
    requiredOS = component.OperatingSystem;
  } else if (usesOS(component)  && component.requiresOS) {
    requiredOS = scenario.operatingSystem;
  }

  if (requiredOS != null && row.OperatingSystem !== requiredOS) {
    return false;
  }
  

  if (isInstance && component.minVCpu != null) {
    if (!finite(component.minVCpu) || !finite(row.VCpu) || row.VCpu < component.minVCpu) {
      return false;
    }
  }

  if (isInstance && component.minMemoryGiB != null) {
    if (!finite(component.minMemoryGiB) || !finite(row.MemoryGiB) || row.MemoryGiB < component.minMemoryGiB) {
      return false;
    }
  }

  return true;
}

// Combine shared hours with component usage.
function usageFor(component, scenario) {
  const usage = {
    hoursPerMonth: scenario.hoursPerMonth
  };

  if (component.usage != null) {
    for (const key of Object.keys(component.usage)) {
      usage[key] = component.usage[key];
    }
  }

  return usage;
}

// Create a failed evaluation result.
function failed(provider, name, issues) {
  return {
    provider,
    scenarioName: name ?? null,
    complete: false,
    totalMonthlyCost: null,
    components: [],
    issues
  };
}

// Sort candidates by price, then SKU ID.
function compareByCost(a, b) {
  if (a.cost < b.cost) {
    return -1;
  }

  if (a.cost > b.cost) {
    return 1;
  }

  const skuA = String(a.row.SkuId ?? '');
  const skuB = String(b.row.SkuId ?? '');

  return skuA.localeCompare(skuB);
}

function tierKey(row) {
  return [
    row.ServiceProviderName, row.SkuId, row.RegionId, row.PricingCategory,
    row.PricingUnit, row.PriceComponent, row.CommitmentTerm, row.CommitmentType,
    row.Tenancy, row.OperatingSystem, row.StorageClass, row.ServiceTier,
    row.DatabaseEngine, row.DeploymentOption
  ].join('|');
}

// Find the cheapest eligible record for one component.
function findCheapestCandidate(records, scenario, provider, component) {
  const usage = usageFor(component, scenario);
  const candidates = [];
  const tierGroups = new Map();

  for (const row of records) {
    if (!matchesScenario(row, scenario, provider)) {
      continue;
    }

    if (!matchesComponent(row, component, scenario)) {
      continue;
    }

    if (isFlatPrice(row)) {
      // Free or placeholder rows must not win "cheapest".
      if (row.ListUnitPrice <= 0) {
        continue;
      }

      const cost = calculateComponentCost(row, usage, component.quantity);

      if (finite(cost)) {
        candidates.push({ row, cost });
      }
    } else {
      const key = tierKey(row);

      if (!tierGroups.has(key)) {
        tierGroups.set(key, []);
      }

      tierGroups.get(key).push(row);
    }
  }

  for (const rows of tierGroups.values()) {
    rows.sort((a, b) => tierStartOf(a) - tierStartOf(b));

    // Incomplete tier ladder.
    if (tierStartOf(rows[0]) !== 0) {
      continue;
    }

    let allFree = true;
    for (const row of rows) {
      if (row.ListUnitPrice > 0) {
        allFree = false;
      }
    }
    if (allFree) {
      continue;
    }

    const cost = calculateTieredCost(rows, usage, component.quantity);

    if (finite(cost)) {
      candidates.push({ row: rows[0], cost });
    }
  }

  candidates.sort(compareByCost);

  if (candidates.length === 0) {
    return null;
  }

  return candidates[0];
}

function diagnose(records, scenario, provider, component) {
  let providerRows = 0;
  let afterScenario = 0;
  let afterComponent = 0;

  for (const row of records) {
    if (row.ServiceProviderName !== provider) {
      continue;
    }
    providerRows++;

    if (!matchesScenario(row, scenario, provider)) {
      continue;
    }
    afterScenario++;

    if (!matchesComponent(row, component, scenario)) {
      continue;
    }
    afterComponent++;
  }

  return { providerRows, afterScenario, afterComponent };
}

// Convert the chosen pricing record into a result.
function createComponentResult(chosen, component, index) {
  const row = chosen.row;
  let vcpu = row.VCpu;
  let memoryGiB = row.MemoryGiB;

  if (isMissing(vcpu)) {
    vcpu = null;
  }

  if (isMissing(memoryGiB)) {
    memoryGiB = null;
  }

  return {
    componentIndex: index,
    ServiceCategory: row.ServiceCategory,
    ServiceSubcategory: row.ServiceSubcategory,
    PriceComponent: row.PriceComponent,
    PricingUnit: row.PricingUnit,
    quantity: component.quantity,
    skuId: row.SkuId,
    skuName: row.SkuName || row.SkuId,
    region: row.RegionId,
    monthlyCost: chosen.cost,
    unitPrice: row.ListUnitPrice,
    serviceName: row.ServiceName,
    operatingSystem: row.OperatingSystem,
    pricingCategory: row.PricingCategory,
    vcpu,
    memoryGiB
  };
}

export function pickCheapest(results) {
  let best = null;

  for (const result of results) {
    if (!result.complete || !Number.isFinite(result.totalMonthlyCost)) {
      continue;
    }

    if (best === null || result.totalMonthlyCost < best.totalMonthlyCost) {
      best = result;
    }
  }

  return best;
}

// Evaluate one scenario against one provider.
export function evaluateScenario(records, scenario, provider) {
  const issues = [];
  const results = [];

  // 1. Validate top-level inputs.
  if (!Array.isArray(records)) {
    issues.push('Pricing records must be an array.');
  }

  issues.push(...validateProvider(provider));
  issues.push(...validateScenario(scenario));

  if (issues.length > 0) {
    return failed(provider, scenario?.name, issues);
  }

  // 2. Evaluate each workload component.
  for (let index = 0; index < scenario.components.length; index++) {
    const component = scenario.components[index];

    // Validate component requirements.
    const componentIssues = validateComponent(component, index, scenario);

    // Validate component usage.
    const usageIssues = validateUsage(component, index);

    const validationIssues = [
      ...componentIssues,
      ...usageIssues
    ];

    if (validationIssues.length > 0) {
      issues.push(...validationIssues);
      continue;
    }

    // 3. Find the cheapest eligible pricing record.
    const chosen = findCheapestCandidate(records, scenario, provider, component);

    if (chosen === null) {
      const d = diagnose(records, scenario, provider, component);

      let hint = '';
      if (d.afterComponent > 0) {
        hint = '; check usage quantities';
      }

      issues.push(`Component ${index + 1}: no priceable record for ${provider} ` +
        `(${d.providerRows} rows, ${d.afterScenario} match region/pricing category, ` +
        `${d.afterComponent} match component filters${hint}).`
      );
      continue;
    }

    // 4. Store the selected component.
    results.push(createComponentResult(chosen, component, index));
  }

  // 5. Calculate the total only if every component succeeded.
  const complete = issues.length === 0 && results.length === scenario.components.length;

  let totalMonthlyCost = null;

  if (complete) {
    totalMonthlyCost = results.reduce((sum, result) => sum + result.monthlyCost, 0);
  }

  return {
    provider,
    scenarioName: scenario.name,
    complete,
    totalMonthlyCost,
    components: results,
    issues
  };
}

// Evaluate the same scenario against every provider.
export function evaluateAllProviders(records, scenario) {
  const results = [];

  for (const provider of PROVIDERS) {
    results.push(
      evaluateScenario(records, scenario, provider)
    );
  }

  return results;
}
