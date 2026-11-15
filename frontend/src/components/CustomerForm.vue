<script setup lang="ts">
import { useId } from 'vue'
import { COUNTRY_OPTIONS, PLAN_OPTIONS } from '@/constants/customerOptions'
import type { useCreateCustomer } from '@/composables/useCreateCustomer'

// El estado del alta vive en la vista para que sobreviva si el panel se cierra con el envío en curso.
const props = defineProps<{ create: ReturnType<typeof useCreateCustomer> }>()
defineEmits<{ submit: []; cancel: [] }>()

const { form, submitting, errorMessage } = props.create

const id = useId()
const planHintId = `${id}-plan-hint`

</script>

<template>
  <form class="panel" novalidate aria-label="Nuevo cliente" @submit.prevent="$emit('submit')">
    <h2 class="panel__title">Nuevo cliente</h2>

    <div class="panel__fields">
      <div class="field">
        <label :for="`${id}-name`">Nombre</label>
        <input :id="`${id}-name`" v-model="form.name" type="text" autocomplete="organization" />
      </div>
      <div class="field">
        <label :for="`${id}-email`">Email</label>
        <input :id="`${id}-email`" v-model="form.email" type="email" autocomplete="off" />
      </div>
      <div class="field">
        <label :for="`${id}-country`">País</label>
        <select :id="`${id}-country`" v-model="form.country">
          <option value="">Selecciona un país</option>
          <option v-for="option in COUNTRY_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="field">
        <label :for="`${id}-plan`">Plan</label>
        <select :id="`${id}-plan`" v-model="form.plan" :aria-describedby="planHintId">
          <option value="">Selecciona un plan</option>
          <option v-for="option in PLAN_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <span :id="planHintId" class="hint">Informativo: no cambia el precio.</span>
      </div>
      <div class="field">
        <label :for="`${id}-tax`">Identificador fiscal</label>
        <input
          :id="`${id}-tax`"
          v-model="form.tax_id"
          type="text"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>

    <p v-if="errorMessage" class="panel__error" role="alert">{{ errorMessage }}</p>

    <div class="panel__actions">
      <button type="submit" class="btn" :disabled="submitting">
        {{ submitting ? 'Creando…' : 'Crear cliente' }}
      </button>
      <button type="button" class="btn btn--quiet" @click="$emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-top: 6px solid var(--accent);
  border-radius: var(--radius);
  background: var(--surface);
}

.panel__title {
  font-size: 1.25rem;
}

.panel__fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.panel__error {
  padding: 0.75rem 1rem;
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  background: var(--danger-tint);
  color: var(--danger);
  font-weight: 600;
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (min-width: 40rem) {
  .panel__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
