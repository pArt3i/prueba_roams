import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { listCustomers } from '@/services/customersService'
import type { Customer } from '@/types/customer'

export const SEARCH_DELAY_MS = 300

export type LoadStatus = 'loading' | 'error' | 'ready'

/** Lista de clientes con búsqueda diferida. Cada búsqueda va al backend (R2). */
export function useCustomers() {
  const customers = ref<Customer[]>([])
  const status = ref<LoadStatus>('loading')
  /** Texto tal como está en el buscador. */
  const query = ref('')
  /** Texto (ya recortado) de la última petición lanzada. */
  const term = ref('')

  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  async function load(searchTerm: string): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    term.value = searchTerm
    status.value = 'loading'
    try {
      const result = await listCustomers(searchTerm, current.signal)
      // R4: una respuesta antigua no pisa a una más reciente.
      if (controller !== current) return
      customers.value = result
      status.value = 'ready'
    } catch {
      if (controller !== current) return
      status.value = 'error'
    }
  }

  function cancelPendingSearch() {
    clearTimeout(timer)
    timer = undefined
  }

  /** Carga inicial: lista completa. */
  function fetchCustomers(): Promise<void> {
    cancelPendingSearch()
    return load(query.value.trim())
  }

  /** Se llama en cada pulsación; la petición sale 300 ms después de la última. */
  function setQuery(value: string) {
    query.value = value
    cancelPendingSearch()
    timer = setTimeout(() => {
      timer = undefined
      void load(value.trim())
    }, SEARCH_DELAY_MS)
  }

  /** Vacía el buscador y pide la lista completa sin esperar. */
  function resetSearch(): Promise<void> {
    query.value = ''
    return fetchCustomers()
  }

  function retry(): Promise<void> {
    return fetchCustomers()
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancelPendingSearch()
      controller?.abort()
    })
  }

  return { customers, status, query, term, fetchCustomers, setQuery, resetSearch, retry }
}
