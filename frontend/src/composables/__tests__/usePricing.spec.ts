import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { PRICING_DELAY_MS, SLIDER_MAX, USERS_ERROR, usePricing } from '../usePricing'
import { PREVIEW_URL, bodyOf, callsTo, makePreview } from '@/__tests__/detailHelpers'
import { deferred, jsonResponse, stubFetch } from '@/__tests__/helpers'

describe('usePricing', () => {
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

  describe('arranque (CA2)', () => {
    it('start pide con users 1 y el país del cliente, y nada más', async () => {
      const pricing = usePricing('ES')
      await pricing.start()
      expect(previewBodies()).toEqual([{ users: 1, country: 'ES' }])
      expect(pricing.preview.value).toEqual(makePreview())
      expect(pricing.canSave.value).toBe(true)
    })
  })

  describe('usuarios inválidos (CA5, CA6)', () => {
    it.each(['0', '10001', '', '1.5', '-3', 'abc'])(
      '«%s»: sin llamada y con mensaje',
      async (text) => {
        const pricing = usePricing('ES')
        pricing.setUsers(text)
        await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS * 2)
        expect(fetchMock).not.toHaveBeenCalled()
        expect(pricing.usersError.value).toBe(USERS_ERROR)
        expect(pricing.canSave.value).toBe(false)
      },
    )

    it('10000 es válido', async () => {
      const pricing = usePricing('ES')
      pricing.setUsers('10000')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(pricing.usersError.value).toBe('')
      expect(previewBodies()).toEqual([{ users: 10000, country: 'ES' }])
    })

    it('CA6: oculta importe, carga y fallo, y al volver a ser válido calcula de nuevo', async () => {
      const pricing = usePricing('ES')
      await pricing.start()
      expect(pricing.preview.value).not.toBeNull()

      pricing.setUsers('')
      expect(pricing.preview.value).toBeNull()
      expect(pricing.calculating.value).toBe(false)
      expect(pricing.waiting.value).toBe(false)
      expect(pricing.failure.value).toBeNull()

      pricing.setUsers('60')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(pricing.preview.value).not.toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('CA6: una respuesta en curso que llega tras un valor inválido no reaparece', async () => {
      const slow = deferred<Response>()
      fetchMock.mockReturnValueOnce(slow.promise)
      const pricing = usePricing('ES')
      void pricing.start()
      expect(pricing.calculating.value).toBe(true)

      pricing.setUsers('0')
      slow.resolve(jsonResponse(makePreview()))
      await flushPromises()
      expect(pricing.preview.value).toBeNull()
      expect(pricing.calculating.value).toBe(false)
    })

    it('un valor inválido cancela la espera pendiente', async () => {
      const pricing = usePricing('ES')
      pricing.setUsers('60')
      pricing.setUsers('10001')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS * 2)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('tras un fallo, un valor inválido oculta el mensaje y el botón', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const pricing = usePricing('ES')
      await pricing.start()
      expect(pricing.failure.value?.retryable).toBe(true)
      pricing.setUsers('0')
      expect(pricing.failure.value).toBeNull()
    })
  })

  describe('espera de 300 ms (CA7)', () => {
    it('varios cambios en menos de 300 ms hacen una sola llamada con el último valor', async () => {
      const pricing = usePricing('DE')
      pricing.setUsers('10')
      await vi.advanceTimersByTimeAsync(200)
      pricing.setUsers('50')
      await vi.advanceTimersByTimeAsync(200)
      pricing.setUsers('100')
      expect(fetchMock).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(previewBodies()).toEqual([{ users: 100, country: 'DE' }])
    })

    it('escribir 10001 y corregir a 100 antes de 300 ms: una sola llamada con 100', async () => {
      const pricing = usePricing('ES')
      pricing.setUsers('10001')
      pricing.setUsers('100')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      expect(previewBodies()).toEqual([{ users: 100, country: 'ES' }])
    })
  })

  describe('slider y campo sincronizados (R4)', () => {
    it('el slider sigue al campo y se queda en 200 por encima de 200', () => {
      const pricing = usePricing('ES')
      pricing.setUsers('80')
      expect(pricing.sliderValue.value).toBe(80)
      pricing.setUsers('500')
      expect(pricing.sliderValue.value).toBe(SLIDER_MAX)
      expect(pricing.usersInput.value).toBe('500')
      pricing.setUsers('10000')
      expect(pricing.sliderValue.value).toBe(SLIDER_MAX)
    })

    it('con el campo inválido, el slider conserva su última posición', () => {
      const pricing = usePricing('ES')
      pricing.setUsers('80')
      pricing.setUsers('')
      expect(pricing.sliderValue.value).toBe(80)
    })
  })

  describe('respuestas antiguas (CA8)', () => {
    it('si la de 100 responde después que la de 60, se queda la de 60', async () => {
      const first = deferred<Response>()
      const second = deferred<Response>()
      fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const pricing = usePricing('ES')
      pricing.setUsers('100')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      pricing.setUsers('60')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)

      second.resolve(jsonResponse(makePreview({ users: 60 })))
      await flushPromises()
      first.resolve(jsonResponse(makePreview({ users: 100, subtotal: '670.00' })))
      await flushPromises()
      expect(pricing.preview.value?.users).toBe(60)
      expect(pricing.preview.value?.subtotal).toBe('470.00')
    })

    it('una petición en curso se cancela con AbortController al lanzar otra', async () => {
      fetchMock.mockReturnValue(deferred<Response>().promise)
      const pricing = usePricing('ES')
      void pricing.start()
      pricing.setUsers('5')
      await vi.advanceTimersByTimeAsync(PRICING_DELAY_MS)
      const firstSignal = fetchMock.mock.calls[0]![1]!.signal as AbortSignal
      expect(firstSignal.aborted).toBe(true)
    })
  })
})
