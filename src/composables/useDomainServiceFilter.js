import { ref, computed, watch } from 'vue';
import { services, domainServiceMap } from '@/data/filters';

export function useDomainServiceFilter() {
  const domain = ref(null);
  const service = ref(null);

  const availableServices = computed(() => {
    if (!domain.value) return services;
    return domainServiceMap[domain.value] || [];
  });

  watch(domain, () => {
    if (service.value && !availableServices.value.includes(service.value)) {
      service.value = null;
    }
  });

  return { domain, service, availableServices };
}