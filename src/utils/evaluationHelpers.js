import { calculateMonthlyCost } from './pricingCalculator.js';

const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const EVALUATION_SCOPES = {
  Compute: { 
    priceComponent: 'Instance', 
    pricingUnit: 'Hour' 
  },

  Databases: { 
    priceComponent: 'Instance', 
    pricingUnit: 'Hour' 
  },

  Storage: { 
    priceComponent: 'Storage', 
    pricingUnit: 'GB-Month' 
  }
};

export function prepareEvaluationRecords(records, filters) {
  const scope = EVALUATION_SCOPES[filters.category];
  const usage = { hoursPerMonth: filters.hoursPerMonth };
  const output = [];

  if (!scope || !Array.isArray(records)) {
    return [];
  }

  
  for (const row of records) {
    if (row.ServiceCategory !== filters.category) {
        continue;
    }

    if (row.PriceComponent !== scope.priceComponent || row.PricingUnit !== scope.pricingUnit){
        continue;
    }

    if (row.PricingCurrency !== 'USD' || row.PricingCategory !== filters.pricingCategory){
        continue;
    }

    if (row.TierStart != null || row.TierEnd != null){
        continue;
    }

    if (filters.subcategory && row.ServiceSubcategory !== filters.subcategory){
        continue;
    }

    if (filters.regionGroup && row.RegionGroup !== filters.regionGroup){
        continue;
    }

    if (filters.operatingSystem && row.OperatingSystem !== filters.operatingSystem){
        continue;
    }

    if (filters.dbEngine && row.DatabaseEngine !== filters.dbEngine){
        continue;
    }

    if (filters.requireSpecs && filters.category !== 'Storage' && (!valid(row.VCpu) || !valid(row.MemoryGiB))){
        continue;
    }

    if (filters.minVCpu != null && filters.minVCpu !== '' && (!valid(row.VCpu) || row.VCpu < filters.minVCpu)){
        continue;
    }

    if (filters.minMemoryGiB != null && filters.minMemoryGiB !== '' && (!valid(row.MemoryGiB) || row.MemoryGiB < filters.minMemoryGiB)){
        continue;
    } 

    if (filters.category === 'Storage'){
        usage.storageGBMonths = filters.storageGBMonths;
    }
    
    const monthlyCost = calculateMonthlyCost(row, usage);
    
    if (!valid(monthlyCost)){
        continue;
    } 

    output.push({
      ...row,
      id: `${row.ServiceProviderName}|${row.SkuId}|${row.SkuPriceId ?? ''}|${row.RegionId ?? ''}|${output.length}`,
      monthlyCost,
      unitPrice: row.ListUnitPrice,
      costPerVCpu: valid(row.VCpu) && row.VCpu > 0 ? monthlyCost / row.VCpu : null,
      costPerMemoryGiB: valid(row.MemoryGiB) && row.MemoryGiB > 0 ? monthlyCost / row.MemoryGiB : null
    });
  }
  return output;
}

export function cheapestRegionPerSku(records) {
  const best = new Map();

  for (const row of records) {
    const key = [row.ServiceProviderName, row.ServiceName, row.SkuId, row.SkuMeter,
      row.PricingUnit, row.PriceComponent, row.VCpu, row.MemoryGiB,
      row.OperatingSystem, row.DatabaseEngine, row.DeploymentOption,
      row.Tenancy, row.ServiceTier, row.StorageClass].join('|');
    const previous = best.get(key);

    if (!previous || row.monthlyCost < previous.monthlyCost){
        best.set(key, row);
    } 
  }
  return [...best.values()];
}