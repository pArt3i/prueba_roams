import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CustomerForm from '../CustomerForm.vue'
import SearchBox from '../SearchBox.vue'
import { useCreateCustomer } from '@/composables/useCreateCustomer'
import { deferred, jsonResponse, makeCustomer, stubFetch } from '@/__tests__/helpers'

/** Monta el formulario con el estado del alta que normalmente le da la vista. */
function mountForm() {
  const create = useCreateCustomer()
  const results: boolean[] = []
  const wrapper = mount(CustomerForm, {
    props: {
      create,
      onSubmit: async () => {
        results.push(await create.submit())
      },
    },
  })
  return { wrapper, results }
}

async function fill(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('input[type="text"][autocomplete="organization"]').setValue('Acme S.L.')
  await wrapper.get('input[type="email"]').setValue('ventas@acme.com')
  const [country, plan] = wrapper.findAll('select')
  await country!.setValue('ES')
  await plan!.setValue('starter')
  await wrapper.get('input[spellcheck="false"]').setValue('12345678Z')
}

describe('CustomerForm', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    fetchMock = stubFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CA17: es un formulario en la página (no un diálogo) con los cinco campos', () => {
    const { wrapper } = mountForm()
    expect(wrapper.element.tagName).toBe('FORM')
    expect(wrapper.find('dialog, [role="dialog"], [aria-modal]').exists()).toBe(false)
    expect(wrapper.findAll('input')).toHaveLength(3)
    expect(wrapper.findAll('select')).toHaveLength(2)
  })

  it('CA17: país y plan ofrecen las opciones y empiezan vacíos', () => {
    const { wrapper } = mountForm()
    const [country, plan] = wrapper.findAll('select')
    expect(country!.findAll('option').map((o) => o.text())).toEqual([
      'Selecciona un país',
      'España',
      'Portugal',
      'Francia',
      'Alemania',
      'Italia',
    ])
    expect(plan!.findAll('option').map((o) => o.text())).toEqual([
      'Selecciona un plan',
      'Starter',
      'Business',
      'Enterprise',
    ])
    expect((country!.element as HTMLSelectElement).value).toBe('')
    expect((plan!.element as HTMLSelectElement).value).toBe('')
  })

  it('CA17: el plan lleva el texto «Informativo: no cambia el precio.» asociado', () => {
    const { wrapper } = mountForm()
    const plan = wrapper.findAll('select')[1]!
    const hintId = plan.attributes('aria-describedby')!
    expect(wrapper.get(`[id="${hintId}"]`).text()).toBe('Informativo: no cambia el precio.')
  })

  it('CA15: cada campo tiene un label asociado y los botones son alcanzables', () => {
    const { wrapper } = mountForm()
    const labels = ['Nombre', 'Email', 'País', 'Plan', 'Identificador fiscal']
    for (const text of labels) {
      const label = wrapper.findAll('label').find((l) => l.text() === text)!
      expect(label).toBeDefined()
      const control = wrapper.get(`[id="${label.attributes('for')}"]`)
      expect(['INPUT', 'SELECT']).toContain(control.element.tagName)
    }
    for (const button of wrapper.findAll('button')) {
      expect(button.attributes('tabindex')).toBeUndefined()
      expect(button.attributes('disabled')).toBeUndefined()
    }
  })

  it('CA15: el buscador tiene label asociado', () => {
    const wrapper = mount(SearchBox, { props: { modelValue: '' } })
    const label = wrapper.get('label')
    expect(label.text()).toBe('Buscar clientes')
    expect(wrapper.get(`[id="${label.attributes('for')}"]`).element.tagName).toBe('INPUT')
  })

  it('CA18: al enviar llama a POST /customers y el alta tiene éxito con 201', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeCustomer(), 201))
    const { wrapper, results } = mountForm()
    await fill(wrapper)
    await wrapper.trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      name: 'Acme S.L.',
      email: 'ventas@acme.com',
      country: 'ES',
      plan: 'starter',
      tax_id: '12345678Z',
    })
    expect(results).toEqual([true])
  })

  it('CA20: con 422 muestra el detail en role="alert", conserva lo escrito y reactiva el botón', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Identificador fiscal no válido.' }, 422))
    const { wrapper, results } = mountForm()
    await fill(wrapper)
    await wrapper.trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Identificador fiscal no válido.')
    expect(results).toEqual([false])
    expect((wrapper.get('input[spellcheck="false"]').element as HTMLInputElement).value).toBe(
      '12345678Z',
    )
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('CA21: con 409 muestra su detail en role="alert" y no emite created', async () => {
    const detail = 'Ya existe un cliente con ese identificador fiscal.'
    fetchMock.mockResolvedValue(jsonResponse({ detail }, 409))
    const { wrapper, results } = mountForm()
    await fill(wrapper)
    await wrapper.trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe(detail)
    expect(results).toEqual([false])
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('CA22: con fallo de red muestra el mensaje genérico en role="alert"', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { wrapper, results } = mountForm()
    await fill(wrapper)
    await wrapper.trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe(
      'No se pudo crear el cliente. Inténtalo de nuevo.',
    )
    expect(results).toEqual([false])
  })

  it('CA23: durante el envío el botón está desactivado y un doble envío hace una sola llamada', async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValue(pending.promise)
    const { wrapper } = mountForm()
    await fill(wrapper)

    await wrapper.trigger('submit')
    await wrapper.trigger('submit')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    pending.resolve(jsonResponse(makeCustomer(), 201))
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('Cancelar emite cancel sin enviar nada', async () => {
    const { wrapper } = mountForm()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Cancelar')!
      .trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
