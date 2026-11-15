/** Fecha y hora `es-ES` sin segundos (p. ej. «15/11/2026, 10:00») en la zona horaria del navegador. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso // dato fuera de contrato: se ve tal cual, sin romper la pantalla
  // Se crea en cada llamada para respetar la zona horaria vigente.
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value)
}

/** Entero dentro de un rango a partir del texto de un campo; `null` si no lo es. */
export function parseIntegerInRange(text: string, min: number, max: number): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return value >= min && value <= max ? value : null
}
