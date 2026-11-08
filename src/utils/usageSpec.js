export function isMissing(value) {
  return value === null || value === undefined;
}

export function usesOS(component) {
  return component.ServiceCategory === 'Compute';
}

// For a pricing unit: which usage input is billed, whether it scales with hours,
// and what to assume when the input is empty. Returns null for unknown units.
export function usageSpecFor(unit, priceComponent) {
  switch (unit) {
    case 'Hour':
      if (priceComponent === 'Instance') {
        return { key: null, perHour: true };
      }
      return { key: 'hourlyUnits', perHour: true, defaultValue: 1 };

    case 'Day':
      return { key: 'billableDays', perHour: false };

    case 'Month':
      return { key: 'billableMonths', perHour: false, defaultValue: 1 };

    case 'Year':
      return { key: 'billableYears', perHour: false, defaultValue: 1 / 12, defaultLabel: '1/12' };

    case 'vCPU-Hour':
      return { key: 'vcpu', perHour: true, recordField: 'VCpu' };

    case 'ACU-Hour':
      return { key: 'acu', perHour: true };

    case 'GB':
      if (priceComponent === 'DataTransfer' || priceComponent === 'Network') {
        return { key: 'transferGB', perHour: false };
      }
      return { key: 'gb', perHour: false };

    case 'GB-Hour':
      if (priceComponent === 'RAM') {
        return { key: 'memoryGB', perHour: true };
      }
      return { key: 'gbHoursCapacity', perHour: true };

    case 'GB-Month':
      if (priceComponent === 'Storage') {
        return { key: 'storageGBMonths', perHour: false };
      }
      if (priceComponent === 'Backup') {
        return { key: 'backupGBMonths', perHour: false };
      }
      return { key: 'gbMonths', perHour: false };

    case 'IOPS-Month':
      return { key: 'iopsMonths', perHour: false };

    case 'MBps-Month':
      return { key: 'mbpsMonths', perHour: false };

    case 'Tag-Month':
      return { key: 'tagMonths', perHour: false };

    case 'Request':
      return { key: 'requests', perHour: false };

    default:
      return null;
  }
}