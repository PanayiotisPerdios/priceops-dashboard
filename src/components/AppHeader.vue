<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import logo from '@/assets/price_ops_logo.svg'

const route = useRoute()

const navItems = [
  { to: '/explore', label: 'Explore Data', icon: 'explore' },
  { to: '/compare', label: 'Compare', icon: 'compare' },
  { to: '/evaluation', label: 'Evaluate Policies', icon: 'evaluate' },
]

function isActive(path) {
  return route.path === path
}

const lastUpdated = computed(() =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
)
</script>

<template>
  <nav class="sidebar">
    <router-link to="/" class="logo-container" title="Return to Home">
      <img :src="logo" alt="CloudPricingOps" class="logo" />
      <span class="logo-title">Cloud Pricing Ops</span>
    </router-link>

    <div class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidebar-nav-item"
        :class="{ active: isActive(item.to) }"
        :title="item.label"
      >
        <svg v-if="item.icon === 'explore'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <svg v-else-if="item.icon === 'compare'" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3v18" />
          <path d="M16 3v18" />
          <path d="M3 8h4" />
          <path d="M3 16h4" />
          <path d="M17 8h4" />
          <path d="M17 16h4" />
        </svg>

        <svg v-else class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="21" x2="5" y2="13" />
          <line x1="5" y1="9" x2="5" y2="3" />
          <line x1="12" y1="21" x2="12" y2="11" />
          <line x1="12" y1="7" x2="12" y2="3" />
          <line x1="19" y1="21" x2="19" y2="15" />
          <line x1="19" y1="11" x2="19" y2="3" />
          <circle cx="5" cy="11" r="2" />
          <circle cx="12" cy="9" r="2" />
          <circle cx="19" cy="13" r="2" />
        </svg>

        <span class="sidebar-nav-indicator" />
      </router-link>
    </div>

    <div class="sidebar-footer">
      <span class="data-pulse" :title="`Prices refreshed as of ${lastUpdated}`"></span>
    </div>
  </nav>
</template>

<style scoped src="@/assets/styles/components/AppHeader.scss"></style>