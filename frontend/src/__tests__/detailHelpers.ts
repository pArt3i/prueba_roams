import { API_URL } from '@/services/customersService'
import { EXCHANGE_URL } from '@/services/exchangeService'
import type { PricePreview, Simulation } from '@/types/simulation'
import { jsonResponse, stubFetch } from './helpers'

export const PREVIEW_URL = `${API_URL}/simulations/preview`
export const SIMULATIONS_URL = `${API_URL}/simulations`
export const historyUrl = (customerId: number) => `${API_URL}/customers/${customerId}/simulations`
export { EXCHANGE_URL }

/** Ejemplo de la spec 002: 60 usuarios, ES. */
export function makePreview(overrides: Partial<PricePreview> = {}): PricePreview {
  return {
    users: 60,
    country: 'ES',
    currency: 'EUR',
    vat_rate: '0.21',
    subtotal: '470.00',
    vat: '98.70',
    total: '568.70',
    ...overrides,
  }
}

export function makeSimulation(overrides: Partial<Simulation> = {}): Simulation {
  return {
    id: 7,
    customer_id: 1,
    users: 60,
    storage_gb: 100,
    api_calls: 5000,
    country: 'ES',
    currency: 'EUR',
    vat_rate: '0.21',
    subtotal: '470.00',
    vat: '98.70',
    total: '568.70',
    created_at: '2026-11-15T10:00:00Z',
    ...overrides,
  }
}

export function ratesBody(usd: unknown, gbp: unknown, result: unknown = 'success') {
  return { result, rates: { USD: usd, GBP: gbp } }
}

type Handler = (init?: RequestInit) => Promise<Response> | Response
export interface Routes {
  preview?: Handler
  save?: Handler
  history?: Handler
  rates?: Handler
  customers?: Handler
}

/** `fetch` simulado que reparte por URL; lo no indicado responde con valores correctos por defecto. */
export function routeFetch(routes: Routes = {}) {
  const fetchMock = stubFetch()
  fetchMock.mockImplementation(async (url, init) => {
    const handler = (() => {
      if (url === PREVIEW_URL) return routes.preview ?? (() => jsonResponse(makePreview()))
      if (url === SIMULATIONS_URL) {
        return routes.save ?? (() => jsonResponse(makeSimulation(), 201))
      }
      if (/\/customers\/\d+\/simulations$/.test(url))
        return routes.history ?? (() => jsonResponse([]))
      if (url === EXCHANGE_URL) return routes.rates ?? (() => jsonResponse(ratesBody(1.0829, 0.85)))
      if (url.startsWith(`${API_URL}/customers`))
        return routes.customers ?? (() => jsonResponse([]))
      throw new Error(`Petición inesperada: ${url}`)
    })()
    return handler(init)
  })
  return fetchMock
}

export function callsTo(fetchMock: ReturnType<typeof stubFetch>, url: string) {
  return fetchMock.mock.calls.filter(([called]) => called === url)
}

export function bodyOf(call: [string, RequestInit?] | undefined): unknown {
  return JSON.parse(String(call?.[1]?.body))
}

export function failNetwork(): Promise<Response> {
  return Promise.reject(new TypeError('Failed to fetch'))
}
