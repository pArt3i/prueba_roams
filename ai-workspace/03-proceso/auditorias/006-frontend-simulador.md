# Auditoría · Frontend del detalle del cliente, simulador e historial (spec 004) y cierre de H1 (spec 003)
Veredicto: APROBADO
Spec revisada: ai-workspace/01-specs/004-frontend-detalle-simulador.md (Estado: Aprobada)
Otros documentos de referencia: ai-workspace/02-arquitectura/005-planes-informativos.md, ai-workspace/02-arquitectura/007-divisas.md, la skill `.claude/skills/convenciones-frontend`, la skill `reglas-negocio` y el informe anterior ai-workspace/03-proceso/auditorias/005-frontend-clientes.md.

Resumen: R1 a R19 y CA1 a CA37 se cumplen. CA38 (comprobación visual a 375 px) queda pendiente de Pablo: no puedo abrir un navegador ni arrancar servidores. No hay hallazgos de gravedad alta ni media. Hay 9 hallazgos bajos o informativos (H10 a H18), ninguno bloquea. H1 de la spec 003 queda CERRADO (ver la sección «Actualización de la auditoría 005»). Los 243 tests pasan en 20 archivos y type-check y lint salen limpios.

Alcance auditado, todo bajo `frontend/src/`:
- Vistas: `App.vue` (modificado), `views/CustomerDetailView.vue`, `views/CustomersView.vue` (alta reorganizada). `CustomerDetailPlaceholder.vue` está borrado.
- Componentes nuevos: `CurrencySelect`, `CustomerProfile`, `PriceBreakdown`, `SimulationHistory`, `SimulatorPanel`, `UsageFields` y `UsersInput`. También `CustomerForm.vue`.
- Composables: `usePricing`, `useExchangeRates`, `useCurrencyDisplay`, `useSaveSimulation`, `useSimulationHistory`, `useUsageFields` y `useCreateCustomer`.
- Servicios: `simulationsService.ts`, `exchangeService.ts` y `apiError.ts`.
- Otros: `utils/currency.ts`, `utils/format.ts`, `types/simulation.ts`, `constants/customerOptions.ts` y `assets/main.css`.
- Tests: los 20 archivos de test y los helpers `__tests__/detailHelpers.ts`, `__tests__/mountDetail.ts` y `__tests__/helpers.ts`.
- Dependencias: `package.json` y `package-lock.json` sin cambios (sin diff).

## Actualización de la auditoría 005: estado de H1 (spec 003)
**H1 queda CERRADO.** El informe 005 sigue diciendo «abierto» y cita `CustomerForm.vue:17-20, 70-73` y `CustomersView.vue:40,45`; esas líneas ya no existen. El arreglo está en el commit 2e6381a (`git diff HEAD` de estos archivos está vacío), pero el informe 005 se guardó con el estado anterior.

Evidencia del cierre:
- **Código.** El estado del alta vive en la vista: `CustomersView.vue:19` crea `useCreateCustomer()` y `CustomersView.vue:39-47` hace `await create.submit()`.
  - Con 201: cierra el panel, pone «Cliente creado.» y llama a `resetSearch()`.
  - Con fallo y el panel ya cerrado: `create.reset()`, sin mostrar nada.
  - `CustomerForm.vue:6-10` recibe `create` como prop y ya no emite `created` desde un componente que puede desmontarse. La promesa vive en la vista, que no se desmonta al cancelar.
- **Tests** (`views/__tests__/CustomersViewCreate.spec.ts`, 7 tests, todos en verde):
  - `:109-126` «H1: cancelar con el alta en curso y 201». Envía con la respuesta sin resolver y comprueba que el botón de envío está `disabled`. Pulsa «Cancelar» y resuelve con 201. Comprueba que la última URL es `/customers` sin `q`, que `[role="status"]` dice «Cliente creado.», que hay 4 tarjetas y que el formulario no existe.
  - `:128-143` lo mismo cerrando con el botón «Nuevo cliente».
  - `:145-165` con 409 tras cancelar: no se muestra nada, hay 3 tarjetas y 2 llamadas a `fetch`, y al reabrir el panel no hay `role="alert"` y el email está vacío.
  - Si el envío siguiera en el formulario desmontado, las aserciones de aviso y de 4 tarjetas fallarían. Son tests con sentido.
- **Residuo menor**: caso de reabrir el panel mientras sigue el envío, ver H13 (bajo). No reabre H1.

