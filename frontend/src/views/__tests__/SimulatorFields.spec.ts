import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREVIEW_URL, callsTo, failNetwork, routeFetch } from '@/__tests__/detailHelpers'
import { fieldByLabel, mountDetail, saveButton, settle, usersField } from '@/__tests__/mountDetail'
import { buttonByText } from '@/__tests__/mountDetail'
import { jsonResponse } from '@/__tests__/helpers'
import { resetExchangeRates } from '@/composables/useExchangeRates'
import { PRICING_FAILED_MESSAGE } from '@/composables/usePricing'

const STORAGE_ERROR = 'El almacenamiento debe ser un entero entre 0 y 1000000.'
const CALLS_ERROR = 'Las llamadas a la API deben ser un entero entre 0 y 1000000000.'

describe('simulador: campos informativos y fallos del cálculo', () => {
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

  const previewCalls = () => callsTo(fetchMock, PREVIEW_URL).length

  describe('CA12: almacenamiento y llamadas a la API', () => {
    const cases: Array<[string, string, string, string]> = [
      ['Almacenamiento (GB)', '-1', STORAGE_ERROR, 'almacenamiento -1'],
      ['Almacenamiento (GB)', '1.5', STORAGE_ERROR, 'almacenamiento 1.5'],
      ['Almacenamiento (GB)', '', STORAGE_ERROR, 'almacenamiento vacío'],
      ['Almacenamiento (GB)', '1000001', STORAGE_ERROR, 'almacenamiento 1000001'],
      ['Llamadas a la API', '-1', CALLS_ERROR, 'llamadas -1'],
      ['Llamadas a la API', '1.5', CALLS_ERROR, 'llamadas 1.5'],
      ['Llamadas a la API', '', CALLS_ERROR, 'llamadas vacías'],
      ['Llamadas a la API', '1000000001', CALLS_ERROR, 'llamadas 1000000001'],
    ]

    it.each(cases)(
      '%s «%s»: error de campo y sin poder guardar (%#)',
      async (label, value, message) => {
        const wrapper = await mountDetail()
        await fieldByLabel(wrapper, label).setValue(value)
        expect(wrapper.text()).toContain(message)
        expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
      },
    )

    it.each([
      ['Almacenamiento (GB)', '0'],
      ['Almacenamiento (GB)', '1000000'],
      ['Llamadas a la API', '0'],
      ['Llamadas a la API', '1000000000'],
    ])('%s «%s» es válido', async (label, value) => {
      const wrapper = await mountDetail()
      await fieldByLabel(wrapper, label).setValue(value)
      expect(wrapper.text()).not.toContain(STORAGE_ERROR)
      expect(wrapper.text()).not.toContain(CALLS_ERROR)
      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('empiezan en 0', async () => {
      const wrapper = await mountDetail()
      expect((fieldByLabel(wrapper, 'Almacenamiento (GB)').element as HTMLInputElement).value).toBe(
        '0',
      )
      expect((fieldByLabel(wrapper, 'Llamadas a la API').element as HTMLInputElement).value).toBe(
        '0',
      )
    })
  })

  describe('CA14: fallo de red o 5xx', () => {
    it.each([
      ['red', () => failNetwork()],
      ['5xx', () => jsonResponse({ detail: 'Error interno.' }, 500)],
    ])(
      '%s: mensaje, «Reintentar», sin guardar y el siguiente cambio calcula',
      async (_name, handler) => {
        fetchMock = routeFetch({ preview: handler })
        const wrapper = await mountDetail()
        expect(wrapper.text()).toContain(PRICING_FAILED_MESSAGE)
        expect(buttonByText(wrapper, 'Reintentar')).toBeDefined()
        expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

        fetchMock = routeFetch()
        await usersField(wrapper).setValue('20')
        await settle(300)
        expect(wrapper.text()).not.toContain(PRICING_FAILED_MESSAGE)
        expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
      },
    )
  })

  describe('CA15: «Reintentar»', () => {
    it('repite con el valor actual; si responde bien, desaparecen mensaje y botón', async () => {
      fetchMock = routeFetch({ preview: () => failNetwork() })
      const wrapper = await mountDetail()
      fetchMock = routeFetch()
      await buttonByText(wrapper, 'Reintentar')!.trigger('click')
      await settle()
      expect(previewCalls()).toBe(1)
      expect(wrapper.text()).not.toContain(PRICING_FAILED_MESSAGE)
      expect(buttonByText(wrapper, 'Reintentar')).toBeUndefined()
      expect(wrapper.text()).toContain('568,70')
      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('si vuelve a fallar, mensaje y botón siguen, sin reintentos automáticos', async () => {
      fetchMock = routeFetch({ preview: () => failNetwork() })
      const wrapper = await mountDetail()
      await buttonByText(wrapper, 'Reintentar')!.trigger('click')
      await settle(10_000)
      expect(wrapper.text()).toContain(PRICING_FAILED_MESSAGE)
      expect(buttonByText(wrapper, 'Reintentar')).toBeDefined()
      expect(previewCalls()).toBe(2)
    })

    it('con usuarios inválidos se ocultan el mensaje de fallo y el botón', async () => {
      fetchMock = routeFetch({ preview: () => failNetwork() })
      const wrapper = await mountDetail()
      await usersField(wrapper).setValue('0')
      expect(wrapper.text()).not.toContain(PRICING_FAILED_MESSAGE)
      expect(buttonByText(wrapper, 'Reintentar')).toBeUndefined()
    })
  })

  it('CA16: «Reintentar» con una espera pendiente cancela la espera y hace una sola llamada', async () => {
    fetchMock = routeFetch({ preview: () => failNetwork() })
    const wrapper = await mountDetail()
    fetchMock = routeFetch()
    await usersField(wrapper).setValue('33')
    await settle(100)
    await buttonByText(wrapper, 'Reintentar')!.trigger('click')
    await settle(1000)
    expect(callsTo(fetchMock, PREVIEW_URL)).toHaveLength(1)
    expect(JSON.parse(String(callsTo(fetchMock, PREVIEW_URL)[0]![1]!.body))).toEqual({
      users: 33,
      country: 'ES',
    })
  })

  describe('CA17: 422 de preview', () => {
    it('con detail: se ve el mensaje, sin «Reintentar» y sin poder guardar', async () => {
      fetchMock = routeFetch({
        preview: () => jsonResponse({ detail: 'País no admitido.' }, 422),
      })
      const wrapper = await mountDetail()
      expect(wrapper.text()).toContain('País no admitido.')
      expect(buttonByText(wrapper, 'Reintentar')).toBeUndefined()
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

      fetchMock = routeFetch()
      await usersField(wrapper).setValue('2')
      await settle(300)
      expect(wrapper.text()).not.toContain('País no admitido.')
      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('un «Reintentar» que devuelve 422 muestra el mensaje y quita el botón', async () => {
      fetchMock = routeFetch({ preview: () => failNetwork() })
      const wrapper = await mountDetail()
      fetchMock = routeFetch({ preview: () => jsonResponse({ detail: 'País no admitido.' }, 422) })
      await buttonByText(wrapper, 'Reintentar')!.trigger('click')
      await settle()
      expect(wrapper.text()).toContain('País no admitido.')
      expect(buttonByText(wrapper, 'Reintentar')).toBeUndefined()
    })

    it('sin detail de texto: como fallo de red, con «Reintentar»', async () => {
      fetchMock = routeFetch({ preview: () => jsonResponse({ detail: [{ msg: 'x' }] }, 422) })
      const wrapper = await mountDetail()
      expect(wrapper.text()).toContain(PRICING_FAILED_MESSAGE)
      expect(buttonByText(wrapper, 'Reintentar')).toBeDefined()
    })
  })
})
