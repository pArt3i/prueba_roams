import type { CountryCode } from './customer'

/** Divisas que puede ver el comercial. Lo guardado en el backend es siempre EUR. */
export type Currency = 'EUR' | 'USD' | 'GBP'

/** Importes como los manda la API: texto con dos decimales (`"470.00"`), nunca números. */
export interface Amounts {
  subtotal: string
  vat: string
  total: string
}

/** Cuerpo de `POST /simulations/preview` (spec 002): solo usuarios y país. */
export interface PreviewRequest {
  users: number
  country: CountryCode
}

/** Respuesta de `POST /simulations/preview`. */
export interface PricePreview extends Amounts {
  users: number
  country: CountryCode
  currency: 'EUR'
  vat_rate: string
}

/** Cuerpo de `POST /simulations`: sin plan, país ni importes. */
export interface SimulationDraft {
  customer_id: number
  users: number
  storage_gb: number
  api_calls: number
}

/** Simulación guardada (respuesta 201 y elementos del historial). */
export interface Simulation extends Amounts {
  id: number
  customer_id: number
  users: number
  storage_gb: number
  api_calls: number
  country: CountryCode
  currency: 'EUR'
  vat_rate: string
  /** ISO 8601 en UTC con `Z`. */
  created_at: string
}

/** Tipos de cambio como texto decimal (`String(n)`), unidades de cada divisa por 1 EUR. */
export interface ExchangeRates {
  USD: string
  GBP: string
}
