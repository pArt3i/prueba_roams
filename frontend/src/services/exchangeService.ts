import type { ExchangeRates } from '@/types/simulation'

export const EXCHANGE_URL = 'https://open.er-api.com/v6/latest/EUR'

/**
 * Texto decimal de un tipo (R15): `String(n)` del número que entrega `JSON.parse`.
 * Ausente, no numérico, menor o igual que 0 o con «e» en el texto: `null`.
 */
function readRate(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const text = String(value)
  return /e/i.test(text) ? null : text
}

/**
 * Validación estricta de la respuesta (R13): `result` `"success"` y los dos tipos
 * válidos. Con que uno falle, toda la respuesta es un fallo.
 */
export function parseExchangeRates(body: unknown): ExchangeRates | null {
  if (typeof body !== 'object' || body === null) return null
  const { result, rates } = body as { result?: unknown; rates?: unknown }
  if (result !== 'success' || typeof rates !== 'object' || rates === null) return null
  const usd = readRate((rates as Record<string, unknown>).USD)
  const gbp = readRate((rates as Record<string, unknown>).GBP)
  return usd !== null && gbp !== null ? { USD: usd, GBP: gbp } : null
}

/** Una sola petición devuelve USD y GBP. Lanza si falla o la respuesta no es válida. */
export async function fetchExchangeRates(signal?: AbortSignal): Promise<ExchangeRates> {
  const response = await fetch(EXCHANGE_URL, { signal })
  if (!response.ok) throw new Error(`Tipo de cambio: respuesta ${response.status}`)
  const rates = parseExchangeRates(await response.json())
  if (rates === null) throw new Error('Tipo de cambio: respuesta no válida')
  return rates
}
