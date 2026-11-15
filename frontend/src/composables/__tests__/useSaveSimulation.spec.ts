import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SAVE_FAILED_MESSAGE, SAVED_MESSAGE, useSaveSimulation } from '../useSaveSimulation'
import {
  SIMULATIONS_URL,
  bodyOf,
  callsTo,
  failNetwork,
  makeSimulation,
} from '@/__tests__/detailHelpers'
import { deferred, jsonResponse, stubFetch } from '@/__tests__/helpers'

const fields = { users: 60, storage_gb: 100, api_calls: 5000 }

describe('useSaveSimulation', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    fetchMock = stubFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CA18: envía exactamente customer_id, users, storage_gb y api_calls', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeSimulation(), 201))
    const { save, savedMessage, errorMessage } = useSaveSimulation(1)
    expect(await save(fields)).toBe(true)
    const calls = callsTo(fetchMock, SIMULATIONS_URL)
    expect(calls).toHaveLength(1)
    expect(calls[0]![1]!.method).toBe('POST')
    expect(bodyOf(calls[0])).toEqual({
      customer_id: 1,
      users: 60,
      storage_gb: 100,
      api_calls: 5000,
    })
    expect(savedMessage.value).toBe(SAVED_MESSAGE)
    expect(errorMessage.value).toBe('')
  })

  it('CA18: no envía plan, país ni importes aunque se le pasen de más', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeSimulation(), 201))
    const { save } = useSaveSimulation(1)
    const extra = { ...fields, plan: 'business', country: 'ES', total: '1.00' }
    await save(extra)
    expect(Object.keys(bodyOf(callsTo(fetchMock, SIMULATIONS_URL)[0]) as object).sort()).toEqual([
      'api_calls',
      'customer_id',
      'storage_gb',
      'users',
    ])
  })

  it('CA19: dos llamadas seguidas producen una sola petición y saving refleja el envío', async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValue(pending.promise)
    const { save, saving } = useSaveSimulation(1)
    const first = save(fields)
    const second = save(fields)
    expect(saving.value).toBe(true)
    expect(await second).toBe(false)
    pending.resolve(jsonResponse(makeSimulation(), 201))
    expect(await first).toBe(true)
    expect(saving.value).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  describe('errores (CA20)', () => {
    it('404: «Cliente no encontrado.»', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'Cliente no encontrado.' }, 404))
      const { save, errorMessage, savedMessage, saving } = useSaveSimulation(1)
      expect(await save(fields)).toBe(false)
      expect(errorMessage.value).toBe('Cliente no encontrado.')
      expect(savedMessage.value).toBe('')
      expect(saving.value).toBe(false)
    })

    it('422 con detail: se ve el mensaje de la API', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ detail: 'El almacenamiento debe ser un entero entre 0 y 1000000.' }, 422),
      )
      const { save, errorMessage } = useSaveSimulation(1)
      expect(await save(fields)).toBe(false)
      expect(errorMessage.value).toBe('El almacenamiento debe ser un entero entre 0 y 1000000.')
    })

    it('422 sin detail de texto: igual que un fallo de red', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: [{ msg: 'x' }] }, 422))
      const { save, errorMessage } = useSaveSimulation(1)
      await save(fields)
      expect(errorMessage.value).toBe(SAVE_FAILED_MESSAGE)
    })

    it('fallo de red y 5xx: «No se pudo guardar la simulación. Inténtalo de nuevo.»', async () => {
      fetchMock.mockImplementationOnce(failNetwork)
      const { save, errorMessage } = useSaveSimulation(1)
      await save(fields)
      expect(errorMessage.value).toBe(SAVE_FAILED_MESSAGE)

      fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Error interno.' }, 500))
      await save(fields)
      expect(errorMessage.value).toBe(SAVE_FAILED_MESSAGE)
    })

    it('tras un fallo se puede volver a guardar y el error se limpia', async () => {
      fetchMock.mockImplementationOnce(failNetwork)
      const { save, errorMessage, savedMessage } = useSaveSimulation(1)
      await save(fields)
      fetchMock.mockResolvedValueOnce(jsonResponse(makeSimulation(), 201))
      expect(await save(fields)).toBe(true)
      expect(errorMessage.value).toBe('')
      expect(savedMessage.value).toBe(SAVED_MESSAGE)
    })
  })
})
