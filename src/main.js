import { createApp } from 'vue'
import router from './router'
import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/bootstrap-custom.scss'

createApp(App).use(router).mount('#app')