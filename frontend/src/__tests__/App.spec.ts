import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '../App.vue'
import { API_URL } from '@/services/customersService'
import { EXCHANGE_URL, callsTo, routeFetch } from './detailHelpers'
import { resetExchangeRates } from '@/composables/useExchangeRates'
import { jsonResponse, makeCustomer } from './helpers'

const customers = [
  makeCustomer({ id: 1, name: 'Acme S.L.' }),
  makeCustomer({ id: 2, name: 'Beta S.A.' }),
]

describe('App', () => {
  let fetchMock: ReturnType<typeof routeFetch>

  beforeEach(() => {
    fetchMock = routeFetch({ customers: () => jsonResponse(customers) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CA13: al pulsar una tarjeta se ve el detalle de ese cliente y deja de verse la lista', async () => {
    const wrapper = mount(App)
    await flushPromises()
    await wrapper.findAll('article')[1]!.trigger('click')

    expect(wrapper.text()).toContain('Beta S.A.')
    expect(wrapper.find('article').exists()).toBe(false)
    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
  })

  it('CA13: con foco, Enter y Espacio también abren el detalle', async () => {
    for (const key of ['keydown.enter', 'keydown.space']) {
      const wrapper = mount(App)
      await flushPromises()
      await wrapper.findAll('article')[0]!.trigger(key)
      expect(wrapper.find('article').exists()).toBe(false)
      expect(wrapper.find('h1').text()).toBe('Acme S.L.')
    }
  })

  it('CA14: al volver se ve el dashboard con el buscador vacío y se pide la lista sin q', async () => {
    const wrapper = mount(App)
    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('acme')
    await wrapper.findAll('article')[0]!.trigger('click')
    expect(callsTo(fetchMock, `${API_URL}/customers`)).toHaveLength(1)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Volver a clientes')!
      .trigger('click')
    await flushPromises()

    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('')
    expect(callsTo(fetchMock, `${API_URL}/customers`)).toHaveLength(2)
    expect(wrapper.findAll('article')).toHaveLength(2)
  })

  it('CA26: el tipo de cambio se conserva al volver a la lista y abrir otro cliente', async () => {
    resetExchangeRates()
    const wrapper = mount(App)
    await flushPromises()
    await wrapper.findAll('article')[0]!.trigger('click')
    await wrapper.get('select').setValue('USD')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Volver a clientes')!
      .trigger('click')
    await flushPromises()

    await wrapper.findAll('article')[1]!.trigger('click')
    await flushPromises()
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('EUR')
    await wrapper.get('select').setValue('GBP')
    await flushPromises()
    expect(callsTo(fetchMock, EXCHANGE_URL)).toHaveLength(1)
    resetExchangeRates()
  })
})
