<script setup lang="ts">
import type { Customer } from '@/types/customer'
import CustomerCard from './CustomerCard.vue'

defineProps<{ customers: Customer[] }>()
defineEmits<{ select: [customer: Customer] }>()
</script>

<template>
  <ul class="grid">
    <li v-for="customer in customers" :key="customer.id">
      <CustomerCard :customer="customer" @select="$emit('select', $event)" />
    </li>
  </ul>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 40rem) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  }
}
</style>