Estado de los demás hallazgos del informe 005: H2 a H7 y H9 siguen como estaban (sus archivos no se han tocado: `CustomerCard.vue`, `LoadingState.vue`, `CustomerCount.vue`, `customersService.ts`, `useCustomers.ts`). H8 queda parcialmente resuelto: ya existe el test de «cancelar mientras se envía». Siguen sin test el caso «2 de 5» de CA10 y el uso de temporizadores simulados en `CustomersViewCreate.spec.ts`. Todos eran de gravedad baja o informativa.

## Criterios de aceptación
| CA | Estado | Evidencia |
| --- | --- | --- |
| CA1 | Cumplido | `CustomerDetailView.spec.ts:38-56`. Comprueba los cinco datos (incluido «Business» y «Informativo: no cambia el precio.»), `h2#simulator-title`, `h2#history-title` y el botón «Volver a clientes». Las URLs pedidas son exactamente `preview` y el historial, y no `/customers/1`. `back` se emite. |
| CA2 | Cumplido | `CustomerDetailView.spec.ts:58-72`. Solo hay un `select` (la divisa) y ninguna `label` «Plan» ni «País». El cuerpo inicial de `preview` es exactamente `{users:1,country:'ES'}`, y con `DE` lleva `DE`. `usePricing.spec.ts:26-32` lo repite. |
| CA3 | Cumplido | `CustomerDetailView.spec.ts:74-84`. Slider con `min=1`, `max=200`, `step=1` y valor 1, campo en 1. Ambos tienen `aria-label` y `label[for=id]`. `UsersInput.vue:18-29,32-46`. El test comprueba `aria-label` solo como «no vacío» (ver H16). |
| CA4 | Cumplido | `CustomerDetailView.spec.ts:86-112`. Slider 150 da campo 150. Campo 80 da slider 80. Campo 500 da slider 200, campo 500 y la última llamada con `users:500`. También 200, 201 y 10000. Lógica en `usePricing.ts:97`. |
| CA5 | Cumplido | `SimulatorUsers.spec.ts:33-48` con `0`, `10001`, vacío y `1.5`. Sin llamadas nuevas, el mensaje aparece una sola vez y «Guardar» está `disabled`. `usePricing.spec.ts:36-54` cubre también `-3` y `abc`, y comprueba que 10000 es válido. |
| CA6 | Cumplido | Mismo `describe.each`: sin subtotal, IVA ni total, y sin «Calculando». `SimulatorUsers.spec.ts:50-68`: una respuesta lenta que llega tras `0` no reaparece, y al volver a `60` se calcula de nuevo. Composable: `usePricing.spec.ts:56-85`. |
| CA7 | Cumplido | `SimulatorUsers.spec.ts:70-83` (slider y campo mezclados, 1 sola llamada con 90 y `ES`). `usePricing.spec.ts:105-125` (incluye «escribir 10001 y corregir a 100»). Temporizadores simulados. |
| CA8 | Cumplido | `SimulatorUsers.spec.ts:85-102` y `usePricing.spec.ts:147-175`. La de 100 llega después y se queda la de 60. Hay también un test de que la petición anterior se aborta con `AbortController`. Si se quitara la guarda `controller !== current` (`usePricing.ts:74,78`), el test fallaría, porque el mock de `fetch` ignora la señal. |
| CA9 | Cumplido | `CustomerDetailView.spec.ts:113-120` y `usePricingStates.spec.ts:26-35`. Con «Calculando…» el total anterior (568,70 €) sigue visible. `PriceBreakdown.vue:18,35`. |
| CA10 | Cumplido | `CustomerDetailView.spec.ts:122-135`. Desactivado a los 299 ms, a los 300 ms y con el cálculo en curso. Activo solo al llegar la respuesta. `usePricingStates.spec.ts:37-52` lo repite en el composable. |
| CA11 | Cumplido | `CustomerDetailView.spec.ts:137-145`. Cambia almacenamiento y llamadas, avanza 600 ms y sigue habiendo una sola llamada a `preview` con el desglose igual. |
| CA12 | Cumplido | `SimulatorFields.spec.ts:29-72`. `-1`, `1.5`, vacío, `1000001` y `1000000001` dan el mensaje exacto de la spec 002 y «Guardar» desactivado. `0` y los máximos son válidos. Valor inicial 0. |
| CA13 | Cumplido | `CustomerDetailView.spec.ts:147-154`: `470,00 €`, `98,70 €` y `568,70 €` (es-ES). `currency.ts:53-57`. |
| CA14 | Cumplido | `SimulatorFields.spec.ts:75-95` (un caso para red y otro para 5xx): mensaje, «Reintentar», «Guardar» desactivado, y el siguiente cambio válido calcula. El composable usa el texto propio (`usePricingStates.spec.ts:56-67`). |
| CA15 | Cumplido | `SimulatorFields.spec.ts:97-128` (repite con el valor y el país, limpia al responder bien, y si falla de nuevo mensaje y botón siguen con 2 llamadas tras 10 s; con usuarios inválidos se ocultan). `usePricingStates.spec.ts:69-99`. Red y 5xx tienen cada uno su test. |
| CA16 | Cumplido | `SimulatorFields.spec.ts:130-143` y `usePricingStates.spec.ts:101-113`. Con espera pendiente, «Reintentar» hace 1 sola llamada con `users:33` y `ES`, y no hay segunda al avanzar 1000 ms. `usePricing.ts:48-55,65-71`: `calculate()` llama a `cancelPending()`, que hace `clearTimeout`. |
| CA17 | Cumplido | `SimulatorFields.spec.ts:145-178`. 422 con `detail`: se ve, sin «Reintentar», «Guardar» desactivado, y el siguiente cambio calcula. Un «Reintentar» que devuelve 422 muestra el mensaje y quita el botón. 422 sin `detail` de texto: fallo de red con botón. `usePricing.ts:57-63`. |
| CA18 | Cumplido | `SimulatorSave.spec.ts:43-65`: el cuerpo es exactamente `{customer_id,users,storage_gb,api_calls}`. Con 201 se ve «Simulación guardada.» en `role="status"` y hay 2 llamadas al historial. `useSaveSimulation.spec.ts:42-53`: aunque se le pasen `plan`, `country` y `total` de más, las claves enviadas son solo las 4. `useSaveSimulation.ts:24-29` construye el objeto campo a campo. |
| CA19 | Cumplido | `SimulatorSave.spec.ts:75-117`: desactivado con cálculo en curso, tras un fallo, con usuarios, almacenamiento o llamadas inválidos, y mientras se guarda. Dos clics seguidos (`trigger` sin esperar) hacen 1 sola llamada. Doble protección: `SimulatorPanel.vue:24,30` y `useSaveSimulation.ts:19`. `useSaveSimulation.spec.ts:55-67` lo comprueba en el composable. |
| CA20 | Cumplido | `SimulatorSave.spec.ts:119-150` con `it.each` para 404, 422, red y 422 sin `detail`. El mensaje sale en `role="alert"`, no aparece «guardada», el historial se pide solo 1 vez y el botón vuelve a estar activo. `SimulatorSave.spec.ts:152-160`: guardado correcto con fallo al recargar muestra el aviso y el error del historial. |
| CA21 | Cumplido | `SimulationHistory.spec.ts:49-79`: cada fila con fecha, usuarios, almacenamiento, llamadas, subtotal, IVA y total en EUR, la nota «Importes en EUR», y respeta el orden aunque no sea cronológico (no hay `sort` en `SimulationHistory.vue`). `SimulatorCurrency.spec.ts:96-103`: elegir USD no cambia el `tbody`. |
| CA22 | Cumplido | `SimulationHistory.spec.ts:81-90` con `process.env.TZ`: `UTC` da «15/11/2026, 10:00» y `Europe/Madrid` da «15/11/2026, 11:00», sin segundos. Pasa en ambas zonas, así que el test es real. `format.ts:2-13`. El backend manda `created_at` con `Z` (`backend/app/clock.py:27`). |
| CA23 | Cumplido | `SimulationHistory.spec.ts:92-155`: «Cargando historial…», el error con «Reintentar» (2 llamadas al pulsarlo) y «Aún no hay simulaciones.». `useSimulationHistory.spec.ts` cubre composable, orden de la API, 5xx, reintentos y respuestas antiguas. |
| CA24 | Cumplido | `SimulatorCurrency.spec.ts:32-37` y `useExchangeRates.spec.ts:22-27`. EUR por defecto, 0 llamadas de tipo y `568,70 €`. |
| CA25 | Cumplido | `SimulatorCurrency.spec.ts:39-48` (USD, GBP, USD, EUR, USD: 1 petición de tipos y 1 de precio). `useExchangeRates.spec.ts:29-47` (llamadas repetidas y en curso: 1 sola). |
| CA26 | Cumplido | `App.spec.ts:63-83` pasa por la lista real: el tipo se pide una vez, y tras volver y abrir otro cliente este empieza en EUR y GBP no repite la petición. `SimulatorCurrency.spec.ts:105-121` lo comprueba con un `fetch` que devolvería otro tipo (9, 9) y se usa el de memoria. Estado a nivel de módulo en `useExchangeRates.ts:13-14`. |
| CA27 | Cumplido | `SimulatorCurrency.spec.ts:50-58`: USD con 1.0829 muestra 508,96, 106,88 y 615,84, y no 615,85. |
| CA28 | Cumplido | `currency.spec.ts:4-39`: 470.00, 98.70 y 568.70 × 1.0829 dan `508.96`, `106.88` y `615.85`. `1.00 × 1.005` da `1.01` y `0.03 × 1.5` da `0.05`. También `0.01 × 0.5` da `0.01` y `0.01 × 0.49` da `0.00`. Comprobé a mano el algoritmo (`currency.ts:23-32`, `floor((2·n + d) / 2d)` con `BigInt`) y es ROUND_HALF_UP correcto para positivos. |
| CA29 | Cumplido | `currency.spec.ts:41-66` (2 desgloses × 3 tipos). `SimulatorCurrency.spec.ts:68-94` es el test fuerte: lee los textos mostrados y comprueba que subtotal + IVA = total en USD y GBP para tres pares de tipos, con el desglose de ES y el de DE. |
| CA30 | Cumplido | `useExchangeRates.spec.ts:58-97` y `SimulatorRatesErrors.spec.ts:39-76`. A los 4999 ms no hay aviso y a los 5000 ms sí, con importes en EUR, «Reintentar» y el selector en USD. Con EUR no hay aviso. Una respuesta tardía se ignora y no se guarda. Falla también con red y con 500. `useExchangeRates.ts:34-38`. |
| CA31 | Cumplido | `SimulatorRatesErrors.spec.ts:78-114` y `useExchangeRates.spec.ts:99-124`. USD o GBP ausente, `"abc"`, `null`, `0` y `-1`, uno por caso. Aviso, EUR, `rates` null en memoria y «Reintentar» corrige. |
| CA32 | Cumplido | Mismos archivos. `result:"error"` con tipos válidos, USD válido con GBP inválido y al revés: la divisa elegida es la del tipo válido y el aviso sale igualmente. `exchangeService.ts:19-26`. Tras «Reintentar» con una respuesta correcta se ven los importes convertidos. |
| CA33 | Cumplido | `SimulatorRatesErrors.spec.ts:116-138`. Responde bien: sale 615,84 y desaparece el aviso. Falla: el aviso y el botón siguen, con 2 llamadas tras 30 s (sin reintento automático). |
| CA34 | Cumplido | `useExchangeRates.spec.ts:133-142`. El cuerpo se escribe como texto JSON con números reales (`1.0829` y `1.005`) y los textos guardados son exactamente `"1.0829"` y `"1.005"`. `exchangeService.ts:9-13`. |
| CA35 | Cumplido | `1e-7`, `0.0000001` y `1e21` en `useExchangeRates.spec.ts:110-112` y `SimulatorRatesErrors.spec.ts:91-93` (un test por valor). Fallo completo y nada en memoria. `exchangeService.ts:12`. |
| CA36 | Cumplido | Existen tests Vitest de `usePricing` (18 + 10), tipo de cambio (25), conversión (15), guardado (8) e historial (6, más `SimulationHistory.spec.ts`), con los CA que enumera la spec. |
| CA37 | Cumplido (auditor) | Ver «Comprobaciones pedidas». Sin fórmulas de tramos ni IVA, la aritmética de dinero está solo en `utils/currency.ts` con `BigInt`, el tipo sale de `String(n)`, sin `response.text()` ni `reviver`, y sin dependencias nuevas. |
| CA38 | Pendiente (visual, de Pablo) | No verificable por mí. Revisión estática favorable: `min-width:0` y `overflow-wrap:anywhere` en ficha y filas; historial en móvil con cada fila como bloque etiquetado, sin tabla ancha (`SimulationHistory.vue:69-99`); rejillas con `minmax(0,1fr)`; foco global `:focus-visible` de 3 px en `#1d4ed8` (`main.css:47-51`). Hay que comprobarlo a 375 px y en escritorio, y con foco en slider, campos y botones. Puntos a mirar: H12 (contraste durante el cálculo) y que el historial móvil (`display:grid` sobre `tr`) siga siendo legible por un lector de pantalla en Safari. |

