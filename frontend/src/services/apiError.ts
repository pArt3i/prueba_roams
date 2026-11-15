/** Respuesta HTTP distinta de la esperada. `detail` solo se rellena si la API lo manda como texto. */
export class ApiError extends Error {
  status: number
  detail: string | null

  constructor(status: number, detail: string | null) {
    super(detail ?? `Respuesta inesperada (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  let detail: string | null = null
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const value = (body as { detail: unknown }).detail
      if (typeof value === 'string' && value.trim() !== '') detail = value
    }
  } catch {
    // Cuerpo vacío o que no es JSON: se queda sin detail.
  }
  return new ApiError(response.status, detail)
}
