<script setup lang="ts">
import { computed, onMounted } from 'vue'
import CurrencySelect from '@/components/CurrencySelect.vue'
import PriceBreakdown from '@/components/PriceBreakdown.vue'
import UsageFields from '@/components/UsageFields.vue'
import UsersInput from '@/components/UsersInput.vue'
import { useCurrencyDisplay } from '@/composables/useCurrencyDisplay'
import { usePricing } from '@/composables/usePricing'
import { useSaveSimulation } from '@/composables/useSaveSimulation'
import { useUsageFields } from '@/composables/useUsageFields'
import type { Customer } from '@/types/customer'

// El país del cálculo sale del cliente y no se puede cambiar (R3). El plan no interviene (R2).
const props = defineProps<{ customer: Customer }>()
const emit = defineEmits<{ saved: [] }>()

const pricing = usePricing(props.customer.country)
const usage = useUsageFields()
const saver = useSaveSimulation(props.customer.id)
const { currency, shownAmounts, ratesFailed, ratesLoading, retryRates } = useCurrencyDisplay(
  pricing.preview,
)

const canSave = computed(() => pricing.canSave.value && usage.valid.value && !saver.saving.value)

async function onSave() {
  const users = pricing.usersNumber.value
  const storageGb = usage.storageGb.value
  const apiCalls = usage.apiCallsCount.value
  if (!canSave.value || users === null || storageGb === null || apiCalls === null) return
  const saved = await saver.save({ users, storage_gb: storageGb, api_calls: apiCalls })
  if (saved) emit('saved')
}

onMounted(() => void pricing.start())
</script>

<template>
  <section class="block" aria-labelledby="simulator-title">
    <h2 id="simulator-title" class="block__title">Simulador</h2>
    <div class="simulator">
      <div class="simulator__inputs">
        <UsersInput
          :value="pricing.usersInput.value"
          :slider-value="pricing.sliderValue.value"
          :error="pricing.usersError.value"
          @change="pricing.setUsers"
        />
        <UsageFields
          v-model:storage="usage.storage.value"
          v-model:api-calls="usage.apiCalls.value"
          :storage-error="usage.storageError.value"
          :api-calls-error="usage.apiCallsError.value"
        />
        <CurrencySelect v-model="currency" />
      </div>

      <div class="simulator__result">
        <PriceBreakdown
          :amounts="shownAmounts"
          :calculating="pricing.calculating.value"
          :failure="pricing.failure.value"
          :rates-loading="ratesLoading"
          :rates-failed="ratesFailed"
          @retry="pricing.retry"
          @retry-rates="retryRates"
        />
        <button type="button" class="btn" :disabled="!canSave" @click="onSave">
          Guardar simulación
        </button>
        <p class="notice notice--ok" role="status">{{ saver.savedMessage.value }}</p>
        <p v-if="saver.errorMessage.value" class="notice" role="alert">
          {{ saver.errorMessage.value }}
        </p>
        <!-- R20: atribución obligatoria de los tipos de cambio; siempre visible, sin condiciones. -->
        <p class="simulator__attribution">
          <a
            href="https://www.exchangerate-api.com"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="rates-attribution"
            >Rates By Exchange Rate API</a
          >
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.simulator {
  display: grid;
  gap: 1.5rem;
}

.simulator__inputs,
.simulator__result {
  display: grid;
  align-content: start;
  gap: 1rem;
  min-width: 0;
}

.simulator__result .btn {
  justify-self: start;
}

.simulator__attribution {
  margin: 0;
  font-size: 0.75rem;
}

.simulator__attribution a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.simulator__attribution a:hover {
  color: var(--accent-strong);
}

.simulator__attribution a:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

@media (min-width: 52rem) {
  .simulator {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 2rem;
  }
}
</style>
