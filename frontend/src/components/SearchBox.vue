<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const inputId = useId()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="field search">
    <label :for="inputId">Buscar clientes</label>
    <input
      :id="inputId"
      type="search"
      autocomplete="off"
      placeholder="Nombre o identificador fiscal"
      :value="modelValue"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.search {
  flex: 1 1 16rem;
}
</style>
