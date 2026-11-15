import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { EXCHANGE_URL, callsTo, failNetwork, routeFetch } from '@/__tests__/detailHelpers'
import { choose, mountDetail, settle } from '@/__tests__/mountDetail'
import { deferred } from '@/__tests__/helpers'
import { EXCHANGE_TIMEOUT_MS, resetExchangeRates } from '@/composables/useExchangeRates'

const ATTRIBUTION_TEXT = 'Rates By Exchange Rate API'
const ATTRIBUTION_HREF = 'https://www.exchangerate-api.com'

function expectAttribution(wrapper: VueWrapper) {
  const links = wrapper.findAll('a').filter((link) => link.text() === ATTRIBUTION_TEXT)
  expect(links).toHaveLength(1)
  const link = links[0]!
  expect(link.attributes('href')).toBe(ATTRIBUTION_HREF)
  expect(link.attributes('target')).toBe('_blank')
  expect(link.attributes('rel')).toBe('noopener noreferrer')
}

describe('CA39: atribución de los tipos de cambio (R20)', () => {
  let fetchMock: ReturnType<typeof routeFetch>

  beforeEach(() => {
    vi.useFakeTimers()
    resetExchangeRates()
    fetchMock = routeFetch()
  })

  afterEach(() => {
    resetExchangeRates()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('con EUR en un detalle recién abierto, sin petición de tipos', async () => {
    const wrapper = await mountDetail()
    expect(callsTo(fetchMock, EXCHANGE_URL)).toHaveLength(0)
    expectAttribution(wrapper)
  })

  it.each(['USD', 'GBP'] as const)('con %s elegida', async (currency) => {
    const wrapper = await mountDetail()
    await choose(wrapper, currency)
    expect(callsTo(fetchMock, EXCHANGE_URL)).toHaveLength(1)
    expectAttribution(wrapper)
  })

  it('cuando la petición del tipo de cambio falla', async () => {
    fetchMock = routeFetch({ rates: failNetwork })
    const wrapper = await mountDetail()
    await choose(wrapper, 'USD')
    expect(wrapper.text()).toContain('No se pudo obtener el tipo de cambio')
    expectAttribution(wrapper)
  })

  it('cuando la petición no responde en 5 s, antes y después del aviso', async () => {
    fetchMock = routeFetch({ rates: () => deferred<Response>().promise })
    const wrapper = await mountDetail()
    await choose(wrapper, 'USD')
    expectAttribution(wrapper)
    await settle(EXCHANGE_TIMEOUT_MS)
    expect(wrapper.text()).toContain('No se pudo obtener el tipo de cambio')
    expectAttribution(wrapper)
  })
})
