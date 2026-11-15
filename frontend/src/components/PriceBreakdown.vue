<script setup lang="ts">
import { RATES_FAILED_MESSAGE } from '@/composables/useExchangeRates'
import type { PricingFailure } from '@/composables/usePricing'
import type { Amounts } from '@/types/simulation'

defineProps<{
  amounts: Amounts | null
  calculating: boolean
  failure: PricingFailure | null
  ratesLoading: boolean
  ratesFailed: boolean
}>()
defineEmits<{ retry: []; retryRates: [] }>()
</script>

<template>
  <div class="price" :aria-busy="calculating">
    <p v-if="calculating" class="price__loading" role="status">Calculando…</p>

    <div v-if="failure" class="notice" role="alert">
      <p>{{ failure.message }}</p>
      <button v-if="failure.retryable" type="button" class="btn btn--quiet" @click="$emit('retry')">
        Reintentar
      </button>
    </div>

    <div v-if="ratesFailed" class="notice" role="alert">
      <p>{{ RATES_FAILED_MESSAGE }}</p>
      <button type="button" class="btn btn--quiet" @click="$emit('retryRates')">Reintentar</button>
    </div>
    <p v-else-if="ratesLoading" class="price__loading" role="status">
      Obteniendo el tipo de cambio…
    </p>

    <dl v-if="amounts" class="price__rows" :class="{ 'price__rows--stale': calculating }">
      <div>
        <dt>Subtotal</dt>
        <dd data-testid="subtotal">{{ amounts.subtotal }}</dd>
      </div>
      <div>
        <dt>IVA</dt>
        <dd data-testid="vat">{{ amounts.vat }}</dd>
      </div>
      <div class="price__total">
        <dt>Total mensual</dt>
        <dd data-testid="total">{{ amounts.total }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.price {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  min-width: 0;
}

.price__loading {
  color: var(--muted);
  font-weight: 600;
}

.price__rows {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 1rem;
  border-left: 6px solid var(--accent);
  border-radius: var(--radius);
  background: var(--accent-tint);
  font-variant-numeric: tabular-nums;
  transition: opacity 0.15s;
}

.price__rows--stale {
  opacity: 0.55;
}

.price__rows > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
}

.price__rows dt {
  color: var(--muted);
}

.price__rows dd {
  margin: 0;
  font-weight: 600;
}

.price__total {
  padding-top: 0.5rem;
  border-top: 1px solid var(--accent);
}

.price__total dt {
  color: var(--ink);
  font-weight: 700;
}

.price__total dd {
  color: var(--accent-strong);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

@media (prefers-reduced-motion: reduce) {
  .price__rows {
    transition: none;
  }
}
</style>
