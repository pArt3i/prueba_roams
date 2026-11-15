import type { PreviewRequest, PricePreview, Simulation, SimulationDraft } from '@/types/simulation'
import { toApiError } from './apiError'
import { API_URL } from './customersService'

async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

/** `POST /simulations/preview`: precio en EUR sin guardar. Solo `users` y `country` (R7). */
export async function previewPrice(
  request: PreviewRequest,
  signal?: AbortSignal,
): Promise<PricePreview> {
  const response = await postJson('/simulations/preview', request, signal)
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as PricePreview
}

/** `POST /simulations`. Solo el 201 cuenta como éxito. */
export async function createSimulation(draft: SimulationDraft): Promise<Simulation> {
  const response = await postJson('/simulations', draft)
  if (response.status !== 201) throw await toApiError(response)
  return (await response.json()) as Simulation
}

/** `GET /customers/{id}/simulations`: más reciente primero, tal cual lo devuelve la API. */
export async function listSimulations(
  customerId: number,
  signal?: AbortSignal,
): Promise<Simulation[]> {
  const response = await fetch(`${API_URL}/customers/${customerId}/simulations`, { signal })
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as Simulation[]
}
