import {createRouter, createWebHistory} from 'vue-router'

import Home from '../views/Home.vue'
import DataExploration from '../views/DataExploration.vue'
import CompareServices from '../views/CompareServices.vue'
import CompareProviders from '../views/CompareProviders.vue'
import CompareScenarios from '../views/CompareScenarios.vue'
import Optimization from '../views/Optimization.vue'


const routes = [
  { 
    path: '/', 
    component: Home 
  },
  { 
    path: '/explore', 
    component: DataExploration 
  },
  { 
    path: '/compare', 
    component: CompareServices 
  },
  { 
    path: '/optimization', 
    component: Optimization 
  },
  {
    path: '/providers',
    component: CompareProviders
  },
  {
    path: '/scenarios',
    component: CompareScenarios
  }

]

export default createRouter({history: createWebHistory(),routes})