<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ count: number }>()

const text = computed(() => (props.count === 1 ? '1 cliente' : `${props.count} clientes`))
</script>

<template>
  <p class="count" role="status" aria-live="polite">{{ text }}</p>
</template>

<style scoped>
.count {
  color: var(--muted);
  font-weight: 600;
}
</style>
