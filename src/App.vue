<script setup>
import AppHeader from '@/components/AppHeader.vue'

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
