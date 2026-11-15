import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREVIEW_URL, bodyOf, callsTo, historyUrl, makePreview } from '@/__tests__/detailHelpers'
import { routeFetch } from '@/__tests__/detailHelpers'
import {
  ACME,
  amountsText,
  buttonByText,
  fieldByLabel,
  mountDetail,
  saveButton,
  settle,
  slider,
  usersField,
} from '@/__tests__/mountDetail'
import { deferred, jsonResponse, requestedUrls } from '@/__tests__/helpers'
import { API_URL } from '@/services/customersService'
import { resetExchangeRates } from '@/composables/useExchangeRates'

const USERS_ERROR = 'El número de usuarios debe ser un entero entre 1 y 10000.'

describe('CustomerDetailView', () => {
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

  it('CA1: muestra ficha con los cinco datos, simulador, historial y «Volver a clientes»', async () => {
    const wrapper = await mountDetail()
    const text = wrapper.text()
    for (const value of ['Acme S.L.', 'España', 'ES', '12345678Z', 'ventas@acme.com', 'Business']) {
      expect(text).toContain(value)
    }
    expect(text).toContain('Informativo: no cambia el precio.')
    expect(wrapper.find('h2#simulator-title').exists()).toBe(true)
    expect(wrapper.find('h2#history-title').exists()).toBe(true)
    expect(buttonByText(wrapper, 'Volver a clientes')).toBeDefined()
    expect(requestedUrls(fetchMock)).not.toContain(`${API_URL}/customers/1`)
    expect(requestedUrls(fetchMock).sort()).toEqual([PREVIEW_URL, historyUrl(1)].sort())
  })

  it('CA1: «Volver a clientes» emite back', async () => {
    const wrapper = await mountDetail()
    await buttonByText(wrapper, 'Volver a clientes')!.trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('CA2: sin control de plan ni de país; la llamada inicial lleva users 1 y country ES', async () => {
    const wrapper = await mountDetail()
    const labels = wrapper.findAll('label').map((label) => label.text())
    expect(labels).not.toContain('Plan')
    expect(labels).not.toContain('País')
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('select')).toHaveLength(1) // solo la divisa
    expect(previewBodies()).toEqual([{ users: 1, country: 'ES' }])
  })

  it('CA2: el país del cálculo es el del cliente', async () => {
    fetchMock = routeFetch()
    await mountDetail({ ...ACME, id: 5, country: 'DE' })
    expect(previewBodies()).toEqual([{ users: 1, country: 'DE' }])
  })

  it('CA3: slider 1 a 200 paso 1 en 1, campo en 1, ambos con label y aria-label', async () => {
    const wrapper = await mountDetail()
    const range = slider(wrapper)
    expect(range.attributes()).toMatchObject({ min: '1', max: '200', step: '1' })
    expect((range.element as HTMLInputElement).value).toBe('1')
    expect((usersField(wrapper).element as HTMLInputElement).value).toBe('1')
    for (const input of [range, usersField(wrapper)]) {
      expect(input.attributes('aria-label')).toBeTruthy()
      expect(wrapper.find(`label[for="${input.attributes('id')}"]`).exists()).toBe(true)
    }
  })

  it('CA4: slider y campo están sincronizados; 500 deja el slider en 200 y calcula con 500', async () => {
    const wrapper = await mountDetail()
    await slider(wrapper).setValue('150')
    expect((usersField(wrapper).element as HTMLInputElement).value).toBe('150')

    await usersField(wrapper).setValue('80')
    expect((slider(wrapper).element as HTMLInputElement).value).toBe('80')

    await usersField(wrapper).setValue('500')
    expect((slider(wrapper).element as HTMLInputElement).value).toBe('200')
    expect((usersField(wrapper).element as HTMLInputElement).value).toBe('500')
    await settle(300)
    expect(previewBodies()[previewBodies().length - 1]).toEqual({ users: 500, country: 'ES' })
  })

  it('CA4: 200, 201 y 10000 son válidos; el slider no pasa de 200', async () => {
    const wrapper = await mountDetail()
    for (const [text, slid] of [
      ['200', '200'],
      ['201', '200'],
      ['10000', '200'],
    ]) {
      await usersField(wrapper).setValue(text)
      expect(wrapper.text()).not.toContain(USERS_ERROR)
      expect((slider(wrapper).element as HTMLInputElement).value).toBe(slid)
    }
  })
  it('CA9: durante el cálculo se ve el indicador y el último importe sigue visible', async () => {
    const wrapper = await mountDetail()
    fetchMock = routeFetch({ preview: () => deferred<Response>().promise })
    await usersField(wrapper).setValue('75')
    await settle(300)
    expect(wrapper.text()).toContain('Calculando')
    expect(amountsText(wrapper).total).toBe('568,70 €')
  })

  it('CA10: «Guardar» está desactivado durante la espera de 300 ms y el cálculo', async () => {
    const wrapper = await mountDetail()
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    const slow = deferred<Response>()
    fetchMock = routeFetch({ preview: () => slow.promise })
    await slider(wrapper).setValue('25')
    await settle(299)
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    await settle(1)
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    slow.resolve(jsonResponse(makePreview()))
    await settle()
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('CA11: cambiar almacenamiento o llamadas no llama a preview ni cambia el desglose', async () => {
    const wrapper = await mountDetail()
    const before = amountsText(wrapper)
    await fieldByLabel(wrapper, 'Almacenamiento (GB)').setValue('500')
    await fieldByLabel(wrapper, 'Llamadas a la API').setValue('12345')
    await settle(600)
    expect(previewBodies()).toHaveLength(1)
    expect(amountsText(wrapper)).toEqual(before)
  })

  it('CA13: se ven subtotal 470,00 €, IVA 98,70 € y total 568,70 €', async () => {
    const wrapper = await mountDetail()
    expect(amountsText(wrapper)).toEqual({
      subtotal: '470,00 €',
      vat: '98,70 €',
      total: '568,70 €',
    })
  })
})
