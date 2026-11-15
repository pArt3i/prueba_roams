import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EXCHANGE_URL,
  PREVIEW_URL,
  callsTo,
  makePreview,
  makeSimulation,
  ratesBody,
  routeFetch,
} from '@/__tests__/detailHelpers'
import { ACME, amountsText, choose, mountDetail, selected } from '@/__tests__/mountDetail'
import { jsonResponse } from '@/__tests__/helpers'
import { resetExchangeRates } from '@/composables/useExchangeRates'

describe('simulador: divisas', () => {
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

  const rateCalls = () => callsTo(fetchMock, EXCHANGE_URL).length

  it('CA24: empieza en EUR, sin pedir el tipo y sin convertir', async () => {
    const wrapper = await mountDetail()
    expect(selected(wrapper)).toBe('EUR')
    expect(rateCalls()).toBe(0)
    expect(amountsText(wrapper).total).toBe('568,70 €')
  })

  it('CA25: USD, luego GBP y luego USD piden el tipo una sola vez y no vuelven a pedir el precio', async () => {
    const wrapper = await mountDetail()
    await choose(wrapper, 'USD')
    await choose(wrapper, 'GBP')
    await choose(wrapper, 'USD')
    await choose(wrapper, 'EUR')
    await choose(wrapper, 'USD')
    expect(rateCalls()).toBe(1)
    expect(callsTo(fetchMock, PREVIEW_URL)).toHaveLength(1)
  })

  it('CA27: con USD y tipo 1.0829 se ve 508,96, 106,88 y 615,84 (suma de ambos, no 615,85)', async () => {
    const wrapper = await mountDetail()
    await choose(wrapper, 'USD')
    const { subtotal, vat, total } = amountsText(wrapper)
    expect(subtotal).toContain('508,96')
    expect(vat).toContain('106,88')
    expect(total).toContain('615,84')
    expect(total).not.toContain('615,85')
  })

  it('con GBP usa el tipo de GBP y con EUR vuelve a los importes originales', async () => {
    const wrapper = await mountDetail()
    await choose(wrapper, 'GBP') // 0.85: 470.00 × 0.85 = 399.50
    expect(amountsText(wrapper).subtotal).toContain('399,50')
    await choose(wrapper, 'EUR')
    expect(amountsText(wrapper).subtotal).toBe('470,00 €')
  })

  it('CA29: subtotal convertido más IVA convertido es siempre el total mostrado', async () => {
    const cents = (text: string | null) => Number(text!.replace(/[^\d,]/g, '').replace(',', '')) // texto en céntimos
    const breakdowns = [
      makePreview(),
      makePreview({ subtotal: '108.00', vat: '20.52', total: '128.52' }),
    ]
    for (const preview of breakdowns) {
      for (const [usd, gbp] of [
        [1.0829, 0.8571],
        [1.005, 1.5],
        [0.9999, 1.1234],
      ]) {
        resetExchangeRates()
        fetchMock = routeFetch({
          preview: () => jsonResponse(preview),
          rates: () => jsonResponse(ratesBody(usd, gbp)),
        })
        const wrapper = await mountDetail()
        for (const currency of ['USD', 'GBP'] as const) {
          await choose(wrapper, currency)
          const shown = amountsText(wrapper)
          expect(cents(shown.subtotal) + cents(shown.vat)).toBe(cents(shown.total))
        }
        wrapper.unmount()
      }
    }
  })

  it('CA21: elegir USD no cambia las filas del historial', async () => {
    routeFetch({ history: () => jsonResponse([makeSimulation()]) })
    const wrapper = await mountDetail()
    const before = wrapper.find('tbody').text()
    await choose(wrapper, 'USD')
    expect(wrapper.find('tbody').text()).toBe(before)
    expect(before).toContain('568,70')
  })

  describe('CA26: el tipo se conserva al volver a la lista', () => {
    it('otro cliente empieza en EUR y no repite la petición', async () => {
      const first = await mountDetail()
      await choose(first, 'USD')
      first.unmount()

      // Si se volviera a pedir, saldría otro tipo.
      fetchMock = routeFetch({ rates: () => jsonResponse(ratesBody(9, 9)) })
      const second = await mountDetail({ ...ACME, id: 2, name: 'Beta S.A.' })
      expect(selected(second)).toBe('EUR')
      await choose(second, 'GBP')
      expect(rateCalls()).toBe(0)
      expect(amountsText(second).subtotal).toContain('399,50') // 0.85 en memoria
      await choose(second, 'USD')
      expect(amountsText(second).subtotal).toContain('508,96')
    })
  })
})
