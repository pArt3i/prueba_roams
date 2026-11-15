import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EXCHANGE_URL,
  callsTo,
  failNetwork,
  ratesBody,
  routeFetch,
} from '@/__tests__/detailHelpers'
import {
  amountsText,
  buttonByText,
  choose,
  mountDetail,
  selected,
  settle,
} from '@/__tests__/mountDetail'
import { deferred, jsonResponse } from '@/__tests__/helpers'
import { EXCHANGE_TIMEOUT_MS, resetExchangeRates } from '@/composables/useExchangeRates'

const RATES_WARNING = 'No se pudo obtener el tipo de cambio. Se muestran los importes en EUR.'

describe('simulador: fallos del tipo de cambio', () => {
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

  describe('CA30: sin respuesta en 5 s o con fallo', () => {
    it('a los 4999 ms no hay aviso y a los 5000 ms sí, con EUR, selector y «Reintentar»', async () => {
      fetchMock = routeFetch({ rates: () => deferred<Response>().promise })
      const wrapper = await mountDetail()
      await choose(wrapper, 'USD')
      await settle(EXCHANGE_TIMEOUT_MS - 1)
      expect(wrapper.text()).not.toContain(RATES_WARNING)
      await settle(1)
      expect(wrapper.text()).toContain(RATES_WARNING)
      expect(buttonByText(wrapper, 'Reintentar')).toBeDefined()
      expect(amountsText(wrapper).total).toBe('568,70 €')
      expect(selected(wrapper)).toBe('USD')

      await choose(wrapper, 'EUR')
      expect(wrapper.text()).not.toContain(RATES_WARNING)
    })

    it('una respuesta posterior a los 5 s se ignora', async () => {
      const late = deferred<Response>()
      fetchMock = routeFetch({ rates: () => late.promise })
      const wrapper = await mountDetail()
      await choose(wrapper, 'USD')
      await settle(EXCHANGE_TIMEOUT_MS)
      late.resolve(jsonResponse(ratesBody(1.0829, 0.85)))
      await settle()
      expect(wrapper.text()).toContain(RATES_WARNING)
      expect(amountsText(wrapper).total).toBe('568,70 €')
    })

    it('un fallo de red muestra el aviso sin romper la pantalla', async () => {
      fetchMock = routeFetch({ rates: () => failNetwork() })
      const wrapper = await mountDetail()
      await choose(wrapper, 'GBP')
      expect(wrapper.text()).toContain(RATES_WARNING)
      expect(selected(wrapper)).toBe('GBP')
      expect(amountsText(wrapper).subtotal).toBe('470,00 €')
    })
  })

  describe('CA31, CA32 y CA35: respuesta de tipos no válida', () => {
    // [caso, USD, GBP, result, divisa con tipo válido que se elige]
    type Case = [string, unknown, unknown, unknown, 'USD' | 'GBP']
    const invalid: Case[] = [
      ['USD ausente', undefined, 0.85, 'success', 'GBP'],
      ['GBP ausente', 1.0829, undefined, 'success', 'USD'],
      ['USD "abc"', 'abc', 0.85, 'success', 'GBP'],
      ['GBP null', 1.0829, null, 'success', 'USD'],
      ['USD 0', 0, 0.85, 'success', 'GBP'],
      ['GBP -1', 1.0829, -1, 'success', 'USD'],
      ['result "error" con tipos válidos', 1.0829, 0.85, 'error', 'USD'],
      ['USD válido y GBP inválido', 1.0829, 'x', 'success', 'USD'],
      ['USD inválido y GBP válido', 'x', 0.85, 'success', 'GBP'],
      ['USD 1e-7', 1e-7, 0.85, 'success', 'GBP'],
      ['GBP 0.0000001', 1.0829, 0.0000001, 'success', 'USD'],
      ['USD 1e21', 1e21, 0.85, 'success', 'GBP'],
    ]

    it.each(invalid)(
      '%s: aviso, EUR, nada en memoria y «Reintentar» corrige',
      async (_n, usd, gbp, result, valid) => {
        fetchMock = routeFetch({ rates: () => jsonResponse(ratesBody(usd, gbp, result)) })
        const wrapper = await mountDetail()
        // Se elige la divisa de un tipo válido: no basta, toda la respuesta es un fallo.
        await choose(wrapper, valid)
        expect(wrapper.text()).toContain(RATES_WARNING)
        expect(amountsText(wrapper).total).toBe('568,70 €')

        fetchMock = routeFetch()
        await buttonByText(wrapper, 'Reintentar')!.trigger('click')
        await settle()
        expect(rateCalls()).toBe(1)
        expect(wrapper.text()).not.toContain(RATES_WARNING)
        expect(amountsText(wrapper).total).not.toBe('568,70 €')
      },
    )
  })

  describe('CA33: «Reintentar» del tipo de cambio', () => {
    it('si responde bien se ven los importes convertidos y desaparece el aviso', async () => {
      fetchMock = routeFetch({ rates: () => failNetwork() })
      const wrapper = await mountDetail()
      await choose(wrapper, 'USD')
      fetchMock = routeFetch()
      await buttonByText(wrapper, 'Reintentar')!.trigger('click')
      await settle()
      expect(wrapper.text()).not.toContain(RATES_WARNING)
      expect(amountsText(wrapper).total).toContain('615,84')
    })

    it('si falla, el aviso sigue y no hay reintentos automáticos', async () => {
      fetchMock = routeFetch({ rates: () => failNetwork() })
      const wrapper = await mountDetail()
      await choose(wrapper, 'USD')
      await buttonByText(wrapper, 'Reintentar')!.trigger('click')
      await settle(30_000)
      expect(wrapper.text()).toContain(RATES_WARNING)
      expect(buttonByText(wrapper, 'Reintentar')).toBeDefined()
      expect(rateCalls()).toBe(2)
    })
  })
})
