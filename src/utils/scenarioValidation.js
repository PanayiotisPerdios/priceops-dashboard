
import { MAX_HOURS_PER_MONTH } from './pricingCalculator.js';
import { usageSpecFor, usesOS } from './usageSpec.js';

export const PROVIDERS = ['AWS', 'Azure', 'GCP'];

const finite = value =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0;

const isObject = value =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

export function validateProvider(provider) {
  const issues = [];

  if (!PROVIDERS.includes(provider)) {
    issues.push(`Unsupported provider: ${provider}.`);
  }

  return issues;
}

// Validate scenario-level properties.
export function validateScenario(scenario) {
  const issues = [];

  if (!isObject(scenario)) {
    issues.push('Invalid scenario.');
    return issues;
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

  return issues;
}

// Validate one workload component.
export function validateComponent(component, index, scenario) {
  const issues = [];
  const prefix = `Component ${index + 1}:`;

  if (!isObject(component)) {
    issues.push(`${prefix} invalid component.`);
    return issues;
  }

  if (!Number.isInteger(component.quantity) || component.quantity < 1) {
    issues.push(`${prefix} quantity must be a positive integer.`);
  }

  if (!component.ServiceCategory || !component.PriceComponent) {
    issues.push(`${prefix} ServiceCategory and PriceComponent are required.`);
  }

  if (!component.PricingUnit) {
    issues.push(`${prefix} PricingUnit is required.`);
  }

  if (component.PricingUnit && usageSpecFor(component.PricingUnit, component.PriceComponent) === null) {
    issues.push(`${prefix} unsupported pricing unit: ${component.PricingUnit}.`);
  }

  if (component.minVCpu != null && !finite(component.minVCpu)) {
    issues.push(`${prefix} invalid minimum vCPU.`);
  }

  if (component.minMemoryGiB != null && !finite(component.minMemoryGiB)) {
    issues.push(`${prefix} invalid minimum RAM.`);
  }

  if (component.requiresOS && usesOS(component)) {
    const hasComponentOS = component.OperatingSystem != null && component.OperatingSystem !== '';

    const hasScenarioOS = scenario.operatingSystem != null && scenario.operatingSystem !== '';

    if (!hasComponentOS && !hasScenarioOS) {
      issues.push(`${prefix} operating system is required.`);
    }
  }

  return issues;
}

// Validate the structure of component-specific usage.
export function validateUsage(component, index) {
  const issues = [];
  const prefix = `Component ${index + 1}:`;
  
  if (!isObject(component)) {
    return issues;
  }

  if (component.usage === null || component.usage === undefined) {
    return issues;
  }

  if (!isObject(component.usage)) {
    issues.push(`${prefix} usage must be an object.`);
    return issues;
  }

  for (const key of Object.keys(component.usage)) {
    if (!finite(component.usage[key])) {
      issues.push(`${prefix} usage "${key}" must be a non-negative number.`);
    }
  }

  return issues;
}
