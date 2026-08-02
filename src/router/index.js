import {createRouter, createWebHistory} from 'vue-router'

import Home from '../views/Home.vue'
import DataExploration from '../views/DataExploration.vue'
import Compare from '../views/Compare.vue'
import Optimization from '../views/Optimization.vue'
import Evaluation from '../views/Evaluation.vue'


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
    path: '/optimization', 
    component: Optimization 
  },
  {
    path: '/compare',
    component: Compare
  },
  {
    path: '/evaluation',
    component: Evaluation
  }

]

export default createRouter({history: createWebHistory(),routes})