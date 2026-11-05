import { calculateComponentCost, MAX_HOURS_PER_MONTH} from './pricingCalculator.js';

export const PROVIDERS = ['AWS', 'Azure', 'GCP'];

const finite = n =>
  typeof n === 'number' &&
  Number.isFinite(n) &&
  n >= 0;

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

function commonMatch(row, scenario, provider, component) {
  if (row.ServiceProviderName !== provider) {
    return false;
  }

  if (row.PricingCurrency !== 'USD') {
    return false;
  }

  if (scenario.regionGroup != null && row.RegionGroup !== scenario.regionGroup) {
    return false;
  }

  if (scenario.pricingCategory != null && row.PricingCategory !== scenario.pricingCategory) {
    return false;
  }

  let requiredOS = null;

  if (component.OperatingSystem != null) {
      requiredOS = component.OperatingSystem;
  } else if (component.requiresOS) {
      requiredOS = scenario.operatingSystem;
  }

  if (requiredOS != null) {
      if (row.OperatingSystem !== requiredOS) {
          return false;
      }
  }

  if (row.TierStart != null || row.TierEnd != null) {
      return false;
  }

  return true;
}

function eligible(row, component) {
  for (const field of COMPONENT_FILTER_FIELDS) {
    const requestedValue = component[field];

    if (requestedValue != null && requestedValue !== '') {
      if (row[field] !== requestedValue) {
        return false;
      }
    }
  }

  if (component.minVCpu != null) {
      if (!finite(component.minVCpu)) {
        return false;
      }

      if (!finite(row.VCpu)) {
        return false;
      }

      if (row.VCpu < component.minVCpu) {
        return false;
      }
  }

  if (component.minMemoryGiB != null) {
      if (!finite(component.minMemoryGiB)) {
        return false;
      }

      if (!finite(row.MemoryGiB)) {
        return false;
      }

      if (row.MemoryGiB < component.minMemoryGiB) {
        return false;
      }
  }
  return true;
}

function usageFor(component, scenario) {
  const usage = { hoursPerMonth: scenario.hoursPerMonth };

  if (component.usage != null) {
    for (const key of Object.keys(component.usage)) {
      usage[key] = component.usage[key];
        
    }
  }

  return usage;
}

function failed(provider, name, issues) {

    return {
        provider: provider,
        scenarioName: name ?? null,
        complete: false,
        totalMonthlyCost: null,
        components: [],
        issues: issues
    };
}

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

function validateComponent(component, index, scenario) {
  const issues = [];
  const prefix = `Component ${index + 1}:`;

  if (!component || typeof component !== 'object' || Array.isArray(component)) { 
    issues.push(`${prefix} invalid component.`);
    return issues;
  }

  if (!Number.isInteger(component.quantity) || component.quantity < 1) {
    issues.push(`${prefix} quantity must be a positive integer.`);
  }

  if (!component.ServiceCategory || !component.PriceComponent) {
    issues.push(`${prefix} ServiceCategory and PriceComponent are required.`);
  }

  if (component.minVCpu != null && !finite(component.minVCpu)) {
    issues.push(`${prefix} invalid minimum vCPU.`);
  }

  if (component.minMemoryGiB != null && !finite(component.minMemoryGiB)) {
    issues.push(`${prefix} invalid minimum RAM.`);
  }

  if (component.usage != null && (typeof component.usage !== 'object' || Array.isArray(component.usage))) {
    issues.push(`${prefix} usage must be an object.`);
  }

  if (component.requiresOS) {
    const hasComponentOS = component.OperatingSystem != null && component.OperatingSystem !== '';
    const hasScenarioOS = scenario.operatingSystem != null && scenario.operatingSystem !== '';

    if (!hasComponentOS && !hasScenarioOS) {
      issues.push(`${prefix} operating system is required.`);
    }
  }
  
  return issues;
}

export function evaluateScenario(records, scenario, provider) {
  const issues = [];
  const results = [];

  if (!Array.isArray(records)) {
    issues.push('Pricing records must be an array.');
  }

  if (!PROVIDERS.includes(provider)) {
    issues.push(`Unsupported provider: ${provider}.`);
  }

  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    issues.push('Invalid scenario.');
    return failed(provider, null, issues);
  }

  if (!Number.isInteger(scenario.hoursPerMonth) || scenario.hoursPerMonth < 0 || scenario.hoursPerMonth > MAX_HOURS_PER_MONTH) {
    issues.push(`Hours per month must be between 0 and ${MAX_HOURS_PER_MONTH}.`);
  }

  if (scenario.policy !== 'costFirst') {
    issues.push(`Unsupported policy: ${scenario.policy}.`);
  }

  if (!Array.isArray(scenario.components) || scenario.components.length === 0) {
    issues.push('Scenario must contain at least one component.');
  }

  if (issues.length > 0) {
    return failed(provider, scenario.name, issues);
  }

  for (let index = 0; index < scenario.components.length; index++) {

    const component = scenario.components[index];
    const validationIssues = validateComponent(component, index, scenario);

    if (validationIssues.length > 0) {

      for (const issue of validationIssues) {
        issues.push(issue);
      }
      
      continue;
    }

    const usage = usageFor(component, scenario);
    const candidates = [];

    for (const row of records) {

      if (!commonMatch(row, scenario, provider, component)) {
        continue;
      }

      if (!eligible(row, component)) {
        continue;
      }

      const cost = calculateComponentCost(row, usage, component.quantity);

      if (!finite(cost)) {
        continue;
      }

      candidates.push({row: row, cost: cost});
    }

    candidates.sort(compareByCost);

    if (candidates.length === 0) {

      issues.push(`Component ${index + 1}: ` + `no eligible, priceable record for ${provider}.`);
      continue;
    }

    const chosen = candidates[0];
    const row = chosen.row;

    results.push({
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
      vcpu: row.VCpu ?? null,
      memoryGiB: row.MemoryGiB ?? null
    });
  }

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

export function evaluateAllProviders(records, scenario) {
  const results = [];

  for (const provider of PROVIDERS) {
    const result = evaluateScenario(records, scenario, provider);
    results.push(result);
  }

  return results;
}

