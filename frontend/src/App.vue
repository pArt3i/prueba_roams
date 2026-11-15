<script setup lang="ts">
import { ref } from 'vue'
import CustomerDetailPlaceholder from '@/views/CustomerDetailPlaceholder.vue'
import CustomersView from '@/views/CustomersView.vue'
import type { Customer } from '@/types/customer'

// Sin router (R5): dos vistas y el cliente seleccionado. Al volver, la lista
// se monta de nuevo y se recarga desde la API.
const selected = ref<Customer | null>(null)
</script>

<template>
  <header class="topbar">
    <span class="topbar__brand">SaaS-O-Matic</span>
  </header>
  <main class="page">
    <CustomerDetailPlaceholder v-if="selected" :customer="selected" @back="selected = null" />
    <CustomersView v-else @select="selected = $event" />
  </main>
</template>

<style scoped>
.topbar {
  padding: 0.75rem 1rem;
  background: var(--ink);
  color: #fff;
}

.topbar__brand {
  display: block;
  max-width: 72rem;
  margin: 0 auto;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.page {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

@media (min-width: 40rem) {
  .page {
    padding: 2rem 1.5rem 4rem;
  }
}
</style>
