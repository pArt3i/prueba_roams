import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useSimulationHistory } from '../useSimulationHistory'
import { failNetwork, historyUrl, makeSimulation } from '@/__tests__/detailHelpers'
import { deferred, jsonResponse, requestedUrls, stubFetch } from '@/__tests__/helpers'

describe('useSimulationHistory', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    fetchMock = stubFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CA23: empieza cargando y pasa a datos, en el orden de la API', async () => {
    const list = [makeSimulation({ id: 9 }), makeSimulation({ id: 3 }), makeSimulation({ id: 5 })]
    fetchMock.mockResolvedValue(jsonResponse(list))
    const { status, simulations, load } = useSimulationHistory(4)
    expect(status.value).toBe('loading')
    const pending = load()
    expect(status.value).toBe('loading')
    await pending
    expect(status.value).toBe('ready')
    expect(simulations.value.map((s) => s.id)).toEqual([9, 3, 5])
    expect(requestedUrls(fetchMock)).toEqual([historyUrl(4)])
  })

  it('CA23: una lista vacía es ready con 0 filas', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    const { status, simulations, load } = useSimulationHistory(1)
    await load()
    expect(status.value).toBe('ready')
    expect(simulations.value).toEqual([])
  })

  it('CA23: un fallo de red o un 5xx dan error y «Reintentar» vuelve a pedir', async () => {
    fetchMock.mockImplementationOnce(failNetwork)
    const { status, simulations, load, retry } = useSimulationHistory(1)
    await load()
    expect(status.value).toBe('error')

    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Error interno.' }, 500))
    await retry()
    expect(status.value).toBe('error')

    fetchMock.mockResolvedValueOnce(jsonResponse([makeSimulation()]))
    await retry()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(status.value).toBe('ready')
    expect(simulations.value).toHaveLength(1)
  })

  it('una recarga con datos a la vista no vuelve a «cargando»', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeSimulation({ id: 1 })]))
    const { status, simulations, load } = useSimulationHistory(1)
    await load()
    const slow = deferred<Response>()
    fetchMock.mockReturnValueOnce(slow.promise)
    const reload = load()
    expect(status.value).toBe('ready')
    expect(simulations.value).toHaveLength(1)
    slow.resolve(jsonResponse([makeSimulation({ id: 2 }), makeSimulation({ id: 1 })]))
    await reload
    expect(simulations.value.map((s) => s.id)).toEqual([2, 1])
  })

  it('si falla la recarga con datos a la vista, se ve el error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeSimulation()]))
    const { status, load } = useSimulationHistory(1)
    await load()
    fetchMock.mockImplementationOnce(failNetwork)
    await load()
    expect(status.value).toBe('error')
  })

  it('una respuesta antigua no pisa a una más reciente', async () => {
    const first = deferred<Response>()
    const second = deferred<Response>()
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { simulations, load } = useSimulationHistory(1)
    void load()
    void load()
    second.resolve(jsonResponse([makeSimulation({ id: 2 })]))
    await flushPromises()
    first.resolve(jsonResponse([makeSimulation({ id: 1 })]))
    await flushPromises()
    expect(simulations.value.map((s) => s.id)).toEqual([2])
  })
})
