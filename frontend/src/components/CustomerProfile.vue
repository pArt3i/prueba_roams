<script setup lang="ts">
import { countryLabel, planLabel } from '@/constants/customerOptions'
import type { Customer } from '@/types/customer'

defineProps<{ customer: Customer }>()
</script>

<template>
  <section
    class="block profile"
    :class="`profile--${customer.plan}`"
    aria-label="Ficha del cliente"
  >
    <h1 class="profile__name">{{ customer.name }}</h1>
    <dl class="profile__data">
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
      <div>
        <dt>Plan</dt>
        <dd>
          <span class="profile__plan">{{ planLabel(customer.plan) }}</span>
          <span class="profile__hint">Informativo: no cambia el precio.</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.profile {
  --plan-color: #6b7a86;
  border-top-color: var(--plan-color);
}

.profile--business {
  --plan-color: var(--accent);
}

.profile--enterprise {
  --plan-color: var(--ink);
}

.profile__name {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.profile__data {
  display: grid;
  gap: 0.75rem 1.5rem;
  margin: 0;
}

.profile__data dt {
  color: var(--muted);
  font-size: 0.8125rem;
}

.profile__data dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.profile__plan {
  display: inline-block;
  padding: 0.1rem 0.6rem;
  border: 1px solid var(--plan-color);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.profile__hint {
  display: block;
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.875rem;
}

@media (min-width: 40rem) {
  .profile__data {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 60rem) {
  .profile__data {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
