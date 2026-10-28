<script setup>
import AppHeader from '@/components/AppHeader.vue'
import { onMounted } from 'vue';
import { loadUnifiedPricing } from '@/utils/pricingDataLoader';

onMounted(async () => {
    try {
        const { records, report } = await loadUnifiedPricing();

        console.log('IMPORT REPORT:', report);
        console.log('IMPORTED RECORDS:', records);
        console.table(records.slice(0, 10));
    } catch (error) {
        console.error('IMPORT FAILED:', error);
    }
});

</script>


<template> 
<div class="d-flex"> 
  <AppHeader /> 
  <main class="main-content flex-grow-1 p-3"> 
    <RouterView v-slot="{ Component }"> 
      <Transition name="page" mode="out-in"> 
        <component :is="Component" /> 
      </Transition> 
    </RouterView> 
  </main> 
</div> 
</template>
