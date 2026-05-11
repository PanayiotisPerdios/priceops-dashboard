<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
<nav class="navbar navbar-expand-lg bg-body-tertiary" data-bs-theme="dark">
  <div class="container-fluid">
        <router-link class="navbar-brand" :to="'/'">PriceOps</router-link>

    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarSupportedContent">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <router-link class="nav-link active" aria-current="page" href="#">Home</router-link>
        </li>
        <li class="nav-item">
          <router-link class="nav-link" href="#">Link</router-link>
        </li>
        <li class="nav-item dropdown">
          <router-link class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            Dropdown
          </router-link>
          <ul class="dropdown-menu">
            <li><router-link class="dropdown-item" href="#">Action</router-link></li>
            <li><router-link class="dropdown-item" href="#">Another action</router-link></li>
            <li><hr class="dropdown-divider"></li>
            <li><router-link class="dropdown-item" href="#">Something else here</router-link></li>
          </ul>
        </li>
        <li class="nav-item">
          <router-link class="nav-link disabled" aria-disabled="true">Disabled</router-link>
        </li>
      </ul>
      <form class="d-flex" role="search">
        <input class="form-control me-2" type="search" placeholder="Search" aria-label="Search"/>
        <button class="btn btn-outline-success" type="submit">Search</button>
      </form>
    </div>
  </div>
</nav>
</template>
