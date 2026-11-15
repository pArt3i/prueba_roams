<script setup lang="ts">
import { countryLabel, planLabel } from '@/constants/customerOptions'
import type { Customer } from '@/types/customer'

const props = defineProps<{ customer: Customer }>()
const emit = defineEmits<{ select: [customer: Customer] }>()

function open() {
  emit('select', props.customer)
}
</script>

<template>
  <article
    class="card"
    :class="`card--${customer.plan}`"
    role="button"
    tabindex="0"
    :aria-label="`Abrir ${customer.name}`"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
  >
    <header class="card__head">
      <h3 class="card__name">{{ customer.name }}</h3>
      <span class="card__plan">{{ planLabel(customer.plan) }}</span>
    </header>
    <dl class="card__data">
      <div>
        <dt>País</dt>
        <dd>{{ countryLabel(customer.country) }} ({{ customer.country }})</dd>
      </div>
      <div>
        <dt>Identificador fiscal</dt>
        <dd>{{ customer.tax_id }}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{{ customer.email }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.card {
  --plan-color: #6b7a86;
  height: 100%;
  min-width: 0;
  padding: 1rem 1rem 1rem 1.25rem;
  border: 1px solid var(--line);
  border-left: 6px solid var(--plan-color);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
}

.card--business {
  --plan-color: var(--accent);
}

.card--enterprise {
  --plan-color: var(--ink);
}

.card:hover {
  border-color: var(--plan-color);
}

.card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.card__name {
  min-width: 0;
  font-size: 1.125rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.card__plan {
  flex: none;
  padding: 0.1rem 0.6rem;
  border: 1px solid var(--plan-color);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.card__data {
  display: grid;
  gap: 0.4rem;
  margin: 0;
}

.card__data dt {
  color: var(--muted);
  font-size: 0.8125rem;
}

.card__data dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
