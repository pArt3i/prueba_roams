<script setup lang="ts">
import { useId } from 'vue'
import { MAX_USERS, MIN_USERS, SLIDER_MAX } from '@/composables/usePricing'

defineProps<{ value: string; sliderValue: number; error: string }>()
const emit = defineEmits<{ change: [text: string] }>()

const id = useId()

function onInput(event: Event) {
  emit('change', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="users">
    <div class="field">
      <label :for="`${id}-slider`">Usuarios</label>
      <input
        :id="`${id}-slider`"
        class="users__slider"
        type="range"
        :min="MIN_USERS"
        :max="SLIDER_MAX"
        step="1"
        :value="sliderValue"
        aria-label="Usuarios (deslizador de 1 a 200)"
        @input="onInput"
      />
    </div>
    <div class="field">
      <label :for="`${id}-number`">Número exacto de usuarios</label>
      <input
        :id="`${id}-number`"
        type="number"
        inputmode="numeric"
        :min="MIN_USERS"
        :max="MAX_USERS"
        step="1"
        :value="value"
        :aria-invalid="error !== ''"
        :aria-describedby="error ? `${id}-error` : undefined"
        aria-label="Número de usuarios (de 1 a 10000)"
        @input="onInput"
      />
      <p v-if="error" :id="`${id}-error`" class="field__error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.users {
  display: grid;
  gap: 1rem;
}

.users__slider {
  min-height: 2.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  accent-color: var(--accent);
  cursor: pointer;
}
</style>
