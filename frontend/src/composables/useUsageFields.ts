import { computed, ref } from 'vue'
import { parseIntegerInRange } from '@/utils/format'

export const MAX_STORAGE_GB = 1_000_000
export const MAX_API_CALLS = 1_000_000_000
export const STORAGE_ERROR = 'El almacenamiento debe ser un entero entre 0 y 1000000.'
export const API_CALLS_ERROR = 'Las llamadas a la API deben ser un entero entre 0 y 1000000000.'

/** Almacenamiento y llamadas a la API: informativos, se guardan pero no cambian el precio (R6). */
export function useUsageFields() {
  const storage = ref('0')
  const apiCalls = ref('0')

  const storageGb = computed(() => parseIntegerInRange(storage.value, 0, MAX_STORAGE_GB))
  const apiCallsCount = computed(() => parseIntegerInRange(apiCalls.value, 0, MAX_API_CALLS))
  const storageError = computed(() => (storageGb.value === null ? STORAGE_ERROR : ''))
  const apiCallsError = computed(() => (apiCallsCount.value === null ? API_CALLS_ERROR : ''))
  const valid = computed(() => storageGb.value !== null && apiCallsCount.value !== null)

  return {
    storage,
    apiCalls,
    storageGb,
    apiCallsCount,
    storageError,
    apiCallsError,
    valid,
  }
}