## Requisitos de la spec
| R | Estado | Evidencia |
| --- | --- | --- |
| R1 | Cumplido | `CustomerDetailView.vue:19-30`: botón «Volver a clientes», `CustomerProfile`, `SimulatorPanel` y `SimulationHistory`, en ese orden. Usa el cliente recibido por prop (`:10`) y no pide `GET /customers/{id}` (CA1). |
| R2 | Cumplido | El plan solo se pinta en `CustomerProfile.vue:28-34` con `planLabel` (ADR 005: Starter, Business, Enterprise). Ni `PreviewRequest` ni `SimulationDraft` (`types/simulation.ts:14-33`) contienen `plan`. |
| R3 | Cumplido | `SimulatorPanel.vue:17` pasa `props.customer.country` a `usePricing`. No hay control de país en el simulador. |
| R4 | Cumplido | `usePricing.ts:87-103` mantiene `usersInput` y `sliderValue` (tope 200, el campo conserva su texto). `UsersInput.vue`: `<label>`, `aria-label` y foco global. |
| R5 | Cumplido | `usePricing.ts:91-96`: con valor inválido cancela la espera y la petición, pone `preview` y `failure` a `null` y no pide. Una respuesta tardía se descarta porque `controller` pasa a `null` (`:48-55`). «Guardar» se desactiva (`canSave`). Matiz en H17. |
| R6 | Cumplido | `useUsageFields.ts`: enteros de 0 a 1.000.000 y de 0 a 1.000.000.000, valor inicial `'0'`, mensajes de la spec 002. No disparan `preview` (CA11). |
| R7 | Cumplido | `usePricing.ts:73`: `previewPrice({ users, country })`, y `simulationsService.ts:19` envía ese objeto tal cual. Espera de 300 ms (`:99-102`). `start()` al montar (`SimulatorPanel.vue:35`). Respuestas antiguas descartadas por identidad del `AbortController`. |
| R8 | Cumplido | «Calculando…» con `aria-busy` y el desglose atenuado, pero visible (`PriceBreakdown.vue:17-35`). «Reintentar» solo con `retryable` (red, 5xx o 422 sin texto), nunca con 422 o 404 con `detail`. Sin reintentos automáticos. |
| R9 | Cumplido | `SimulatorPanel.vue:24` combina `pricing.canSave` (sin espera, sin cálculo, sin fallo y con precio), campos válidos y `!saving`. Cuerpo de 4 campos. «Simulación guardada.» en `role="status"` siempre presente (`:71`) y errores en `role="alert"`. Solo emite `saved`, y recarga el historial, con 201 (`:31-32`). |
| R10 | Cumplido | `useSimulationHistory.ts` (carga al montar y tras guardar, sin reordenar). `SimulationHistory.vue`: los cuatro estados, la nota «Importes en EUR» y la fecha con `Intl.DateTimeFormat('es-ES')`. |
| R11 | Cumplido | `useCurrencyDisplay.ts:25-37` calcula desde el último `preview` en EUR y el tipo en memoria. Cambiar de divisa no pide el precio (`SimulatorCurrency.spec.ts:46-47`). |
| R12 | Cumplido | `useExchangeRates.ts`: estado a nivel de módulo; se pide al elegir USD o GBP (`useCurrencyDisplay.ts:16-18`); una sola petición para ambos tipos; un fallo no se guarda y `forgetFailure()` (`:67-69`) lo olvida al abrir otro detalle. |
| R13 | Cumplido | 5 s con `setTimeout` más `AbortController` (`useExchangeRates.ts:34-38`). Validación estricta en `exchangeService.ts:9-26`: `result==='success'`, `typeof number`, finito, mayor que 0 y sin «e»; un tipo inválido invalida toda la respuesta. Aviso con «Reintentar» (`PriceBreakdown.vue:27-30`), solo si la divisa no es EUR (`useCurrencyDisplay.ts:39`). Selector sin tocar. |
| R14 | Cumplido | `currency.ts:43-50`: subtotal e IVA convertidos por separado y total = `addAmounts(subtotal, vat)`. En EUR se muestra el total de la API sin tocar. |
| R15 | Cumplido | Importes a céntimos con `BigInt` (`currency.ts:9-13`) y redondeo entero (`:31`). Tipo con `String(n)` (`exchangeService.ts:11`); el texto con «e» es inválido. Sin `response.text()` ni `reviver` (usa `response.json()`). Función `convertAmount` en `src/utils/currency.ts`. Visualización con `Intl.NumberFormat('es-ES')` (matiz en H11). |
| R16 | Cumplido (visual pendiente) | Bloques con cargando, error y datos (historial también vacío); textos en español. El diseño móvil queda a CA38. |
| R17 | Cumplido | Tipos en `types/simulation.ts` (sin `any`). `fetch` solo en `services/` (comprobado con grep). Composables `usePricing`, `useExchangeRates`, `useSaveSimulation` y `useSimulationHistory`. Conversión en `utils/currency.ts`. |
| R18 | Cumplido | Ver CA37. |
| R19 | Cumplido | `usePricing.ts:57-63` y `useSaveSimulation.ts:32-36`: 404 o 422 con `detail` de texto muestran ese texto; el resto (red, 5xx o 422 sin `detail`) usa el texto propio. `apiError.ts:20` solo acepta `detail` de texto no vacío. En `preview` el fallo del 422 sin texto lleva «Reintentar». |

