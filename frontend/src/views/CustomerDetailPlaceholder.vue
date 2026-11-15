<script setup lang="ts">
import type { Customer } from '@/types/customer'

// Marcador provisional: la spec 004 lo sustituye por el detalle y el simulador.
defineProps<{ customer: Customer }>()
defineEmits<{ back: [] }>()
</script>

<template>
  <section class="detail">
    <button type="button" class="btn btn--quiet" @click="$emit('back')">Volver a clientes</button>
    <h1 class="detail__title">{{ customer.name }}</h1>
    <p class="detail__note">El detalle del cliente y el simulador llegan en la spec 004.</p>
  </section>
</template>

<style scoped>
.detail {
  display: grid;
  justify-items: start;
  gap: 1rem;
}

.detail__title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.detail__note {
  color: var(--muted);
}
</style>
