<script setup lang="ts">
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="state" role="alert">
    <p>No se pudieron cargar los clientes. Inténtalo de nuevo.</p>
    <button type="button" class="btn" @click="$emit('retry')">Reintentar</button>
  </div>
</template>

<style scoped>
.state {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  background: var(--danger-tint);
  color: var(--danger);
  text-align: center;
}
</style>