## Comprobaciones pedidas
- **Fórmulas de tramos e IVA (CA37).** Grep en `src/` sin tests: no hay tipos de IVA (`0.21`, `0.19`, `0.23`), ni tramos, ni `tier`. `vat_rate` solo aparece en los tipos TypeScript. `IVA` solo aparece como etiqueta de columna o fila.
- **Aritmética de dinero.** Solo `utils/currency.ts` (`BigInt`, enteros). `Number()` aparece una vez, en `format.ts:23`, sobre el texto de un campo de usuarios o de almacenamiento ya validado con `/^\d+$/`, no sobre importes. `Math.min` aparece una vez (`usePricing.ts:97`, posición del slider). Sin `parseFloat`, `toFixed`, `float`, `response.text()` ni `reviver`. `addAmounts` y `convertBreakdown` amplían `convertAmount` en el mismo archivo y son la «suma» que exige R14.
- **Conversión por partes y total como suma.** `currency.ts:43-50`, con CA27, CA28 y CA29. El test de la vista lee los textos mostrados, así que detectaría convertir el total aparte.
- **Descarte de respuestas antiguas y cancelación de los 300 ms.** `usePricing.ts:48-55,74,78,87-103,111`. En el historial, `useSimulationHistory.ts:14-27`. En los tipos de cambio, el contador `attempt` (`useExchangeRates.ts:20-25,35,41,46`). Cubierto por tests reales.
- **«Guardar» desactivado y sin doble envío.** Ver CA19: cálculo en curso, 300 ms de espera, fallo (red, 5xx o 422), campo inválido y guardado en curso. La guarda es síncrona (`saving` antes del `await`).
- **Tipo de cambio una vez y conservación.** Estado a nivel de módulo; un test pasa por la lista real (`App.spec.ts:63-83`).
- **5 s y validación estricta.** Ver CA30 a CA35. Además verifiqué con una petición real de solo lectura el formato de la API (ver H18).
- **Lo enviado a `POST /simulations`.** Solo `customer_id`, `users`, `storage_gb` y `api_calls`, construido campo a campo (`useSaveSimulation.ts:24-29`). `preview` envía solo `users` y `country`.
- **Tamaño.** Líneas reales (con `awk 'END{print NR}'`): el mayor archivo de código es `SimulationHistory.vue` con 139 líneas (incluido su CSS), y `main.css` tiene 169. El mayor test es `CustomerForm.spec.ts` con 186 y el siguiente `CustomersView.spec.ts` con 182. Ninguno pasa de 200.
- **`any` y secretos.** Cero `any`, `@ts-ignore` y `eslint-disable` en `src/`, tests incluidos. Única aserción de tipo fuera de lo normal: `currency.ts:56` (H11). Sin coincidencias de `secret`, `key`, `token`, `password` ni `bearer`. No hay `.env` (solo `.env.example`). La URL de la API de divisas es pública y fija (ADR 007).
- **Dependencias.** `package.json` y `package-lock.json` sin diff. Sin librería decimal: se usa `BigInt`.
- **Tests con sentido.** Sin `it.skip`, `.only` ni `.todo`. Los tests de carrera (CA6, CA8, CA16, CA19, CA30) usan promesas diferidas y temporizadores simulados y fallarían si se quitara la guarda correspondiente. Los de redondeo usan los valores de la spec. El de zona horaria cambia `TZ` y da resultados distintos.

