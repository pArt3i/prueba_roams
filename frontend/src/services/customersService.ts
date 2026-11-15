import type { Customer, CustomerDraft } from '@/types/customer'
import { toApiError } from './apiError'

export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/+$/,
  '',
)

/** `GET /customers`, con `?q=` solo si hay texto. El filtrado lo hace el backend. */
export async function listCustomers(term: string, signal?: AbortSignal): Promise<Customer[]> {
  const query = term === '' ? '' : `?q=${encodeURIComponent(term)}`
  const response = await fetch(`${API_URL}/customers${query}`, { signal })
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as Customer[]
}

/** `POST /customers`. Solo el 201 cuenta como éxito. */
export async function createCustomer(draft: CustomerDraft): Promise<Customer> {
  const response = await fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  if (response.status !== 201) throw await toApiError(response)
  return (await response.json()) as Customer
}
