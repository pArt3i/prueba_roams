export type CountryCode = 'ES' | 'PT' | 'FR' | 'DE' | 'IT'

export type Plan = 'starter' | 'business' | 'enterprise'

/** Cliente tal como lo devuelve la API (spec 001). */
export interface Customer {
  id: number
  name: string
  tax_id: string
  email: string
  country: CountryCode
  plan: Plan
}

/**
 * Cuerpo de `POST /customers`. País y plan pueden ir vacíos: si el comercial no
 * elige, se envía vacío y el 422 del backend se muestra tal cual.
 */
export interface CustomerDraft {
  name: string
  email: string
  country: CountryCode | ''
  plan: Plan | ''
  tax_id: string
}
