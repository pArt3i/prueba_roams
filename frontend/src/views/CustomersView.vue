<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CustomerCount from '@/components/CustomerCount.vue'
import CustomerForm from '@/components/CustomerForm.vue'
import CustomerGrid from '@/components/CustomerGrid.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import LoadingState from '@/components/LoadingState.vue'
import SearchBox from '@/components/SearchBox.vue'
import { useCreateCustomer } from '@/composables/useCreateCustomer'
import { useCustomers } from '@/composables/useCustomers'
import type { Customer } from '@/types/customer'

defineEmits<{ select: [customer: Customer] }>()

const { customers, status, query, term, fetchCustomers, setQuery, resetSearch, retry } =
  useCustomers()

const create = useCreateCustomer()
const formOpen = ref(false)
const notice = ref('')

const emptyMessage = computed(() =>
  term.value === '' ? 'Aún no hay clientes.' : `No hay clientes que coincidan con «${term.value}».`,
)

function closeForm() {
  formOpen.value = false
  create.reset()
}

function toggleForm() {
  if (formOpen.value) closeForm()
  else formOpen.value = true
}

// El alta vive aquí, no en el formulario: si se cierra el panel con el envío en curso,
// un 201 recarga la lista y avisa igualmente (R8). Un fallo con el panel cerrado no muestra nada.
async function onSubmit() {
  if (await create.submit()) {
    formOpen.value = false
    notice.value = 'Cliente creado.'
    void resetSearch()
  } else if (!formOpen.value) {
    create.reset()
  }
}

onMounted(fetchCustomers)
</script>

<template>
  <section class="dashboard">
    <h1 class="dashboard__title">Clientes</h1>

    <div class="dashboard__toolbar">
      <SearchBox :model-value="query" @update:model-value="setQuery" />
      <button type="button" class="btn" :aria-expanded="formOpen" @click="toggleForm">
        Nuevo cliente
      </button>
    </div>

    <CustomerForm v-if="formOpen" :create="create" @submit="onSubmit" @cancel="closeForm" />

    <div class="dashboard__notice" role="status">{{ notice }}</div>

    <LoadingState v-if="status === 'loading'" />
    <ErrorState v-else-if="status === 'error'" @retry="retry" />
    <EmptyState v-else-if="customers.length === 0" :message="emptyMessage" />
    <template v-else>
      <CustomerCount :count="customers.length" />
      <CustomerGrid :customers="customers" @select="$emit('select', $event)" />
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 1.25rem;
}

.dashboard__title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.dashboard__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

.dashboard__notice:not(:empty) {
  padding: 0.75rem 1rem;
  border: 1px solid var(--ok);
  border-radius: var(--radius);
  background: var(--ok-tint);
  color: var(--ok);
  font-weight: 600;
}
</style>
