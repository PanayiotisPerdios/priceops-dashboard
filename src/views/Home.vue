<script setup>
import { computed, ref } from 'vue'
import Card from '@/components/Card.vue'
import { usePricingData, loadDefault, importPricingFile } from '@/composables/usePricingData'

const cards = [
  { title: 'Explore Data', message: 'See instance pricing and metrics across providers.', reference: 'explore' },
  { title: 'Compare', message: 'Set two providers or scenarios side-by-side.', reference: 'compare' },
  { title: 'Evaluate Policies', message: 'Rank providers by cost, performance, or a policy you define.', reference: 'evaluation' },
]

const { loading, error, options, source, sourceName, importReport } = usePricingData({ autoLoad: false })

const providerList = computed(() => options.value.providers.join(' · '))
const providerCount = computed(() => options.value.providers.length)
const categoryCount = computed(() => options.value.categories.length)
const regionCount = computed(() => options.value.regions.length)

const showImportModal = ref(false)

const fileInput = ref(null)
const importError = ref('')
const busy = ref(false)

const showChoice = computed(() => !source.value || (error.value && source.value !== 'custom'))


async function onFile(e) {
  const file = e.target.files[0]
  if (!file) return

  busy.value = true
  importError.value = ''
  showImportModal.value = false

  try {
    await importPricingFile(file)
    showImportModal.value = true
  } catch (err) {
    importError.value = err.message
    if (importReport.value) {
      showImportModal.value = true
    }
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
    <input ref="fileInput" type="file" accept=".csv,.json" hidden @change="onFile"/>

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
      <p class="mb-2">Do you want to import your own pricing CSV or JSON?</p>
      <div class="d-flex justify-content-center gap-3">
        <button class="btn btn-outline-light" :disabled="busy" @click="fileInput.click()">Import CSV / JSON</button>
        <button class="btn btn-outline-primary" :disabled="busy" @click="loadDefault()">Use built-in data</button>
      </div>
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
        <span>{{ categoryCount }} categories</span>
        <span class="hero-stats-divider">·</span>
        <span>{{ regionCount }} regions</span>
      </div>
      <div class="small text-white-50 mt-2">
        Using: {{ sourceName }}
        <a href="#" class="ms-2" @click.prevent="fileInput.click()">Import a different CSV/JSON<</a>
      </div>
      <input ref="fileInput" type="file" accept=".csv" hidden @change="onFile" />
      <div v-if="importError" class="text-danger small mt-2">{{ importError }}</div>
    </template>
  </section>

  <div v-if="showImportModal && importReport && source === 'custom'" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="importReportTitle" style="background-color: rgba(0, 0, 0, 0.7);" @click.self="showImportModal = false">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content bg-dark text-white border-secondary">

        <div class="modal-header border-secondary">
          <h5 id="importReportTitle" class="modal-title">
            Import Report
          </h5>

          <button type="button" class="btn-close btn-close-white" aria-label="Close" @click="showImportModal = false"></button>
        </div>

        <div class="modal-body">

          <div class="row text-center mb-4">
            <div class="col-4">
              <h4>{{ importReport.total }}</h4>
              <small class="text-white-50">Total rows</small>
            </div>

            <div class="col-4">
              <h4 class="text-success">{{ importReport.loaded }}</h4>
              <small class="text-white-50">Loaded</small>
            </div>

            <div class="col-4">
              <h4 :class="importReport.rejected ? 'text-warning' : 'text-success'">
                {{ importReport.rejected }}
              </h4>
              <small class="text-white-50">Rejected</small>
            </div>
          </div>

          <div v-if="importReport.rejectedRows?.length > 0">
            <h6 class="mb-3">Rejected rows</h6>

            <div class="table-responsive">
              <table class="table table-dark table-sm table-bordered">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Validation errors</th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="item in importReport.rejectedRows" :key="item.row">
                    <td>{{ item.row }}</td>
                    <td>{{ item.errors.join('; ') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p v-else class="text-success mb-0">
            All rows passed validation.
          </p>

        </div>

        <div class="modal-footer border-secondary">
          <button type="button" class="btn btn-outline-light" @click="showImportModal = false">
            Close
          </button>
        </div>

      </div>
    </div>
  </div>

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