import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import {
  SIMULATIONS_URL,
  bodyOf,
  callsTo,
  failNetwork,
  historyUrl,
  makeSimulation,
  routeFetch,
} from '@/__tests__/detailHelpers'
import { fieldByLabel, mountDetail, saveButton, settle, usersField } from '@/__tests__/mountDetail'
import { deferred, jsonResponse } from '@/__tests__/helpers'
import { resetExchangeRates } from '@/composables/useExchangeRates'

async function fill(wrapper: VueWrapper, users = '60') {
  await usersField(wrapper).setValue(users)
  await fieldByLabel(wrapper, 'Almacenamiento (GB)').setValue('100')
  await fieldByLabel(wrapper, 'Llamadas a la API').setValue('5000')
  await settle(300)
}

describe('simulador: guardado', () => {
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

  const saves = () => callsTo(fetchMock, SIMULATIONS_URL)
  const historyCalls = () => callsTo(fetchMock, historyUrl(1)).length
  const status = (wrapper: VueWrapper) => wrapper.findAll('[role="status"]').map((e) => e.text())
  const alerts = (wrapper: VueWrapper) => wrapper.findAll('[role="alert"]').map((e) => e.text())

  it('CA18: envía exactamente customer_id, users, storage_gb y api_calls', async () => {
    const wrapper = await mountDetail()
    await fill(wrapper)
    await saveButton(wrapper).trigger('click')
    await settle()
    expect(saves()).toHaveLength(1)
    expect(bodyOf(saves()[0])).toEqual({
      customer_id: 1,
      users: 60,
      storage_gb: 100,
      api_calls: 5000,
    })
  })

  it('CA18: con 201 se ve «Simulación guardada.» en un role=status y se recarga el historial', async () => {
    const wrapper = await mountDetail()
    expect(historyCalls()).toBe(1)
    await fill(wrapper)
    await saveButton(wrapper).trigger('click')
    await settle()
    expect(status(wrapper)).toContain('Simulación guardada.')
    expect(historyCalls()).toBe(2)
  })

  it.each(['1', '10000'])('se envía el valor del campo con %s usuarios', async (users) => {
    const wrapper = await mountDetail()
    await fill(wrapper, users)
    await saveButton(wrapper).trigger('click')
    await settle()
    expect((bodyOf(saves()[0]) as { users: number }).users).toBe(Number(users))
  })

  describe('CA19: cuándo está desactivado', () => {
    it('con un cálculo en curso', async () => {
      const wrapper = await mountDetail()
      fetchMock = routeFetch({ preview: () => deferred<Response>().promise })
      await usersField(wrapper).setValue('5')
      await settle(300)
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('con un cálculo fallido', async () => {
      fetchMock = routeFetch({ preview: () => failNetwork() })
      const wrapper = await mountDetail()
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('con un campo inválido (usuarios, almacenamiento o llamadas)', async () => {
      for (const set of [
        (w: VueWrapper) => usersField(w).setValue('0'),
        (w: VueWrapper) => fieldByLabel(w, 'Almacenamiento (GB)').setValue('-1'),
        (w: VueWrapper) => fieldByLabel(w, 'Llamadas a la API').setValue(''),
      ]) {
        const wrapper = await mountDetail()
        await set(wrapper)
        expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
      }
    })

    it('mientras se guarda, y dos clics seguidos hacen una sola llamada', async () => {
      const pending = deferred<Response>()
      fetchMock = routeFetch({ save: () => pending.promise })
      const wrapper = await mountDetail()
      const button = saveButton(wrapper)
      void button.trigger('click')
      void button.trigger('click')
      await settle()
      expect(saves()).toHaveLength(1)
      expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

      pending.resolve(jsonResponse(makeSimulation(), 201))
      await settle()
      expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    })
  })

  describe('CA20: errores al guardar', () => {
    it.each([
      [
        '404',
        () => jsonResponse({ detail: 'Cliente no encontrado.' }, 404),
        'Cliente no encontrado.',
      ],
      [
        '422',
        () => jsonResponse({ detail: 'Identificador de cliente no válido.' }, 422),
        'Identificador de cliente no válido.',
      ],
      ['red', () => failNetwork(), 'No se pudo guardar la simulación. Inténtalo de nuevo.'],
      [
        '422 sin detail',
        () => jsonResponse({ detail: [{ msg: 'x' }] }, 422),
        'No se pudo guardar la simulación. Inténtalo de nuevo.',
      ],
    ])(
      '%s: se ve el mensaje, no se recarga el historial y el botón vuelve a estar activo',
      async (_name, save, message) => {
        fetchMock = routeFetch({ save })
        const wrapper = await mountDetail()
        await saveButton(wrapper).trigger('click')
        await settle()
        expect(alerts(wrapper)).toContain(message)
        expect(status(wrapper)).not.toContain('Simulación guardada.')
        expect(historyCalls()).toBe(1)
        expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
      },
    )
  })

  it('guardado correcto con fallo al recargar el historial: aviso y error con «Reintentar»', async () => {
    const wrapper = await mountDetail()
    let calls = 0
    fetchMock = routeFetch({ history: () => (++calls === 1 ? failNetwork() : jsonResponse([])) })
    await saveButton(wrapper).trigger('click')
    await settle()
    expect(status(wrapper)).toContain('Simulación guardada.')
    expect(wrapper.text()).toContain('No se pudo cargar el historial. Inténtalo de nuevo.')
  })
})
