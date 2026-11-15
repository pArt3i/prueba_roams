import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CustomersView from '../CustomersView.vue'
import { API_URL } from '@/services/customersService'
import { deferred, jsonResponse, lastUrl, makeCustomer, stubFetch } from '@/__tests__/helpers'

const three = [
  makeCustomer({ id: 1, name: 'Acme S.L.' }),
  makeCustomer({ id: 2, name: 'Beta S.A.', tax_id: 'PT12345' }),
  makeCustomer({ id: 3, name: 'Gamma GmbH', tax_id: 'DE98765' }),
]

describe('CustomersView: alta de cliente', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    fetchMock = stubFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function open() {
    fetchMock.mockResolvedValue(jsonResponse(three))
    const wrapper = mount(CustomersView)
    await flushPromises()
    return wrapper
  }

  async function openForm() {
    const wrapper = await open()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Nuevo cliente')!
      .trigger('click')
    return wrapper
  }

  async function fillValidForm(wrapper: Awaited<ReturnType<typeof openForm>>) {
    await wrapper.get('input[autocomplete="organization"]').setValue('Delta S.L.')
    await wrapper.get('input[type="email"]').setValue('delta@delta.com')
    const [country, plan] = wrapper.findAll('select')
    await country!.setValue('PT')
    await plan!.setValue('enterprise')
    await wrapper.get('input[spellcheck="false"]').setValue('PT123456')
  }

  async function submitValidForm(wrapper: Awaited<ReturnType<typeof openForm>>) {
    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
  }

  /** Envía el alta con la respuesta sin resolver y devuelve cómo resolverla. */
  async function submitPending(wrapper: Awaited<ReturnType<typeof openForm>>) {
    const pending = deferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    return pending
  }

  const created = () => jsonResponse(makeCustomer({ id: 4, name: 'Delta S.L.' }), 201)

  it('CA17: «Nuevo cliente» abre el panel en la misma pantalla, con la lista visible', async () => {
    const wrapper = await openForm()
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.findAll('article')).toHaveLength(3)
  })

  it('CA19: con 201 cierra el panel, vacía el buscador, pide la lista completa y avisa', async () => {
    const wrapper = await openForm()
    await wrapper.get('input[type="search"]').setValue('acme')
    fetchMock
      .mockResolvedValueOnce(jsonResponse(makeCustomer({ id: 4 }), 201))
      .mockResolvedValueOnce(jsonResponse([...three, makeCustomer({ id: 4, name: 'Delta S.L.' })]))
    await submitValidForm(wrapper)

    expect(wrapper.find('form').exists()).toBe(false)
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('')
    expect(lastUrl(fetchMock)).toBe(`${API_URL}/customers`)
    expect(wrapper.get('[role="status"]').text()).toBe('Cliente creado.')
    expect(wrapper.findAll('article')).toHaveLength(4)
  })

  it('CA20, CA21: con 409 el panel sigue abierto con el error en role="alert"', async () => {
    const wrapper = await openForm()
    const detail = 'Ya existe un cliente con ese identificador fiscal.'
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail }, 409))
    await submitValidForm(wrapper)

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toBe(detail)
    expect(wrapper.get('[role="status"]').text()).toBe('')
  })

  it('Cancelar cierra el panel sin enviar nada', async () => {
    const wrapper = await openForm()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancelar')!
      .trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('H1: cancelar con el alta en curso y 201 recarga la lista y avisa igualmente', async () => {
    const wrapper = await openForm()
    const pending = await submitPending(wrapper)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancelar')!
      .trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)

    fetchMock.mockResolvedValueOnce(jsonResponse([...three, makeCustomer({ id: 4 })]))
    pending.resolve(created())
    await flushPromises()

    expect(lastUrl(fetchMock)).toBe(`${API_URL}/customers`)
    expect(wrapper.get('[role="status"]').text()).toBe('Cliente creado.')
    expect(wrapper.findAll('article')).toHaveLength(4)
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('H1: cerrar el panel con «Nuevo cliente» durante el envío y 201 también recarga y avisa', async () => {
    const wrapper = await openForm()
    const pending = await submitPending(wrapper)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Nuevo cliente')!
      .trigger('click')
    expect(wrapper.find('form').exists()).toBe(false)

    fetchMock.mockResolvedValueOnce(jsonResponse([...three, makeCustomer({ id: 4 })]))
    pending.resolve(created())
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe('Cliente creado.')
    expect(wrapper.findAll('article')).toHaveLength(4)
  })

  it('H1: si el alta falla tras cancelar no se muestra nada y al reabrir el panel está limpio', async () => {
    const wrapper = await openForm()
    const pending = await submitPending(wrapper)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancelar')!
      .trigger('click')

    pending.resolve(jsonResponse({ detail: 'Ya existe un cliente con ese identificador fiscal.' }, 409))
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('')
    expect(wrapper.findAll('article')).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Nuevo cliente')!
      .trigger('click')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect((wrapper.get('input[type="email"]').element as HTMLInputElement).value).toBe('')
  })
})
