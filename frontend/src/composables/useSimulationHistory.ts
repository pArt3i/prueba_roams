import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { listSimulations } from '@/services/simulationsService'
import type { Simulation } from '@/types/simulation'
import type { LoadStatus } from './useCustomers'

/** Historial del cliente, en el orden en que lo devuelve la API (R10). */
export function useSimulationHistory(customerId: number) {
  const simulations = ref<Simulation[]>([])
  const status = ref<LoadStatus>('loading')

  let controller: AbortController | null = null

  async function load(): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    // Con datos a la vista, una recarga no los sustituye por «Cargando historial…».
    if (status.value !== 'ready') status.value = 'loading'
    try {
      const result = await listSimulations(customerId, current.signal)
      if (controller !== current) return // respuesta antigua: se descarta
      simulations.value = result
      status.value = 'ready'
    } catch {
      if (controller !== current) return
      status.value = 'error'
    }
  }

  if (getCurrentScope()) onScopeDispose(() => controller?.abort())

  return { simulations, status, load, retry: load }
}
