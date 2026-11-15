import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { EXCHANGE_TIMEOUT_MS, resetExchangeRates, useExchangeRates } from '../useExchangeRates'
import { EXCHANGE_URL, ratesBody } from '@/__tests__/detailHelpers'
import { deferred, jsonResponse, stubFetch } from '@/__tests__/helpers'

describe('useExchangeRates', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    vi.useFakeTimers()
    resetExchangeRates()
    fetchMock = stubFetch()
  })

  afterEach(() => {
    resetExchangeRates()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('no pide nada hasta que se pide (CA24)', () => {
    const { status, rates } = useExchangeRates()
    expect(status.value).toBe('idle')
    expect(rates.value).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('CA25: una sola petición sirve para USD y GBP, también con varias llamadas', async () => {
    fetchMock.mockResolvedValue(jsonResponse(ratesBody(1.0829, 0.85)))
    const { ensureRates, rates, status } = useExchangeRates()
    await ensureRates()
    await ensureRates()
    await ensureRates()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![0]).toBe(EXCHANGE_URL)
    expect(status.value).toBe('ready')
    expect(rates.value).toEqual({ USD: '1.0829', GBP: '0.85' })
  })

  it('CA25: dos llamadas seguidas con la petición en curso hacen una sola', () => {
    fetchMock.mockReturnValue(deferred<Response>().promise)
    const { ensureRates } = useExchangeRates()
    void ensureRates()
    void ensureRates()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('CA26: el tipo se conserva en memoria entre usos (la vista se monta de nuevo)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(ratesBody(1.0829, 0.85)))
    await useExchangeRates().ensureRates()
    const second = useExchangeRates()
    await second.ensureRates()
    expect(second.rates.value).toEqual({ USD: '1.0829', GBP: '0.85' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  describe('espera de 5 s (CA30)', () => {
    it('a los 4999 ms sigue cargando y a los 5000 ms es un fallo', async () => {
      fetchMock.mockReturnValue(deferred<Response>().promise)
      const { ensureRates, status } = useExchangeRates()
      void ensureRates()
      await vi.advanceTimersByTimeAsync(EXCHANGE_TIMEOUT_MS - 1)
      expect(status.value).toBe('loading')
      await vi.advanceTimersByTimeAsync(1)
      expect(status.value).toBe('error')
    })

    it('una respuesta posterior a los 5 s se ignora y no se guarda', async () => {
      const pending = deferred<Response>()
      fetchMock.mockReturnValue(pending.promise)
      const { ensureRates, status, rates } = useExchangeRates()
      void ensureRates()
      await vi.advanceTimersByTimeAsync(EXCHANGE_TIMEOUT_MS)
      pending.resolve(jsonResponse(ratesBody(1.0829, 0.85)))
      await flushPromises()
      expect(status.value).toBe('error')
      expect(rates.value).toBeNull()
    })

    it('un fallo de red es un fallo; no hay reintento automático', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
      const { ensureRates, status, rates } = useExchangeRates()
      await ensureRates()
      await vi.advanceTimersByTimeAsync(20_000)
      expect(status.value).toBe('error')
      expect(rates.value).toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('un 500 es un fallo', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 500))
      const { ensureRates, status } = useExchangeRates()
      await ensureRates()
      expect(status.value).toBe('error')
    })
  })

  describe('validación de la respuesta (CA31, CA32, CA35)', () => {
    const invalid: Array<[string, unknown, unknown, unknown]> = [
      ['CA31: USD ausente', undefined, 0.85, 'success'],
      ['CA31: GBP ausente', 1.08, undefined, 'success'],
      ['CA31: USD "abc"', 'abc', 0.85, 'success'],
      ['CA31: GBP null', 1.08, null, 'success'],
      ['CA31: USD 0', 0, 0.85, 'success'],
      ['CA31: GBP -1', 1.08, -1, 'success'],
      ['CA32: result "error" con ambos tipos válidos', 1.08, 0.85, 'error'],
      ['CA32: USD válido y GBP inválido', 1.08, 'x', 'success'],
      ['CA32: USD inválido y GBP válido', 0, 0.85, 'success'],
      ['CA35: USD 1e-7', 1e-7, 0.85, 'success'],
      ['CA35: GBP 0.0000001', 1.08, 0.0000001, 'success'],
      ['CA35: USD 1e21', 1e21, 0.85, 'success'],
    ]

    it.each(invalid)(
      '%s: toda la respuesta es un fallo y no se guarda nada',
      async (_name, usd, gbp, result) => {
        fetchMock.mockResolvedValue(jsonResponse(ratesBody(usd, gbp, result)))
        const { ensureRates, status, rates } = useExchangeRates()
        await ensureRates()
        expect(status.value).toBe('error')
        expect(rates.value).toBeNull()
      },
    )

    it('una respuesta que no es un objeto es un fallo', async () => {
      fetchMock.mockResolvedValue(jsonResponse(null))
      const { ensureRates, status } = useExchangeRates()
      await ensureRates()
      expect(status.value).toBe('error')
    })

    it('CA34: el texto del tipo es String(n): 1.0829 y 1.005', async () => {
      // El JSON se escribe a mano para que los tipos lleguen como números JSON.
      fetchMock.mockResolvedValue(
        new Response('{"result":"success","rates":{"USD":1.0829,"GBP":1.005}}', { status: 200 }),
      )
      const { ensureRates, status, rates } = useExchangeRates()
      await ensureRates()
      expect(status.value).toBe('ready')
      expect(rates.value).toEqual({ USD: '1.0829', GBP: '1.005' })
    })
  })

  describe('reintento (CA33)', () => {
    it('tras un fallo, ensureRates no repite: solo «Reintentar» vuelve a pedir', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const { ensureRates, retry, status, rates } = useExchangeRates()
      await ensureRates()
      await ensureRates()
      expect(fetchMock).toHaveBeenCalledTimes(1)

      fetchMock.mockResolvedValueOnce(jsonResponse(ratesBody(1.0829, 0.85)))
      await retry()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(status.value).toBe('ready')
      expect(rates.value).toEqual({ USD: '1.0829', GBP: '0.85' })
    })

    it('si el reintento falla, el fallo sigue y no hay más peticiones', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
      const { ensureRates, retry, status } = useExchangeRates()
      await ensureRates()
      await retry()
      await vi.advanceTimersByTimeAsync(20_000)
      expect(status.value).toBe('error')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('un fallo no se conserva entre vistas: forgetFailure lo olvida sin pedir nada', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const { ensureRates, forgetFailure, status } = useExchangeRates()
      await ensureRates()
      forgetFailure()
      expect(status.value).toBe('idle')
      fetchMock.mockResolvedValueOnce(jsonResponse(ratesBody(1.0829, 0.85)))
      await ensureRates()
      expect(status.value).toBe('ready')
    })
  })
})
