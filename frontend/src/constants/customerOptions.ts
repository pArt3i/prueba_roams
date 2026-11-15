import type { CountryCode, Plan } from '@/types/customer'

// Listas de presentación (spec 003, R16). Sin tipos de IVA: eso es del backend.
export const COUNTRY_OPTIONS: ReadonlyArray<{ value: CountryCode; label: string }> = [
  { value: 'ES', label: 'España' },
  { value: 'PT', label: 'Portugal' },
  { value: 'FR', label: 'Francia' },
  { value: 'DE', label: 'Alemania' },
  { value: 'IT', label: 'Italia' },
]

// Textos del ADR 005.
export const PLAN_OPTIONS: ReadonlyArray<{ value: Plan; label: string }> = [
  { value: 'starter', label: 'Starter' },
  { value: 'business', label: 'Business' },
  { value: 'enterprise', label: 'Enterprise' },
]

export function countryLabel(code: CountryCode): string {
  return COUNTRY_OPTIONS.find((option) => option.value === code)?.label ?? code
}

export function planLabel(plan: Plan): string {
  return PLAN_OPTIONS.find((option) => option.value === plan)?.label ?? plan
}
