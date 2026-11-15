import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CustomersView from '../CustomersView.vue'
import { API_URL } from '@/services/customersService'
import {
  deferred,
  jsonResponse,
  lastUrl,
  makeCustomer,
  requestedUrls,
  stubFetch,
} from '@/__tests__/helpers'

const three = [
  makeCustomer({ id: 1, name: 'Acme S.L.' }),
  makeCustomer({ id: 2, name: 'Beta S.A.', tax_id: 'PT12345' }),
  makeCustomer({ id: 3, name: 'Gamma GmbH', tax_id: 'DE98765' }),
]

describe('CustomersView', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    fetchMock = stubFetch()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function open(customers = three) {
    fetchMock.mockResolvedValue(jsonResponse(customers))
    const wrapper = mount(CustomersView)
    await flushPromises()
    return wrapper
  }

  it('CA1: muestra una tarjeta por cliente', async () => {
    const wrapper = await open()
    expect(wrapper.findAll('article')).toHaveLength(3)
    expect(requestedUrls(fetchMock)).toEqual([`${API_URL}/customers`])
  })

  it('CA2: mientras la petición está en curso se ve «Cargando clientes…»', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(CustomersView)
    await flushPromises()
    expect(wrapper.text()).toContain('Cargando clientes…')
    expect(wrapper.find('article').exists()).toBe(false)
  })

  it('CA3: con un fallo de red se ve el error con «Reintentar» y al pulsarlo se vuelve a pedir', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const wrapper = mount(CustomersView)
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudieron cargar los clientes. Inténtalo de nuevo.')

    fetchMock.mockResolvedValueOnce(jsonResponse(three))
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Reintentar')!
      .trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('article')).toHaveLength(3)
  })

  it('CA4: lista vacía sin búsqueda: «Aún no hay clientes.» y sin contador', async () => {
    const wrapper = await open([])
    expect(wrapper.text()).toContain('Aún no hay clientes.')
    expect(wrapper.text()).not.toContain('0 clientes')
  })

  it('CA5: búsqueda sin resultados muestra el texto recortado', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce(jsonResponse(three)).mockResolvedValueOnce(jsonResponse([]))
    const wrapper = mount(CustomersView)
    await vi.advanceTimersByTimeAsync(0)
    await wrapper.get('input[type="search"]').setValue('  zzz  ')
    await vi.advanceTimersByTimeAsync(300)
    expect(wrapper.text()).toContain('No hay clientes que coincidan con «zzz».')
  })

  it('CA6, CA7: tras 300 ms pide ?q= con el texto recortado y vacío pide la lista completa', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(three)))
    const wrapper = mount(CustomersView)
    await vi.advanceTimersByTimeAsync(0)
    const input = wrapper.get('input[type="search"]')

    await input.setValue('  acme & co  ')
    await vi.advanceTimersByTimeAsync(299)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(lastUrl(fetchMock)).toBe(`${API_URL}/customers?q=acme%20%26%20co`)

    await input.setValue('    ')
    await vi.advanceTimersByTimeAsync(300)
    expect(lastUrl(fetchMock)).toBe(`${API_URL}/customers`)
    expect(wrapper.findAll('article')).toHaveLength(3)
  })

  it('CA8: pulsaciones seguidas en menos de 300 ms hacen una sola llamada', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(three)))
    const wrapper = mount(CustomersView)
    await vi.advanceTimersByTimeAsync(0)
    const input = wrapper.get('input[type="search"]')
    for (const text of ['a', 'ac', 'acm']) {
      await input.setValue(text)
      await vi.advanceTimersByTimeAsync(100)
    }
    await vi.advanceTimersByTimeAsync(300)
    expect(requestedUrls(fetchMock)).toEqual([`${API_URL}/customers`, `${API_URL}/customers?q=acm`])
  })

  it('CA9: si la primera búsqueda responde después, se muestra la última', async () => {
    vi.useFakeTimers()
    const first = deferred<Response>()
    const second = deferred<Response>()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(three))
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const wrapper = mount(CustomersView)
    await vi.advanceTimersByTimeAsync(0)
    const input = wrapper.get('input[type="search"]')

    await input.setValue('a')
    await vi.advanceTimersByTimeAsync(300)
    await input.setValue('ab')
    await vi.advanceTimersByTimeAsync(300)
    second.resolve(jsonResponse([makeCustomer({ id: 9, name: 'Última' })]))
    await vi.advanceTimersByTimeAsync(0)
    first.resolve(jsonResponse(three))
    await vi.advanceTimersByTimeAsync(0)

    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.text()).toContain('Última')
  })

  it('CA10, CA11: el contador cuenta los resultados mostrados', async () => {
    expect((await open()).text()).toContain('3 clientes')
    expect((await open([three[0]!])).text()).toContain('1 cliente')
    expect((await open([three[0]!])).text()).not.toContain('1 clientes')
  })

  it('CA10: con una búsqueda que devuelve 2 de 5 clientes el contador dice «2 clientes»', async () => {
    vi.useFakeTimers()
    const five = [...three, makeCustomer({ id: 4 }), makeCustomer({ id: 5 })]
    fetchMock
      .mockResolvedValueOnce(jsonResponse(five))
      .mockResolvedValueOnce(jsonResponse([five[0]!, five[1]!]))
    const wrapper = mount(CustomersView)
    await vi.advanceTimersByTimeAsync(0)
    expect(wrapper.text()).toContain('5 clientes')

    await wrapper.get('input[type="search"]').setValue('a')
    await vi.advanceTimersByTimeAsync(300)
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 clientes')
    expect(wrapper.text()).not.toContain('5 clientes')
  })

  it('H3: el estado de carga y el contador son regiones role="status"', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const loading = mount(CustomersView)
    await flushPromises()
    expect(loading.findAll('[role="status"]').some((e) => e.text() === 'Cargando clientes…')).toBe(
      true,
    )
    const loaded = await open()
    expect(loaded.findAll('[role="status"]').some((e) => e.text() === '3 clientes')).toBe(true)
  })

  it('CA13: pulsar una tarjeta emite select con ese cliente', async () => {
    const wrapper = await open()
    await wrapper.findAll('article')[1]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[three[1]]])
  })
})
