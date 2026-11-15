import { vi } from 'vitest'
import type { Customer } from '@/types/customer'

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    name: 'Acme S.L.',
    tax_id: '12345678Z',
    email: 'ventas@acme.com',
    country: 'ES',
    plan: 'starter',
    ...overrides,
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Promesa que se resuelve a mano, para controlar el orden de las respuestas. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Sustituye `fetch` por un mock (sin red real) y lo devuelve. */
export function stubFetch() {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function requestedUrls(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls.map(([url]) => url)
}

export function lastUrl(fetchMock: ReturnType<typeof stubFetch>): string | undefined {
  const urls = requestedUrls(fetchMock)
  return urls[urls.length - 1]
}
