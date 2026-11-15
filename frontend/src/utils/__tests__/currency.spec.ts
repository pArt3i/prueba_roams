import { describe, expect, it } from 'vitest'
import { addAmounts, convertAmount, convertBreakdown, formatMoney } from '../currency'

describe('convertAmount (CA28)', () => {
  it.each([
    ['470.00', '1.0829', '508.96'],
    ['98.70', '1.0829', '106.88'],
    ['568.70', '1.0829', '615.85'],
  ])('%s × %s = %s', (amount, rate, expected) => {
    expect(convertAmount(amount, rate)).toBe(expected)
  })

  it('el total convertido directamente difiere en 0,01 de la suma de las partes', () => {
    const sum = addAmounts(convertAmount('470.00', '1.0829'), convertAmount('98.70', '1.0829'))
    expect(sum).toBe('615.84')
    expect(convertAmount('568.70', '1.0829')).toBe('615.85')
  })

  it('redondea ROUND_HALF_UP sin errores de coma flotante', () => {
    expect(convertAmount('1.00', '1.005')).toBe('1.01') // 1.005 en float sería 1.00499…
    expect(convertAmount('0.03', '1.5')).toBe('0.05') // 0.045 en la mitad exacta
    expect(convertAmount('0.01', '0.5')).toBe('0.01') // 0.005 sube
    expect(convertAmount('0.01', '0.49')).toBe('0.00')
  })

  it('maneja importes grandes y céntimos sueltos con dos decimales siempre', () => {
    expect(convertAmount('50170.00', '1.0829')).toBe('54329.09')
    expect(convertAmount('0.00', '1.0829')).toBe('0.00')
    expect(convertAmount('100', '2')).toBe('200.00')
    expect(convertAmount('5.5', '1')).toBe('5.50')
  })

  it('rechaza importes y tipos mal formados', () => {
    expect(() => convertAmount('abc', '1.1')).toThrow(RangeError)
    expect(() => convertAmount('1.001', '1.1')).toThrow(RangeError)
    expect(() => convertAmount('10.00', '1e-7')).toThrow(RangeError)
    expect(() => convertAmount('10.00', '-1')).toThrow(RangeError)
  })
})

describe('convertBreakdown (CA29)', () => {
  const cases = [
    { subtotal: '470.00', vat: '98.70' },
    { subtotal: '108.00', vat: '20.52' },
  ]

  it.each(
    cases.flatMap((amounts) => ['1.0829', '0.8571', '1.005'].map((rate) => ({ amounts, rate }))),
  )(
    'total = subtotal convertido + IVA convertido ($amounts.subtotal, tipo $rate)',
    ({ amounts, rate }) => {
      const result = convertBreakdown(amounts, rate)
      expect(result.subtotal).toBe(convertAmount(amounts.subtotal, rate))
      expect(result.vat).toBe(convertAmount(amounts.vat, rate))
      expect(result.total).toBe(addAmounts(result.subtotal, result.vat))
    },
  )

  it('con 470,00 / 98,70 y 1.0829 da 508,96 / 106,88 / 615,84', () => {
    expect(convertBreakdown({ subtotal: '470.00', vat: '98.70' }, '1.0829')).toEqual({
      subtotal: '508.96',
      vat: '106.88',
      total: '615.84',
    })
  })
})

describe('formatMoney', () => {
  it('formatea en es-ES con la divisa pedida', () => {
    const normalize = (text: string) => text.replace(/\s/g, ' ')
    expect(normalize(formatMoney('470.00', 'EUR'))).toBe('470,00 €')
    expect(normalize(formatMoney('98.70', 'EUR'))).toBe('98,70 €')
    expect(formatMoney('1234.50', 'USD')).toContain('1234,50')
  })
})