## Hallazgos
La numeración continúa la del informe 005 (H1 a H9).

| # | Gravedad | Archivo:línea | Problema | Arreglo sugerido |
| --- | --- | --- | --- | --- |
| H10 | Baja | `components/UsersInput.vue:32-33,43` y `components/UsageFields.vue:24,39` | El campo numérico tiene `<label>` «Número exacto de usuarios» pero `aria-label` «Número de usuarios (de 1 a 10000)». El `aria-label` sustituye al nombre visible y no contiene su texto (WCAG 2.5.3, etiqueta en el nombre): quien use dictado por voz no puede decir lo que ve. Los errores de almacenamiento y llamadas (`role="alert"`) no se enlazan con `aria-describedby` (solo la ayuda). | Que el `aria-label` empiece por el texto visible («Número exacto de usuarios, de 1 a 10000»). Añadir el id del error a `aria-describedby` en `UsageFields`. |
| H11 | Baja | `utils/currency.ts:56` | `formatter.format(amount as unknown as number)` miente al sistema de tipos para pasar un texto a `Intl.NumberFormat`. Funciona en navegadores modernos (la lectura exacta del texto decimal existe desde Chrome 106, Firefox 116 y Safari 15.4). En uno más antiguo el texto pasaría por `Number` y se formatearía con coma flotante (solo en pantalla, sin cambiar el dato). Un test del formato (`currency.spec.ts:68-75`) solo usa valores simples. | Documentar la versión mínima de navegador o añadir un test con 17 o más cifras significativas. Opcional: formatear partiendo del texto (parte entera y céntimos) sin `Intl` para el dato. |
| H12 | Baja | `components/PriceBreakdown.vue:77-79` | Mientras se calcula, el desglose anterior se atenúa con `opacity: 0.55`. Calculé el contraste efectivo del total (`--accent-strong` sobre `--accent-tint`, mezclados con el blanco de la tarjeta) en unos 2,5:1, por debajo del 3:1 de texto grande y del 4,5:1 del texto normal. Es un estado transitorio y R8 pide que el importe siga visible, pero «contraste suficiente» (R16, CA38) se queda justo. | Subir la opacidad (por ejemplo 0,75) o atenuar solo el color manteniendo 4,5:1. Que Pablo lo vea en la comprobación visual. |
| H13 | Baja | `views/CustomersView.vue:27-30,39-47` y `composables/useCreateCustomer.ts:18-21,30` | Residuo de la corrección de H1: si se cancela con el alta en curso y se vuelve a abrir el panel antes de que responda, el botón de envío de ese nuevo panel sale desactivado («Creando…») hasta que llega la respuesta. Con 201, `submit()` llama a `reset()` y la vista cierra el panel, y se pierde lo que se hubiera escrito. Con fallo, el error del intento anterior aparece en el panel nuevo. Sin test. Caso raro y sin pérdida de datos del servidor. | Opcional: no permitir reabrir el panel mientras `create.submitting` sea `true`, o separar el estado del envío del estado del formulario. Añadir un test. |
| H14 | Baja | `components/PriceBreakdown.vue:18,31-33` y `components/SimulationHistory.vue:16` | «Calculando…», «Obteniendo el tipo de cambio…» y «Cargando historial…» son `role="status"` insertados con `v-if` y ya rellenos. Las regiones vivas que aparecen con su texto puesto se anuncian de forma poco fiable (mismo patrón que H3 del informe 005). La región de «Simulación guardada.» sí es correcta (siempre presente). | Contenedor `role="status"` siempre presente con el texto dentro, o `aria-live` sobre un contenedor fijo. |
| H15 | Baja | `services/simulationsService.ts:21,28,38`, `utils/currency.ts:11,26`, `composables/useCurrencyDisplay.ts:25-37` | Las respuestas de `preview`, el guardado y el historial se tipan con `as` sin validar en ejecución (a diferencia de los tipos de cambio, que sí se validan). Si el backend mandara un importe mal formado, `toCents` lanzaría `RangeError` dentro del `computed` `shownAmounts` y la vista del detalle se rompería, en vez de mostrar el fallo del cálculo. Solo ocurre si se viola el contrato de la spec 002 (que el backend cumple y tiene tests). | Opcional: validar el formato `^\d+\.\d{2}$` en `previewPrice` y tratarlo como fallo con «Reintentar». |
| H16 | Baja (tests) | `views/__tests__/CustomerDetailView.spec.ts:80-83`, `views/__tests__/SimulatorRatesErrors.spec.ts:106-109`, `__tests__/App.spec.ts:63-83` | Huecos menores: (a) CA3 comprueba que el `aria-label` es «no vacío», no su valor. (b) En CA32 de la vista, `rateCalls()` se lee tras volver a crear el `fetch` simulado, así que solo cuenta el reintento y no la petición inicial (el composable sí lo cubre). (c) `App.spec.ts` solo llama a `resetExchangeRates()` al final del CA26 y no en `afterEach`: si el test fallara a mitad, el tipo en memoria contaminaría a otros. (d) No hay test del caso «backend caído al abrir la vista» con error de cálculo y de historial a la vez, ni de que el desmontaje cancela la espera y las peticiones (`onScopeDispose`). | Añadir esos tests y mover `resetExchangeRates()` a `afterEach` de `App.spec.ts`. |
| H17 | Baja | `components/PriceBreakdown.vue:27-33`, `composables/useCurrencyDisplay.ts:39-40` | R5 y CA6 piden que con usuarios inválidos «se vea solo» el mensaje del campo. El aviso del tipo de cambio («No se pudo obtener…», con su «Reintentar») y «Obteniendo el tipo de cambio…» siguen visibles si la divisa es USD o GBP y los usuarios son inválidos. La spec solo manda ocultar el indicador de carga y el fallo del cálculo, así que no es un incumplimiento, pero conviene confirmar la intención. «Obteniendo el tipo de cambio…» es un texto que no aparece en la tabla de Errores de la spec. | Pablo decide: dejarlo (se entiende como estado del tipo de cambio) u ocultarlo con usuarios inválidos. Si se deja, anotarlo en la spec. |
| H18 | Informativa | `services/exchangeService.ts:3-35`, ADR 007 | El ADR 007 dice que el formato de `open.er-api.com` «debe verificarse con una llamada real». Lo verifiqué con un GET de solo lectura (2026-11-15): HTTP 200, `result: "success"`, `rates.USD` = 1.103776 y `rates.GBP` = 0.834849 como números JSON, y `access-control-allow-origin: *`, así que el navegador puede llamar sin proxy. Los tests no tocan la red real. La respuesta incluye `terms_of_use` y `provider`; el ADR dice que los términos no se han revisado y puede exigirse atribución. Los tipos de ejemplo de los tests (1.0829) no son los reales, pero el formato coincide. | Pablo revisa los términos de uso y la atribución. Quedan anotados como verificados el formato y CORS. |

