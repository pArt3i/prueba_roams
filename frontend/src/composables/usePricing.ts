import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import { ApiError } from '@/services/apiError'
import { previewPrice } from '@/services/simulationsService'
import type { CountryCode } from '@/types/customer'
import type { PricePreview } from '@/types/simulation'
import { parseIntegerInRange } from '@/utils/format'

export const PRICING_DELAY_MS = 300
export const MIN_USERS = 1
export const MAX_USERS = 10000
export const SLIDER_MAX = 200
export const USERS_ERROR = 'El número de usuarios debe ser un entero entre 1 y 10000.'
export const PRICING_FAILED_MESSAGE = 'No se pudo calcular el precio. Inténtalo de nuevo.'

export interface PricingFailure {
  message: string
  /** «Reintentar» solo en fallos de red o 5xx (R8), no en un 422 con `detail`. */
  retryable: boolean
}

/**
 * Cálculo del precio con espera de 300 ms, cancelación y descarte de respuestas
 * antiguas (R4 a R8). El precio lo calcula el backend; aquí solo se pide y se muestra.
 */
export function usePricing(country: CountryCode) {
  const usersInput = ref(String(MIN_USERS))
  const sliderValue = ref(MIN_USERS)
  const preview = ref<PricePreview | null>(null)
  const calculating = ref(false)
  const waiting = ref(false)
  const failure = ref<PricingFailure | null>(null)

  const usersNumber = computed(() => parseIntegerInRange(usersInput.value, MIN_USERS, MAX_USERS))
  const usersError = computed(() => (usersNumber.value === null ? USERS_ERROR : ''))
  /** Hay un precio para el valor actual: ni espera, ni cálculo, ni fallo. */
  const canSave = computed(
    () =>
      usersNumber.value !== null &&
      !waiting.value &&
      !calculating.value &&
      failure.value === null &&
      preview.value !== null,
  )

  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  function cancelPending() {
    clearTimeout(timer)
    timer = undefined
    waiting.value = false
    controller?.abort()
    controller = null
    calculating.value = false
  }

  function toFailure(error: unknown): PricingFailure {
    const showsApiMessage =
      error instanceof ApiError && [404, 422].includes(error.status) && error.detail !== null
    return showsApiMessage
      ? { message: error.detail as string, retryable: false }
      : { message: PRICING_FAILED_MESSAGE, retryable: true }
  }

  async function calculate(): Promise<void> {
    const users = usersNumber.value
    if (users === null) return
    cancelPending()
    const current = new AbortController()
    controller = current
    calculating.value = true
    try {
      const result = await previewPrice({ users, country }, current.signal)
      if (controller !== current) return // respuesta antigua: se descarta
      preview.value = result
      failure.value = null
    } catch (error) {
      if (controller !== current) return
      preview.value = null // un importe de otro número de usuarios no se deja a la vista
      failure.value = toFailure(error)
    }
    calculating.value = false
    controller = null
  }

  /** Cambio de usuarios desde el slider o el campo (texto tal cual). */
  function setUsers(text: string) {
    usersInput.value = text
    const users = usersNumber.value
    cancelPending()
    if (users === null) {
      // R5: sin importes, sin carga y sin mensaje de fallo.
      preview.value = null
      failure.value = null
      return
    }
    sliderValue.value = Math.min(users, SLIDER_MAX)
    waiting.value = true
    timer = setTimeout(() => {
      timer = undefined
      void calculate()
    }, PRICING_DELAY_MS)
  }

  /** Carga inicial al abrir la vista, con el valor actual y sin espera. */
  function start(): Promise<void> {
    return calculate()
  }

  /** «Reintentar»: cancela una espera pendiente y hace una sola petición inmediata (R8). */
  function retry(): Promise<void> {
    return calculate()
  }

  if (getCurrentScope()) onScopeDispose(cancelPending)

  return {
    usersInput,
    sliderValue,
    usersNumber,
    usersError,
    preview,
    calculating,
    waiting,
    failure,
    canSave,
    setUsers,
    start,
    retry,
  }
}
