import type { Amounts, Currency } from '@/types/simulation'

// Única aritmética de dinero del frontend (spec 004, R14, R15): convierte un
// precio ya calculado por el backend. Todo con enteros (BigInt), sin coma flotante.

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/
const RATE_PATTERN = /^(\d+)(?:\.(\d+))?$/

function toCents(amount: string): bigint {
  const match = AMOUNT_PATTERN.exec(amount)
  if (!match) throw new RangeError(`Importe no válido: ${amount}`)
  return BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'))
}

function fromCents(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`
}

/**
 * Importe en EUR (texto, p. ej. `"470.00"`) por un tipo (texto decimal, p. ej. `"1.0829"`),
 * a 2 decimales con ROUND_HALF_UP. Devuelve texto con dos decimales.
 */
export function convertAmount(amount: string, rate: string): string {
  const cents = toCents(amount)
  const match = RATE_PATTERN.exec(rate)
  if (!match) throw new RangeError(`Tipo de cambio no válido: ${rate}`)
  const decimals = match[2] ?? ''
  const numerator = cents * BigInt(match[1]! + decimals)
  const divisor = 10n ** BigInt(decimals.length)
  // floor(n / d + 1/2): redondeo hacia arriba en la mitad, sin pasar por float.
  return fromCents((numerator * 2n + divisor) / (divisor * 2n))
}

/** Suma de dos importes en texto, en céntimos enteros. */
export function addAmounts(a: string, b: string): string {
  return fromCents(toCents(a) + toCents(b))
}

/**
 * Desglose en otra divisa (R14): subtotal e IVA se convierten por separado y el
 * total es su suma, de modo que el desglose siempre cuadra.
 */
export function convertBreakdown(
  amounts: Pick<Amounts, 'subtotal' | 'vat'>,
  rate: string,
): Amounts {
  const subtotal = convertAmount(amounts.subtotal, rate)
  const vat = convertAmount(amounts.vat, rate)
  return { subtotal, vat, total: addAmounts(subtotal, vat) }
}

/** Formato `es-ES` de un importe en texto; `Intl.NumberFormat` lee el decimal sin pasar por float. */
export function formatMoney(amount: string, currency: Currency): string {
  const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency })
  // Intl.NumberFormat v3 acepta el decimal en texto; el tipo de la librería aún no lo recoge.
  return formatter.format(amount as unknown as number)
}
