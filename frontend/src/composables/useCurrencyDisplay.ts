import { computed, ref, watch, type Ref } from 'vue'
import type { Amounts, Currency, PricePreview } from '@/types/simulation'
import { convertBreakdown, formatMoney } from '@/utils/currency'
import { useExchangeRates } from './useExchangeRates'

/**
 * Divisa elegida y importes que se muestran (R11 a R14). Cambiar de divisa no pide
 * el precio otra vez: se reutiliza el último `preview` en EUR y el tipo en memoria.
 */
export function useCurrencyDisplay(preview: Ref<PricePreview | null>) {
  const { rates, status, ensureRates, retry, forgetFailure } = useExchangeRates()
  const currency = ref<Currency>('EUR')

  forgetFailure()

  watch(currency, (value) => {
    if (value !== 'EUR') void ensureRates()
  })

  /** Divisa en la que se ven los importes: EUR mientras no haya un tipo válido. */
  const shownCurrency = computed<Currency>(() =>
    currency.value !== 'EUR' && rates.value !== null ? currency.value : 'EUR',
  )

  const shownAmounts = computed<Amounts | null>(() => {
    const current = preview.value
    if (current === null) return null
    const raw: Amounts =
      shownCurrency.value === 'EUR' || rates.value === null
        ? current
        : convertBreakdown(current, rates.value[shownCurrency.value])
    return {
      subtotal: formatMoney(raw.subtotal, shownCurrency.value),
      vat: formatMoney(raw.vat, shownCurrency.value),
      total: formatMoney(raw.total, shownCurrency.value),
    }
  })

  const ratesFailed = computed(() => currency.value !== 'EUR' && status.value === 'error')
  const ratesLoading = computed(() => currency.value !== 'EUR' && status.value === 'loading')

  return { currency, shownAmounts, ratesFailed, ratesLoading, retryRates: retry }
}
