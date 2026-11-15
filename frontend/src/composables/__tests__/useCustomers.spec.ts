import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useCustomers } from '../useCustomers'
import { API_URL } from '@/services/customersService'
import { deferred, jsonResponse, makeCustomer, requestedUrls, stubFetch } from '@/__tests__/helpers'

describe('useCustomers', () => {
  let fetchMock: ReturnType<typeof stubFetch>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = stubFetch()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('estados (CA2, CA3, CA4, CA5)', () => {
    it('empieza cargando y pasa a datos', async () => {
      fetchMock.mockResolvedValue(jsonResponse([makeCustomer()]))
      const { status, customers, fetchCustomers } = useCustomers()
      const pending = fetchCustomers()
      expect(status.value).toBe('loading')
      await pending
      expect(status.value).toBe('ready')
      expect(customers.value).toHaveLength(1)
    })

    it('pasa a error ante un fallo de red y reintenta', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const { status, customers, fetchCustomers, retry } = useCustomers()
      await fetchCustomers()
      expect(status.value).toBe('error')

      fetchMock.mockResolvedValueOnce(jsonResponse([makeCustomer()]))
      await retry()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(status.value).toBe('ready')
      expect(customers.value).toHaveLength(1)
    })

    it('trata un 500 como error', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ detail: 'Error interno del servidor.' }, 500))
      const { status, fetchCustomers } = useCustomers()
      await fetchCustomers()
      expect(status.value).toBe('error')
    })

    it('lista vacía sin búsqueda: ready con 0 clientes y término vacío', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]))
      const { status, customers, term, fetchCustomers } = useCustomers()
      await fetchCustomers()
      expect(status.value).toBe('ready')
      expect(customers.value).toEqual([])
      expect(term.value).toBe('')
    })

    it('búsqueda sin resultados: guarda el texto recortado', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]))
      const { status, term, setQuery } = useCustomers()
      setQuery('  zzz  ')
      await vi.advanceTimersByTimeAsync(300)
      expect(status.value).toBe('ready')
      expect(term.value).toBe('zzz')
    })
  })

  describe('búsqueda (CA6, CA7, CA8)', () => {
    it('espera 300 ms y pide el texto recortado y codificado', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]))
      const { setQuery } = useCustomers()
      setQuery('  Acme S.L. & 100%_  ')
      await vi.advanceTimersByTimeAsync(299)
      expect(fetchMock).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(requestedUrls(fetchMock)).toEqual([
        `${API_URL}/customers?q=${encodeURIComponent('Acme S.L. & 100%_')}`,
      ])
    })

    it.each(['', '   ', '\t \n'])('con %j pide la lista completa sin q', async (text) => {
      fetchMock.mockResolvedValue(jsonResponse([]))
      const { setQuery } = useCustomers()
      setQuery(text)
      await vi.advanceTimersByTimeAsync(300)
      expect(requestedUrls(fetchMock)).toEqual([`${API_URL}/customers`])
    })

    it('varias pulsaciones seguidas hacen una sola llamada con el texto final', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]))
      const { setQuery } = useCustomers()
      for (const text of ['a', 'ac', 'acm', 'acme']) {
        setQuery(text)
        await vi.advanceTimersByTimeAsync(100)
      }
      await vi.advanceTimersByTimeAsync(300)
      expect(requestedUrls(fetchMock)).toEqual([`${API_URL}/customers?q=acme`])
    })

    it('busca también con un solo carácter', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]))
      const { setQuery } = useCustomers()
      setQuery('a')
      await vi.advanceTimersByTimeAsync(300)
      expect(requestedUrls(fetchMock)).toEqual([`${API_URL}/customers?q=a`])
    })

    it('resetSearch vacía el buscador y pide la lista completa sin esperar', async () => {
      fetchMock.mockResolvedValue(jsonResponse([]))
      const { query, setQuery, resetSearch } = useCustomers()
      setQuery('acme')
      await resetSearch()
      expect(query.value).toBe('')
      await vi.advanceTimersByTimeAsync(500)
      expect(requestedUrls(fetchMock)).toEqual([`${API_URL}/customers`])
    })
  })

  describe('respuestas antiguas (CA9)', () => {
    it('si la primera responde después, se muestra el resultado de la última', async () => {
      const first = deferred<Response>()
      const second = deferred<Response>()
      fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const { customers, status, setQuery } = useCustomers()

      setQuery('a')
      await vi.advanceTimersByTimeAsync(300)
      setQuery('ab')
      await vi.advanceTimersByTimeAsync(300)

      second.resolve(jsonResponse([makeCustomer({ id: 2, name: 'Segunda' })]))
      await flushPromises()
      first.resolve(jsonResponse([makeCustomer({ id: 1, name: 'Primera' })]))
      await flushPromises()

      expect(status.value).toBe('ready')
      expect(customers.value.map((c) => c.name)).toEqual(['Segunda'])
    })

    it('un error de una petición antigua no pisa el resultado reciente', async () => {
      const first = deferred<Response>()
      const second = deferred<Response>()
      fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const { customers, status, setQuery } = useCustomers()

      setQuery('a')
      await vi.advanceTimersByTimeAsync(300)
      setQuery('ab')
      await vi.advanceTimersByTimeAsync(300)

      second.resolve(jsonResponse([makeCustomer({ name: 'Última' })]))
      await flushPromises()
      first.reject(new TypeError('Failed to fetch'))
      await flushPromises()

      expect(status.value).toBe('ready')
      expect(customers.value.map((c) => c.name)).toEqual(['Última'])
    })

    it('cancela la petición anterior con AbortController', async () => {
      fetchMock.mockReturnValue(new Promise(() => {}))
      const { setQuery } = useCustomers()
      setQuery('a')
      await vi.advanceTimersByTimeAsync(300)
      const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal
      setQuery('ab')
      await vi.advanceTimersByTimeAsync(300)
      expect(firstSignal?.aborted).toBe(true)
    })
  })
})
