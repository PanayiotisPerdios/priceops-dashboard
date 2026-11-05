const DEFAULT_HOURS_PER_MONTH = 730;
export const MAX_HOURS_PER_MONTH = 744;

function valid(value) {
    return typeof value === 'number' &&
           Number.isFinite(value) &&
           value >= 0;
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

    if (record.TierStart != null || record.TierEnd != null){
        return null;
    }

    const hours = usage.hoursPerMonth ?? DEFAULT_HOURS_PER_MONTH 

    if (!valid(hours) || hours > MAX_HOURS_PER_MONTH){
        return null;
    }

    const unit = record.PricingUnit;
    const component = record.PriceComponent;
    
    let quantity

    switch (unit){
        case 'Hour': {
            if (component === 'Instance'){
                quantity = hours
            } else {
                if(valid(usage.hourlyUnits)){
                    quantity = hours * usage.hourlyUnits
                }
            }
            break;
        }
        
        case 'Day': {
            quantity = usage.billableDays;
            break;
        }

        case 'Month': {
            quantity = usage.billableMonths;
            break;
        }

        case 'Years':{
            quantity = usage.billableYears;
            break
        }

        case 'vCPU-Hour': {
            const count = usage.vcpu ?? record.VCpu;

            if (valid(count)) {
                quantity = hours * count;
            }
            break;
        }

        case 'ACU-Hour': {
            if (valid(usage.acu)) {
                quantity = hours * usage.acu;
            }
            break;
        }

        case 'GB-Hour': {
            let gb;

            if (component === 'RAM') {
                gb = usage.memoryGB;
            } else {
                gb = usage.gbHoursCapacity;
            }

            if (valid(gb)) {
                quantity = hours * gb;
            }
            break;
        }

        case 'GB-Month': {
            if (component === 'Storage') {
                quantity = usage.storageGBMonths;
            } else if (component === 'Backup') {
                quantity = usage.backupGBMonths;
            } else {
                quantity = usage.gbMonths;
            }
            break;
        }

        case 'GB': {
            if (component === 'DataTransfer' || component === 'Network') {
                quantity = usage.transferGB;
            } else {
                quantity = usage.gb;
            }
            break;
        }

        case 'IOPS-Month': {
            quantity = usage.iopsMonths;
            break;
        }

        case 'MBps-Month': {
            quantity = usage.mbpsMonths;
            break;
        }

        case 'Tag-Month': {
            quantity = usage.tagMonths;
            break;
        }

        case 'Request': {
            quantity = usage.requests;
            break;
        }

        default: {
            return null;
        }
    }

    const cost = record.ListUnitPrice * quantity;

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
