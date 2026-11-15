import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SimulationHistory from '../SimulationHistory.vue'
import { failNetwork, historyUrl, makeSimulation, routeFetch } from '@/__tests__/detailHelpers'
import { buttonByText, mountDetail, normalize, settle } from '@/__tests__/mountDetail'
import { deferred, jsonResponse } from '@/__tests__/helpers'
import { resetExchangeRates } from '@/composables/useExchangeRates'
import type { Simulation } from '@/types/simulation'

const first = makeSimulation({
  id: 9,
  users: 60,
  storage_gb: 100,
  api_calls: 5000,
  subtotal: '470.00',
  vat: '98.70',
  total: '568.70',
  created_at: '2026-11-15T10:00:00Z',
})
const second = makeSimulation({
  id: 3,
  users: 11,
  storage_gb: 20,
  api_calls: 300,
  subtotal: '108.00',
  vat: '20.52',
  total: '128.52',
  country: 'DE',
  vat_rate: '0.19',
  created_at: '2026-11-14T09:30:00Z',
})

function mountHistory(simulations: Simulation[], status: 'loading' | 'error' | 'ready' = 'ready') {
  return mount(SimulationHistory, { props: { simulations, status } })
}

describe('SimulationHistory', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    process.env.TZ = 'UTC'
  })

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  it('CA21: una fila por simulación con todos los datos, en EUR y en el orden recibido', () => {
    const wrapper = mountHistory([first, second])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    const cells = (index: number) => rows[index]!.findAll('td').map((td) => normalize(td.text()))
    expect(cells(0)).toEqual([
      '15/11/2026, 10:00',
      '60',
      '100',
      '5000',
      '470,00 €',
      '98,70 €',
      '568,70 €',
    ])
    expect(cells(1)).toEqual([
      '14/11/2026, 09:30',
      '11',
      '20',
      '300',
      '108,00 €',
      '20,52 €',
      '128,52 €',
    ])
    expect(wrapper.text()).toContain('Importes en EUR')
  })

  it('CA21: respeta el orden de la API aunque no sea cronológico', () => {
    const wrapper = mountHistory([second, first])
    const dates = wrapper.findAll('tbody tr').map((row) => row.find('td').text())
    expect(dates).toEqual(['14/11/2026, 09:30', '15/11/2026, 10:00'])
  })

  describe('CA22: fecha en la zona horaria del navegador', () => {
    it.each([
      ['UTC', '15/11/2026, 10:00'],
      ['Europe/Madrid', '15/11/2026, 11:00'],
    ])('con %s se ve «%s», sin segundos', (zone, expected) => {
      process.env.TZ = zone
      const wrapper = mountHistory([first])
      expect(wrapper.find('tbody td').text()).toBe(expected)
    })
  })

  describe('CA23: estados', () => {
    it('cargando', () => {
      const wrapper = mountHistory([], 'loading')
      expect(wrapper.text()).toContain('Cargando historial…')
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('error con «Reintentar», que emite retry', async () => {
      const wrapper = mountHistory([], 'error')
      expect(wrapper.text()).toContain('No se pudo cargar el historial. Inténtalo de nuevo.')
      await buttonByText(wrapper as never, 'Reintentar')!.trigger('click')
      expect(wrapper.emitted('retry')).toHaveLength(1)
    })

    it('vacío', () => {
      const wrapper = mountHistory([])
      expect(wrapper.text()).toContain('Aún no hay simulaciones.')
      expect(wrapper.find('table').exists()).toBe(false)
    })
  })
})

describe('historial dentro del detalle (CA23)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetExchangeRates()
  })

  afterEach(() => {
    resetExchangeRates()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('se ve «Cargando historial…» mientras se pide y luego las filas', async () => {
    const pending = deferred<Response>()
    routeFetch({ history: () => pending.promise })
    const wrapper = await mountDetail()
    expect(wrapper.text()).toContain('Cargando historial…')
    pending.resolve(jsonResponse([first, second]))
    await settle()
    expect(wrapper.text()).not.toContain('Cargando historial…')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('tras un fallo, «Reintentar» vuelve a pedirlo', async () => {
    let calls = 0
    const fetchMock = routeFetch({
      history: () => (++calls === 1 ? failNetwork() : jsonResponse([first])),
    })
    const wrapper = await mountDetail()
    expect(wrapper.text()).toContain('No se pudo cargar el historial. Inténtalo de nuevo.')
    await buttonByText(wrapper, 'Reintentar')!.trigger('click')
    await settle()
    expect(fetchMock.mock.calls.filter(([url]) => url === historyUrl(1))).toHaveLength(2)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('una lista vacía muestra «Aún no hay simulaciones.»', async () => {
    routeFetch({ history: () => jsonResponse([]) })
    const wrapper = await mountDetail()
    expect(wrapper.text()).toContain('Aún no hay simulaciones.')
  })
})
