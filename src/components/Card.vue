<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const { title, message, reference } = defineProps({
  title: String,
  message: String,
  reference: String
})

const goToPage = () => {
    if (reference) {
        router.push(`/${reference}`) 
    }
}

</script>

<template>
  <div class="feature-card h-100 w-100" style="width: 12rem" @click="goToPage">
    <div class="card-body d-flex flex-column">
      <h5 class="card-title">{{ title }}</h5>
      <p class="card-text">{{ message }}</p>
      <button class="feature-card-btn mt-auto" @click.stop="goToPage">
        Open <span class="arrow">→</span>
      </button>
    </div>
  </div>
</template>

<style scoped src="@/assets/styles/components/Card.scss"></style>