Tras revisar el estilo con Prettier (`npx prettier --check src/`, solo lectura) hay avisos de formato en `components/CustomerForm.vue` (línea en blanco antes de `</script>`, líneas 14-15) y `views/__tests__/CustomersViewCreate.spec.ts` (línea 153, de más de 100 caracteres). `npm run lint` no incluye Prettier y pasa limpio; son restos de la reorganización de H1. Se arreglan con `npm run format`. No los cuento como hallazgo aparte.

## Comandos ejecutados
Desde `C:\Users\pablo\Projects\saas-o-matic\frontend` (no se arrancó ningún servidor y no se modificó nada del proyecto):

```
npm run type-check          -> vue-tsc --build                      -> salida 0, sin errores
npm run lint                -> oxlint . --fix y eslint . --fix      -> salida 0, sin avisos
npm run test:unit -- --run  -> vitest --run                         -> 20 archivos de test, 243 tests pasados, 0 fallos (7,9 s)
npm run test:unit -- --run --reporter=verbose
                            -> mismo resultado (243 pasados), usado para contar tests por archivo; sin ningún "×", sin avisos de Vue ni de promesas sin capturar
npx prettier --check src/   -> 2 archivos con avisos de formato (CustomerForm.vue y CustomersViewCreate.spec.ts)
curl -sS https://open.er-api.com/v6/latest/EUR   -> GET de solo lectura, 200, formato y CORS verificados (H18)
```

