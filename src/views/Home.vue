<script setup>
import Card from '@/components/Card.vue'
import { ref } from 'vue'


const cards = [
    {title: 'Explore Data', message: 'Browse pricing and metrics by provider and service', reference: "explore"},
    {title: 'Compare', message: 'Compare two providers/scenarios side by side', reference: "compare"},
    {title: 'Evaluate Policies', message: 'Rank providers by cost, performance, or a balanced policy', reference: "evaluation"}
]


</script>

<template>
<div class="page">
  <div class="container mt-4">
    <div class="row g-4">
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