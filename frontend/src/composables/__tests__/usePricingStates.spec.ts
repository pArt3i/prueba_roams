import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { PRICING_DELAY_MS, PRICING_FAILED_MESSAGE, usePricing } from '../usePricing'
import { PREVIEW_URL, bodyOf, callsTo, makePreview } from '@/__tests__/detailHelpers'
import { deferred, jsonResponse, stubFetch } from '@/__tests__/helpers'

describe('usePricing: estados, errores y reintento', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = stubFetch()
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(makePreview())))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function previewBodies() {
    return callsTo(fetchMock, PREVIEW_URL).map((call) => bodyOf(call))
  }

  describe('carga y guardado (CA9, CA10)', () => {
    it('CA9: mientras calcula, calculating es true y el último importe sigue', async () => {
      const pricing = usePricing('ES')
      await pricing.start()
      const slow = deferred<Response>()
      fetchMock.mockReturnValueOnce(slow.promise)
      pricing.setUsers('60')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(pricing.calculating.value).toBe(true)
      expect(pricing.preview.value).not.toBeNull()
    })

    it('CA10: durante la espera y el cálculo no se puede guardar; sí con la respuesta', async () => {
      const slow = deferred<Response>()
      const pricing = usePricing('ES')
      await pricing.start()
      expect(pricing.canSave.value).toBe(true)

      fetchMock.mockReturnValueOnce(slow.promise)
      pricing.setUsers('60')
      expect(pricing.waiting.value).toBe(true)
      expect(pricing.canSave.value).toBe(false)
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(pricing.canSave.value).toBe(false)
      slow.resolve(jsonResponse(makePreview()))
      await flushPromises()
      expect(pricing.canSave.value).toBe(true)
    })
  })

  describe('errores y reintento (CA14 a CA17)', () => {
    it('CA14: un fallo de red da el mensaje, con «Reintentar», y el siguiente cambio calcula', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const pricing = usePricing('ES')
      await pricing.start()
      expect(pricing.failure.value).toEqual({ message: PRICING_FAILED_MESSAGE, retryable: true })
      expect(pricing.canSave.value).toBe(false)

      pricing.setUsers('20')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(pricing.failure.value).toBeNull()
      expect(pricing.canSave.value).toBe(true)
    })

    it('CA15: un 5xx también lleva «Reintentar»; no hay reintentos automáticos', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'Error interno.' }, 500))
      const pricing = usePricing('ES')
      await pricing.start()
      await vi.advanceTimersByTimeAsync(10_000)
      expect(pricing.failure.value).toEqual({ message: PRICING_FAILED_MESSAGE, retryable: true })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('CA15: «Reintentar» repite con el valor actual y, si responde bien, limpia el fallo', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const pricing = usePricing('FR')
      await pricing.start()
      await pricing.retry()
      expect(previewBodies()).toEqual([
        { users: 1, country: 'FR' },
        { users: 1, country: 'FR' },
      ])
      expect(pricing.failure.value).toBeNull()
      expect(pricing.canSave.value).toBe(true)
    })

    it('CA15: si el reintento vuelve a fallar por red, el fallo y el botón siguen', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
      const pricing = usePricing('ES')
      await pricing.start()
      await pricing.retry()
      expect(pricing.failure.value?.retryable).toBe(true)
      await vi.advanceTimersByTimeAsync(10_000)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('CA16: «Reintentar» con una espera pendiente la cancela y hace una sola llamada', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const pricing = usePricing('ES')
      await pricing.start()
      pricing.setUsers('75')
      await vi.advanceTimersByTimeAsync(100)
      void pricing.retry()
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS * 3)
      expect(previewBodies()).toEqual([
        { users: 1, country: 'ES' },
        { users: 75, country: 'ES' },
      ])
    })

    it('CA17: un 422 con detail muestra su mensaje, sin «Reintentar»', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'País no admitido.' }, 422))
      const pricing = usePricing('ES')
      await pricing.start()
      expect(pricing.failure.value).toEqual({ message: 'País no admitido.', retryable: false })
      expect(pricing.canSave.value).toBe(false)

      pricing.setUsers('2')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(pricing.failure.value).toBeNull()
      expect(pricing.canSave.value).toBe(true)
    })

    it('CA17: un «Reintentar» que devuelve 422 muestra el mensaje de la API sin botón', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const pricing = usePricing('ES')
      await pricing.start()
      expect(pricing.failure.value?.retryable).toBe(true)
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'País no admitido.' }, 422))
      await pricing.retry()
      expect(pricing.failure.value).toEqual({ message: 'País no admitido.', retryable: false })
    })

    it('CA17: un 422 sin detail de texto se trata como fallo de red, con «Reintentar»', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: [{ msg: 'x' }] }, 422))
      const pricing = usePricing('ES')
      await pricing.start()
      expect(pricing.failure.value).toEqual({ message: PRICING_FAILED_MESSAGE, retryable: true })
    })
  })
})
