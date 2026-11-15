<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ storageError: string; apiCallsError: string }>()
const storage = defineModel<string>('storage', { required: true })
const apiCalls = defineModel<string>('apiCalls', { required: true })

const id = useId()
const hint = 'Informativo: se guarda, no cambia el precio.'
</script>

<template>
  <div class="usage">
    <div class="field">
      <label :for="`${id}-storage`">Almacenamiento (GB)</label>
      <input
        :id="`${id}-storage`"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        :value="storage"
        :aria-invalid="storageError !== ''"
        :aria-describedby="`${id}-storage-hint`"
        @input="storage = ($event.target as HTMLInputElement).value"
      />
      <span :id="`${id}-storage-hint`" class="hint">{{ hint }}</span>
      <p v-if="storageError" class="field__error" role="alert">{{ storageError }}</p>
    </div>
    <div class="field">
      <label :for="`${id}-calls`">Llamadas a la API</label>
      <input
        :id="`${id}-calls`"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        :value="apiCalls"
        :aria-invalid="apiCallsError !== ''"
        :aria-describedby="`${id}-calls-hint`"
        @input="apiCalls = ($event.target as HTMLInputElement).value"
      />
      <span :id="`${id}-calls-hint`" class="hint">{{ hint }}</span>
      <p v-if="apiCallsError" class="field__error" role="alert">{{ apiCallsError }}</p>
    </div>
  </div>
</template>

<style scoped>
.usage {
  display: grid;
  gap: 1rem;
}

@media (min-width: 40rem) {
  .usage {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
