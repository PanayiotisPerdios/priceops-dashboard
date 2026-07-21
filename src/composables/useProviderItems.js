import { computed } from 'vue';
import { providerMockData } from '@/mock-data/providerMockData';
import { providers } from '@/data/filters';

export function useProviderItems(service) {
  return computed(() => {
    const svc = service.value ?? service;
    if (!svc) return [];

    return providers.map((provider) => {
      const categories = providerMockData?.[provider]?.[svc] || {};
      const metrics = {};

      Object.values(categories).forEach((fields) => {
        Object.entries(fields).forEach(([fieldId, value]) => {
          metrics[fieldId] = value;
        });
      });

      return {
        id: provider,
        name: provider,
        metrics,
      };
    });
  });
}