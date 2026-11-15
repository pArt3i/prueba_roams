import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CREATE_FAILED_MESSAGE, useCreateCustomer } from '../useCreateCustomer'
import { API_URL } from '@/services/customersService'
import { deferred, jsonResponse, makeCustomer, stubFetch } from '@/__tests__/helpers'

function fillForm(form: ReturnType<typeof useCreateCustomer>['form']) {
  form.name = 'Acme S.L.'
  form.email = 'ventas@acme.com'
  form.country = 'ES'
  form.plan = 'business'
  form.tax_id = ' 12.345.678-z '
}

describe('useCreateCustomer', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    fetchMock = stubFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CA18: envía los cinco campos tal como se escribieron', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeCustomer(), 201))
    const { form, submit } = useCreateCustomer()
    fillForm(form)
    await submit()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${API_URL}/customers`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Acme S.L.',
      email: 'ventas@acme.com',
      country: 'ES',
      plan: 'business',
      tax_id: ' 12.345.678-z ',
    })
  })

  it('con selectores sin elegir envía country y plan vacíos', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'El país es obligatorio.' }, 422))
    const { submit, errorMessage } = useCreateCustomer()
    await submit()
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      country: '',
      plan: '',
    })
    expect(errorMessage.value).toBe('El país es obligatorio.')
  })

  it('201: devuelve true, limpia el formulario y no hay error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeCustomer(), 201))
    const { form, submit, submitting, errorMessage } = useCreateCustomer()
    fillForm(form)
    expect(await submit()).toBe(true)
    expect(form.name).toBe('')
    expect(errorMessage.value).toBe('')
    expect(submitting.value).toBe(false)
  })

  it('422: muestra el detail, conserva lo escrito y reactiva el envío', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'El email no es válido.' }, 422))
    const { form, submit, submitting, errorMessage } = useCreateCustomer()
    fillForm(form)
    expect(await submit()).toBe(false)
    expect(errorMessage.value).toBe('El email no es válido.')
    expect(form.name).toBe('Acme S.L.')
    expect(submitting.value).toBe(false)
  })

  it('409: muestra el detail y conserva lo escrito', async () => {
    const detail = 'Ya existe un cliente con ese identificador fiscal.'
    fetchMock.mockResolvedValue(jsonResponse({ detail }, 409))
    const { form, submit, errorMessage } = useCreateCustomer()
    fillForm(form)
    expect(await submit()).toBe(false)
    expect(errorMessage.value).toBe(detail)
    expect(form.tax_id).toBe(' 12.345.678-z ')
  })

  it('fallo de red: mensaje genérico', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { submit, errorMessage, submitting } = useCreateCustomer()
    expect(await submit()).toBe(false)
    expect(errorMessage.value).toBe(CREATE_FAILED_MESSAGE)
    expect(submitting.value).toBe(false)
  })

  it.each([
    ['500', jsonResponse({ detail: 'Error interno del servidor.' }, 500)],
    ['200 en lugar de 201', jsonResponse(makeCustomer(), 200)],
    ['422 sin detail', jsonResponse({}, 422)],
    ['422 con detail que no es texto', jsonResponse({ detail: [{ msg: 'x' }] }, 422)],
    ['409 con cuerpo que no es JSON', new Response('conflicto', { status: 409 })],
  ])('%s: mensaje genérico', async (_name, response) => {
    fetchMock.mockResolvedValue(response)
    const { submit, errorMessage } = useCreateCustomer()
    expect(await submit()).toBe(false)
    expect(errorMessage.value).toBe(CREATE_FAILED_MESSAGE)
  })

  it('CA23: mientras envía está ocupado y un segundo envío no hace otra llamada', async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValue(pending.promise)
    const { submit, submitting } = useCreateCustomer()

    const first = submit()
    expect(submitting.value).toBe(true)
    expect(await submit()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    pending.resolve(jsonResponse(makeCustomer(), 201))
    expect(await first).toBe(true)
    expect(submitting.value).toBe(false)
  })

  it('reset vacía el formulario y el error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Plan no válido.' }, 422))
    const { form, submit, reset, errorMessage } = useCreateCustomer()
    fillForm(form)
    await submit()
    reset()
    expect(form.name).toBe('')
    expect(form.country).toBe('')
    expect(errorMessage.value).toBe('')
  })
})
