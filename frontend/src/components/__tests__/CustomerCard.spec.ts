import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomerCard from '../CustomerCard.vue'
import CustomerCount from '../CustomerCount.vue'
import { makeCustomer } from '@/__tests__/helpers'

describe('CustomerCard', () => {
  it('CA12: muestra los cinco datos y el plan en español', () => {
    const wrapper = mount(CustomerCard, {
      props: { customer: makeCustomer({ plan: 'business' }) },
    })
    const text = wrapper.text()
    expect(text).toContain('Acme S.L.')
    expect(text).toContain('España')
    expect(text).toContain('ES')
    expect(text).toContain('12345678Z')
    expect(text).toContain('ventas@acme.com')
    expect(text).toContain('Business')
    expect(text).not.toContain('business')
  })

  it.each([
    ['starter', 'Starter'],
    ['enterprise', 'Enterprise'],
  ] as const)('CA12: plan %s se ve como %s', (plan, label) => {
    const wrapper = mount(CustomerCard, { props: { customer: makeCustomer({ plan }) } })
    expect(wrapper.text()).toContain(label)
  })

  it('no muestra importes ni simulaciones', () => {
    const wrapper = mount(CustomerCard, { props: { customer: makeCustomer() } })
    expect(wrapper.text()).not.toMatch(/€|\$|£|simulaci/i)
  })

  it('CA13: el clic emite select con el cliente', async () => {
    const customer = makeCustomer()
    const wrapper = mount(CustomerCard, { props: { customer } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[customer]])
  })

  it.each(['keydown.enter', 'keydown.space'])('CA13: con foco, %s abre el cliente', async (key) => {
    const customer = makeCustomer()
    const wrapper = mount(CustomerCard, { props: { customer } })
    await wrapper.trigger(key)
    expect(wrapper.emitted('select')).toEqual([[customer]])
  })

  it('CA15: se alcanza con el teclado y tiene nombre accesible', () => {
    const wrapper = mount(CustomerCard, { props: { customer: makeCustomer() } })
    expect(wrapper.attributes('tabindex')).toBe('0')
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('aria-label')).toBe('Abrir Acme S.L.')
  })
})

describe('CustomerCount', () => {
  it.each([
    [0, '0 clientes'],
    [1, '1 cliente'],
    [2, '2 clientes'],
    [3, '3 clientes'],
  ])('CA10, CA11: %i se ve como «%s»', (count, text) => {
    const wrapper = mount(CustomerCount, { props: { count } })
    expect(wrapper.text()).toBe(text)
  })
})
