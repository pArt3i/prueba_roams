<script setup lang="ts">
import { onMounted } from 'vue'
import CustomerProfile from '@/components/CustomerProfile.vue'
import SimulationHistory from '@/components/SimulationHistory.vue'
import SimulatorPanel from '@/components/SimulatorPanel.vue'
import { useSimulationHistory } from '@/composables/useSimulationHistory'
import type { Customer } from '@/types/customer'

// Los datos son los de la tarjeta seleccionada: no se llama a `GET /customers/{id}` (R1).
const props = defineProps<{ customer: Customer }>()
defineEmits<{ back: [] }>()

const history = useSimulationHistory(props.customer.id)

onMounted(history.load)
</script>

<template>
  <div class="detail">
    <button type="button" class="btn btn--quiet detail__back" @click="$emit('back')">
      Volver a clientes
    </button>
    <CustomerProfile :customer="customer" />
    <SimulatorPanel :customer="customer" @saved="history.load" />
    <SimulationHistory
      :simulations="history.simulations.value"
      :status="history.status.value"
      @retry="history.retry"
    />
  </div>
</template>

<style scoped>
.detail {
  display: grid;
  gap: 1.25rem;
}

.detail__back {
  justify-self: start;
}
</style>
