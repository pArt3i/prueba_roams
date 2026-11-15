import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '../App.vue'
import { API_URL } from '@/services/customersService'
import { jsonResponse, makeCustomer, requestedUrls, stubFetch } from './helpers'

const customers = [
  makeCustomer({ id: 1, name: 'Acme S.L.' }),
  makeCustomer({ id: 2, name: 'Beta S.A.' }),
]

describe('App', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    fetchMock = stubFetch()
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(customers)))
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
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Volver a clientes')!
      .trigger('click')
    await flushPromises()

    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('')
    expect(requestedUrls(fetchMock)).toEqual([`${API_URL}/customers`, `${API_URL}/customers`])
    expect(wrapper.findAll('article')).toHaveLength(2)
  })
})
