import { reactive, ref } from 'vue'
import { ApiError } from '@/services/apiError'
import { createCustomer } from '@/services/customersService'
import type { CustomerDraft } from '@/types/customer'

export const CREATE_FAILED_MESSAGE = 'No se pudo crear el cliente. Inténtalo de nuevo.'

function emptyDraft(): CustomerDraft {
  return { name: '', email: '', country: '', plan: '', tax_id: '' }
}

/** Alta de cliente. No valida nada: lo que se escribe viaja tal cual (R6). */
export function useCreateCustomer() {
  const form = reactive<CustomerDraft>(emptyDraft())
  const submitting = ref(false)
  const errorMessage = ref('')

  function reset() {
    Object.assign(form, emptyDraft())
    errorMessage.value = ''
  }

  /** Devuelve `true` solo si la API respondió 201. */
  async function submit(): Promise<boolean> {
    if (submitting.value) return false // R7: sin envíos duplicados
    submitting.value = true
    errorMessage.value = ''
    try {
      await createCustomer({ ...form })
      reset()
      return true
    } catch (error) {
      const isValidationError = error instanceof ApiError && [409, 422].includes(error.status)
      errorMessage.value =
        isValidationError && error.detail !== null ? error.detail : CREATE_FAILED_MESSAGE
      return false
    } finally {
      submitting.value = false
    }
  }

  return { form, submitting, errorMessage, submit, reset }
}
