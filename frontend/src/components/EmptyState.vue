<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <p class="state">{{ message }}</p>
</template>

<style scoped>
.state {
  padding: 2rem 1rem;
  border: 2px dashed var(--line);
  border-radius: var(--radius);
  color: var(--muted);
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
