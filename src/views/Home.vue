<script setup>
import { computed, ref } from 'vue'
import Card from '@/components/Card.vue'
import { usePricingData, loadDefault, importCsvFile } from '@/composables/usePricingData'

const cards = [
  { title: 'Explore Data', message: 'See instance pricing and metrics across providers.', reference: 'explore' },
  { title: 'Compare', message: 'Set two providers or scenarios side-by-side.', reference: 'compare' },
  { title: 'Evaluate Policies', message: 'Rank providers by cost, performance, or a policy you define.', reference: 'evaluation' },
]

const { loading, error, options, source, sourceName } = usePricingData({ autoLoad: false })

const providerList = computed(() => options.value.providers.join(' · '))
const providerCount = computed(() => options.value.providers.length)
const domainCount = computed(() => options.value.domains.length)
const regionCount = computed(() => options.value.regions.length)

const fileInput = ref(null)
const importError = ref('')
const busy = ref(false)

const showChoice = computed(() => !source.value || (error.value && source.value !== 'custom'))

async function onFile(e) {
  const file = e.target.files[0]
  if (!file) return
  busy.value = true
  importError.value = ''
  try {
    await importCsvFile(file)
  } catch (err) {
    importError.value = err.message
  } finally {
    busy.value = false
    e.target.value = ''
  }
}

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

     <span class="hero-eyebrow">
      <template v-if="showChoice">Choose your data</template>
      <template v-else-if="loading">Loading providers…</template>
      <template v-else>{{ providerList }}</template>
    </span>
    <h1 class="hero-title">Know what your cloud actually costs.</h1>
    <p class="hero-subtitle">
      CloudPricingOps brings pricing, performance, and policy into one comparable view — across every provider you run.
    </p>

    <div v-if="showChoice" class="mt-3">
      <p class="mb-2">Do you want to import your own pricing CSV?</p>
      <div class="d-flex justify-content-center gap-3">
        <button class="btn btn-outline-light" :disabled="busy" @click="fileInput.click()">Import CSV</button>
        <button class="btn btn-outline-primary" :disabled="busy" @click="loadDefault()">Use built-in data</button>
      </div>
      <input ref="fileInput" type="file" accept=".csv" hidden @change="onFile" />
      <div v-if="importError" class="text-danger small mt-2">{{ importError }}</div>
      <div v-if="error" class="text-danger small mt-2">Couldn't load the built-in data: {{ error.message }}</div>
    </div>

    <template v-else>
      <div class="hero-stats" v-if="loading">
        <span>Loading…</span>
      </div>
      <div class="hero-stats" v-else>
        <span>{{ providerCount }} providers</span>
        <span class="hero-stats-divider">·</span>
        <span>{{ domainCount }} domains</span>
        <span class="hero-stats-divider">·</span>
        <span>{{ regionCount }} regions</span>
      </div>
      <div class="small text-white-50 mt-2">
        Using: {{ sourceName }}
        <a href="#" class="ms-2" @click.prevent="fileInput.click()">Import a different CSV</a>
      </div>
      <input ref="fileInput" type="file" accept=".csv" hidden @change="onFile" />
      <div v-if="importError" class="text-danger small mt-2">{{ importError }}</div>
    </template>
  </section>

  <div class="container mt-4 mb-5">
    <div class="row g-4 justify-content-center">
      <div class="col-md-4 d-flex justify-content-center" v-for="(card, index) in cards" :key="index">
        <Card :title="card.title" :message="card.message" :reference="card.reference"/>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped src="@/assets/styles/views/Home.scss"></style>