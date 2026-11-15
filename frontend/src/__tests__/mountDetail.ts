import { vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CustomerDetailView from '@/views/CustomerDetailView.vue'
import type { Customer } from '@/types/customer'
import { makeCustomer } from './helpers'

/** Cliente del CA1. */
export const ACME: Customer = makeCustomer({
  id: 1,
  name: 'Acme S.L.',
  country: 'ES',
  tax_id: '12345678Z',
  email: 'ventas@acme.com',
  plan: 'business',
})

/** Monta el detalle y deja pasar las promesas ya resueltas (con temporizadores simulados). */
export async function mountDetail(customer: Customer = ACME): Promise<VueWrapper> {
  const wrapper = mount(CustomerDetailView, { props: { customer } })
  await settle()
  return wrapper
}

export async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms)
}

export const normalize = (text: string) => text.replace(/\s/g, ' ')

export function amountsText(wrapper: VueWrapper) {
  const read = (id: string) =>
    wrapper.find(`[data-testid="${id}"]`).exists()
      ? normalize(wrapper.get(`[data-testid="${id}"]`).text())
      : null
  return { subtotal: read('subtotal'), vat: read('vat'), total: read('total') }
}

export function buttonByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

export function saveButton(wrapper: VueWrapper) {
  return buttonByText(wrapper, 'Guardar simulación')!
}

/** Campo (input o select) asociado a una `<label>` por su texto. */
export function fieldByLabel(wrapper: VueWrapper, label: string) {
  const element = wrapper.findAll('label').find((l) => l.text() === label)
  if (!element) throw new Error(`Sin label «${label}»`)
  return wrapper.get(`[id="${element.attributes('for')}"]`)
}

export const slider = (wrapper: VueWrapper) => wrapper.get('input[type="range"]')
export const usersField = (wrapper: VueWrapper) =>
  fieldByLabel(wrapper, 'Número exacto de usuarios')

/** Elige una divisa en el selector y deja pasar las promesas. */
export async function choose(wrapper: VueWrapper, currency: 'EUR' | 'USD' | 'GBP') {
  await fieldByLabel(wrapper, 'Divisa').setValue(currency)
  await settle()
}

export const selected = (wrapper: VueWrapper) =>
  (fieldByLabel(wrapper, 'Divisa').element as HTMLSelectElement).value