Tests por archivo: App 4, CustomerCard 12, CustomerForm 11, SimulationHistory 10, useCreateCustomer 13, useCustomers 15, useExchangeRates 25, usePricing 18, usePricingStates 10, useSaveSimulation 8, useSimulationHistory 6, currency 15, CustomerDetailView 11, CustomersView 12, CustomersViewCreate 7, SimulatorCurrency 7, SimulatorFields 22, SimulatorRatesErrors 17, SimulatorSave 13 y SimulatorUsers 7.

Búsquedas estáticas (grep) sobre `frontend/src/`:
- `it.skip`, `.only`, `.todo`, `xit`: sin coincidencias.
- `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`: sin coincidencias. `as unknown as`: 1 (`currency.ts:56`).
- `parseFloat`, `toFixed`, `response.text`, `reviver`: sin coincidencias. `Number(`: 1 (`format.ts:23`). `Math.`: 1 (`usePricing.ts:97`).
- `fetch(`, `axios` y `XMLHttpRequest` fuera de `src/services/`: sin coincidencias (solo tests, que lo simulan).
- Tipos de IVA, `tramo` y `tier` fuera de tests: sin coincidencias.
- `secret`, `api key`, `token`, `password`, `bearer`: sin coincidencias.
- Recuento de líneas por archivo: máximo 186 (test) y 139 (código).
- `git status` antes y después de los comandos: 36 entradas, las mismas (el `npm run lint` del proyecto lleva `--fix`; no cambió ningún archivo rastreado).

## Pendiente fuera de la auditoría
- CA38 (Pablo): comprobar a 375 px que ficha, simulador e historial se ven sin scroll horizontal, que el foco se ve en slider, campos y botones, y el contraste durante el cálculo (H12). Después, marcar CA38 como cumplido. Lo mismo queda pendiente de CA16 de la spec 003.
- Pablo: revisar los términos de uso y la atribución de `open.er-api.com` (H18) y decidir H17.
- Actualizar el informe 005: H1 está cerrado (evidencia arriba). No se ha modificado el archivo; la sesión principal puede añadir una nota que remita a este informe.
- Recomendado, no bloqueante: H10 a H14 y H16 como mejoras; `npm run format` para los dos archivos con avisos de Prettier.
