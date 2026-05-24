<script setup>
import '@/assets/style.css'
import AppHeader from '@/components/AppHeader.vue'

</script>

<template>
  <div class="d-flex">
    <AppHeader />

    <main class="main-content flex-grow-1 p-3">
        <router-view />
    </main>
  </div>
</template>
