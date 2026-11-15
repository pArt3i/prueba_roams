import { ref } from 'vue'
import { ApiError } from '@/services/apiError'
import { createSimulation } from '@/services/simulationsService'
import type { SimulationDraft } from '@/types/simulation'

export const SAVED_MESSAGE = 'Simulación guardada.'
export const SAVE_FAILED_MESSAGE = 'No se pudo guardar la simulación. Inténtalo de nuevo.'

export type SimulationFields = Omit<SimulationDraft, 'customer_id'>

/** Guardado de una simulación. Envía solo `customer_id`, `users`, `storage_gb` y `api_calls` (R9). */
export function useSaveSimulation(customerId: number) {
  const saving = ref(false)
  const savedMessage = ref('')
  const errorMessage = ref('')

  /** Devuelve `true` solo si la API respondió 201. */
  async function save(fields: SimulationFields): Promise<boolean> {
    if (saving.value) return false // un doble clic no duplica la simulación
    saving.value = true
    savedMessage.value = ''
    errorMessage.value = ''
    try {
      await createSimulation({
        customer_id: customerId,
        users: fields.users,
        storage_gb: fields.storage_gb,
        api_calls: fields.api_calls,
      })
      savedMessage.value = SAVED_MESSAGE
      return true
    } catch (error) {
      const showsApiMessage =
        error instanceof ApiError && [404, 422].includes(error.status) && error.detail !== null
      errorMessage.value = showsApiMessage ? (error.detail as string) : SAVE_FAILED_MESSAGE
      return false
    } finally {
      saving.value = false
    }
  }

  return { saving, savedMessage, errorMessage, save }
}
