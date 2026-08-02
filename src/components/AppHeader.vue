<script setup>
import logo from '@/assets/price_ops_logo.svg'
</script>

<template>
  <nav class="sidebar">

    <router-link
      to="/"
      class="logo-container"
      title="Return to Home"
    >
      <img
        :src="logo"
        alt="CloudPricingOps"
        class="logo"
      />

      <span class="logo-title">
        CloudPricingOps
      </span>
    </router-link>

  </nav>
</template>

<style scoped src="@/assets/styles/components/AppHeader.scss"></style>