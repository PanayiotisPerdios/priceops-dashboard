<script setup>
import Card from '@/components/Card.vue'
import { providers, domains } from '@/data/filters'
import { pricingRecords } from '@/data/mockPricingData'

const cards = [
  { title: 'Explore Data', message: 'See instance pricing and metrics across providers.', reference: 'explore' },
  { title: 'Compare', message: 'Set two providers or scenarios side-by-side.', reference: 'compare' },
  { title: 'Evaluate Policies', message: 'Rank providers by cost, performance, or a policy you define.', reference: 'evaluation' },
]

const providerList = providers.join(' · ')
const regionCount = new Set(pricingRecords.map(r => r.region)).size
</script>

<template>
<div class="page">
  <section class="hero">
    <svg class="hero-bg" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line x1="80" y1="60" x2="200" y2="150" class="hero-bg-line" />
      <line x1="200" y1="150" x2="320" y2="50" class="hero-bg-line" />
      <line x1="80" y1="60" x2="320" y2="50" class="hero-bg-line" />
      <circle cx="80" cy="60" r="5" class="hero-bg-node" style="--node-color:#f0932b" />
      <circle cx="200" cy="150" r="5" class="hero-bg-node" style="--node-color:#0078d4" />
      <circle cx="320" cy="50" r="5" class="hero-bg-node" style="--node-color:#4285f4" />
    </svg>

    <span class="hero-eyebrow">{{ providerList }}</span>
    <h1 class="hero-title">Know what your cloud actually costs.</h1>
    <p class="hero-subtitle">
      CloudPricingOps brings pricing, performance, and policy into one comparable view — across every provider you run.
    </p>

    <div class="hero-stats">
      <span>{{ providers.length }} providers</span>
      <span class="hero-stats-divider">·</span>
      <span>{{ domains.length }} domains</span>
      <span class="hero-stats-divider">·</span>
      <span>{{ regionCount }} regions</span>
    </div>
  </section>

  <div class="container mt-4 mb-5">
    <div class="row g-4 justify-content-center">
      <div
        class="col-md-4 d-flex justify-content-center"
        v-for="(card, index) in cards"
        :key="index"
      >
        <Card
          :title="card.title"
          :message="card.message"
          :reference="card.reference"
        />
      </div>
    </div>
  </div>
</div>
</template>

<style scoped src="@/assets/styles/views/Home.scss"></style>