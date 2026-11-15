import { ref } from 'vue'
import { fetchExchangeRates } from '@/services/exchangeService'
import type { ExchangeRates } from '@/types/simulation'

export const EXCHANGE_TIMEOUT_MS = 5000
export const RATES_FAILED_MESSAGE =
  'No se pudo obtener el tipo de cambio. Se muestran los importes en EUR.'

export type RatesStatus = 'idle' | 'loading' | 'ready' | 'error'

// Estado a nivel de módulo (R12): vive fuera de la vista de detalle, que se monta de
// nuevo al volver de la lista, y se conserva hasta que se recarga la página.
const rates = ref<ExchangeRates | null>(null)
const status = ref<RatesStatus>('idle')

let attempt = 0
let controller: AbortController | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function stopRequest() {
  attempt++
  clearTimeout(timer)
  controller?.abort()
  controller = null
}

/** Una sola petición a `open.er-api.com` con espera de 5 s. Un fallo no se guarda (R12, R13). */
async function request(): Promise<void> {
  stopRequest()
  const current = attempt
  const own = new AbortController()
  controller = own
  status.value = 'loading'
  timer = setTimeout(() => {
    if (attempt !== current) return
    stopRequest() // una respuesta posterior se ignora
    status.value = 'error'
  }, EXCHANGE_TIMEOUT_MS)
  try {
    const result = await fetchExchangeRates(own.signal)
    if (attempt !== current) return
    clearTimeout(timer)
    rates.value = result
    status.value = 'ready'
  } catch {
    if (attempt !== current) return
    clearTimeout(timer)
    status.value = 'error'
  }
}

/** Tipo de cambio compartido: se pide la primera vez que se elige USD o GBP. */
export function useExchangeRates() {
  /** Pide los tipos si no están en memoria, ni hay una petición en curso, ni un fallo pendiente de «Reintentar». */
  function ensureRates(): Promise<void> {
    if (rates.value !== null || status.value === 'loading' || status.value === 'error') {
      return Promise.resolve()
    }
    return request()
  }

  function retry(): Promise<void> {
    return request()
  }

  /** Un fallo no se conserva entre vistas: al abrir un detalle nuevo se olvida. */
  function forgetFailure() {
    if (status.value === 'error') status.value = 'idle'
  }

  return { rates, status, ensureRates, retry, forgetFailure }
}

/** Solo para tests: vuelve al estado inicial del módulo. */
export function resetExchangeRates() {
  stopRequest()
  rates.value = null
  status.value = 'idle'
}
