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

    <div class="card h-100 w-100 c" style="width: 12rem">
        <div class="card-body d-flex flex-column">
            <h5 class="card-title c-title">{{ title }}</h5>
            <p class="card-text c-text">{{ message }}</p>
            <button 
            class="btn btn-primary card-btn mt-auto"
            @click="goToPage"
            >
            {{ reference }}
            </button>
        </div> 
    </div>    
</template>    