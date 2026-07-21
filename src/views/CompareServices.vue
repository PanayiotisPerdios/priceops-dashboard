<script setup>
import { ref, computed } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import Card from '@/components/Card.vue'

const currentView = ref('home')

const cards = [
    {title: 'Provider Comparison', message: 'Compare providers based on evaluation criteria', reference: "providers"},
    {title: 'Scenario Comparison', message: 'Compare scenarios based on evaluation criteria', reference: "scenarios"},
]

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from 'chart.js'
import { Line } from 'vue-chartjs'

</script>

<template>
   <div v-if="currentView === 'home'" class="container mt-4">
        <div class="row g-4">
            <div class="col-md-4 d-flex justify-content-center" v-for="(card, index) in cards" :key="index">  
                <Card
                    :title="card.title"
                    :message="card.message"
                    :reference="card.reference"
                />
            </div>
        </div>
    </div>   
</template>

<style scoped src="@/assets/styles/views/CompareProviders.scss"></style>