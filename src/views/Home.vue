<script setup>
import '@/assets/style.css'
import Card from '@/components/Card.vue'
import { ref } from 'vue'

const currentView = ref('home')

const cards = [
    {title: 'Explore Data', message: 'Blah Blah Explore', reference: "explore"},
    {title: 'Compare Services', message: 'Blah Blah Compare Services', reference: "compare"},
    {title: 'Optimazation', message: 'Blah Blah Optimazation', reference: "optimization"}
]


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

<style scoped src="@/assets/styles/views/Home.scss"></style>