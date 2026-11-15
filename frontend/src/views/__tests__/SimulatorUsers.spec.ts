import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREVIEW_URL, bodyOf, callsTo, makePreview, routeFetch } from '@/__tests__/detailHelpers'
import {
  amountsText,
  mountDetail,
  saveButton,
  settle,
  slider,
  usersField,
} from '@/__tests__/mountDetail'
import { deferred, jsonResponse } from '@/__tests__/helpers'
import { resetExchangeRates } from '@/composables/useExchangeRates'

const USERS_ERROR = 'El número de usuarios debe ser un entero entre 1 y 10000.'

describe('simulador: usuarios, espera y respuestas antiguas', () => {
  let fetchMock: ReturnType<typeof routeFetch>

  beforeEach(() => {
    vi.useFakeTimers()
    resetExchangeRates()
    fetchMock = routeFetch()
  })

  afterEach(() => {
    resetExchangeRates()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const previewBodies = () => callsTo(fetchMock, PREVIEW_URL).map((call) => bodyOf(call))

  describe.each(['0', '10001', '', '1.5'])('CA5 y CA6: usuarios «%s»', (text) => {
    it('sin llamada, con mensaje, sin importes ni carga y sin poder guardar', async () => {
      const wrapper = await mountDetail()
      expect(amountsText(wrapper).total).toBe('568,70 €')
      const calls = fetchMock.mock.calls.length

      await usersField(wrapper).setValue(text)
      await settle(600)
      expect(fetchMock.mock.calls.length).toBe(calls)
      expect(wrapper.text()).toContain(USERS_ERROR)
      expect(wrapper.text().split(USERS_ERROR)).toHaveLength(2) // una sola vez
      expect(amountsText(wrapper)).toEqual({ subtotal: null, vat: null, total: null })
      expect(wrapper.text()).not.toContain('Calculando')
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })
  })

  it('CA6: la respuesta en curso no reaparece y, al volver a ser válido, se calcula de nuevo', async () => {
    const wrapper = await mountDetail()
    const slow = deferred<Response>()
    fetchMock = routeFetch({ preview: () => slow.promise })
    await usersField(wrapper).setValue('30')
    await settle(300)
    expect(wrapper.text()).toContain('Calculando')

    await usersField(wrapper).setValue('0')
    slow.resolve(jsonResponse(makePreview({ users: 30 })))
    await settle()
    expect(amountsText(wrapper).total).toBeNull()
    expect(wrapper.text()).not.toContain('Calculando')

    fetchMock = routeFetch({ preview: () => jsonResponse(makePreview()) })
    await usersField(wrapper).setValue('60')
    await settle(300)
    expect(amountsText(wrapper).total).toBe('568,70 €')
  })

  it('CA7: varios cambios seguidos del slider y del campo hacen una sola llamada', async () => {
    const wrapper = await mountDetail()
    await slider(wrapper).setValue('10')
    await settle(100)
    await usersField(wrapper).setValue('40')
    await settle(100)
    await slider(wrapper).setValue('90')
    expect(previewBodies()).toHaveLength(1)
    await settle(300)
    expect(previewBodies()).toEqual([
      { users: 1, country: 'ES' },
      { users: 90, country: 'ES' },
    ])
  })

  it('CA8: si la respuesta de 100 llega después que la de 60, se ve la de 60', async () => {
    const wrapper = await mountDetail()
    const first = deferred<Response>()
    const second = deferred<Response>()
    const queue = [first, second]
    fetchMock = routeFetch({ preview: () => queue.shift()!.promise })
    await usersField(wrapper).setValue('100')
    await settle(300)
    await usersField(wrapper).setValue('60')
    await settle(300)
    second.resolve(jsonResponse(makePreview()))
    await settle()
    first.resolve(
      jsonResponse(makePreview({ users: 100, subtotal: '670.00', vat: '140.70', total: '810.70' })),
    )
    await settle()
    expect(amountsText(wrapper).total).toBe('568,70 €')
  })
})
