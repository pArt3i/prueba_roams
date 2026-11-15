<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue'
import type { LoadStatus } from '@/composables/useCustomers'
import type { Simulation } from '@/types/simulation'
import { formatMoney } from '@/utils/currency'
import { formatCount, formatDateTime } from '@/utils/format'

defineProps<{ simulations: Simulation[]; status: LoadStatus }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <section class="block" aria-labelledby="history-title">
    <h2 id="history-title" class="block__title">Historial de simulaciones</h2>

    <p v-if="status === 'loading'" class="history__loading" role="status">Cargando historial…</p>

    <div v-else-if="status === 'error'" class="notice" role="alert">
      <p>No se pudo cargar el historial. Inténtalo de nuevo.</p>
      <button type="button" class="btn btn--quiet" @click="$emit('retry')">Reintentar</button>
    </div>

    <EmptyState v-else-if="simulations.length === 0" message="Aún no hay simulaciones." />

    <template v-else>
      <p class="history__note">Importes en EUR</p>
      <table class="history">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Usuarios</th>
            <th scope="col">Almacenamiento (GB)</th>
            <th scope="col">Llamadas a la API</th>
            <th scope="col">Subtotal</th>
            <th scope="col">IVA</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="simulation in simulations" :key="simulation.id">
            <td data-label="Fecha">{{ formatDateTime(simulation.created_at) }}</td>
            <td data-label="Usuarios">{{ formatCount(simulation.users) }}</td>
            <td data-label="Almacenamiento (GB)">{{ formatCount(simulation.storage_gb) }}</td>
            <td data-label="Llamadas a la API">{{ formatCount(simulation.api_calls) }}</td>
            <td data-label="Subtotal">{{ formatMoney(simulation.subtotal, 'EUR') }}</td>
            <td data-label="IVA">{{ formatMoney(simulation.vat, 'EUR') }}</td>
            <td data-label="Total" class="history__total">
              {{ formatMoney(simulation.total, 'EUR') }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>

<style scoped>
.history__loading,
.history__note {
  color: var(--muted);
}

.history {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

/* Móvil: cada fila es un bloque con sus etiquetas, sin scroll horizontal. */
.history thead {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.history tr {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--line);
}

.history td {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  overflow-wrap: anywhere;
}

.history td::before {
  content: attr(data-label);
  color: var(--muted);
}

.history__total {
  font-weight: 700;
}

@media (min-width: 52rem) {
  .history thead {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }

  .history tr {
    display: table-row;
    padding: 0;
    border: 0;
  }

  .history th,
  .history td {
    display: table-cell;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--line);
    text-align: right;
  }

  .history th:first-child,
  .history td:first-child {
    text-align: left;
  }

  .history td::before {
    content: none;
  }

  .history th {
    color: var(--muted);
    font-size: 0.8125rem;
    font-weight: 600;
  }
}
</style>
