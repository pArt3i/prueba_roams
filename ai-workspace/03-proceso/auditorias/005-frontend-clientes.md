# Auditoría · Frontend de clientes (dashboard, buscador y alta)
Veredicto: APROBADO
Spec revisada: ai-workspace/01-specs/003-frontend-clientes.md (Estado: Aprobada)
Otros documentos de referencia: ai-workspace/02-arquitectura/005-planes-informativos.md y la skill `.claude/skills/convenciones-frontend`.

Resumen: R1 a R16 y los criterios de Vitest (CA1 a CA15, CA17 a CA23 y CA25) se cumplen. CA24 se cumple. CA16 queda pendiente de la comprobación visual de Pablo: no puedo abrir un navegador ni arrancar servidores. No hay hallazgos de gravedad alta. Hay 1 hallazgo medio y 7 bajos (ver Hallazgos). El medio, una condición de carrera al cancelar el alta mientras se envía, conviene arreglarlo antes de dar la funcionalidad por cerrada, pero no bloquea.

Alcance auditado, todo bajo `frontend/src/`:
- `App.vue`
- `views/CustomersView.vue` y `views/CustomerDetailPlaceholder.vue`
- `components/` (CustomerCard, CustomerCount, CustomerForm, CustomerGrid, EmptyState, ErrorState, LoadingState y SearchBox)
- `composables/useCustomers.ts` y `composables/useCreateCustomer.ts`
- `services/customersService.ts` y `services/apiError.ts`
- `types/customer.ts`
- `constants/customerOptions.ts`
- `assets/main.css`
- los 7 archivos de test y `__tests__/helpers.ts`
- `frontend/.env.example` e `index.html`

## Criterios de aceptación
| CA | Estado | Evidencia |
| --- | --- | --- |
| CA1 | Cumplido | `CustomersView.spec.ts` "CA1" comprueba 3 tarjetas (`article`) y una sola petición `GET /customers`. |
| CA2 | Cumplido | "CA2" usa un fetch que nunca resuelve, muestra «Cargando clientes…» y no hay tarjetas. `LoadingState.vue:2`. |
| CA3 | Cumplido | "CA3" lanza un fallo de red y muestra el mensaje con «Reintentar». Al pulsarlo hay 2 llamadas y se ven 3 tarjetas. `ErrorState.vue:7-8`. |
| CA4 | Cumplido | "CA4" muestra «Aún no hay clientes.» y no muestra «0 clientes». `CustomersView.vue:21-23`. |
| CA5 | Cumplido | "CA5" busca `'  zzz  '` y muestra «No hay clientes que coincidan con «zzz».» con el texto ya recortado (`term`). |
| CA6 | Cumplido | `useCustomers.spec.ts` comprueba que a los 299 ms no hay llamada y a los 300 ms sale `?q=` con texto recortado y `encodeURIComponent` (`&`, `%`, `_`, espacios). La vista lo repite con `acme%20%26%20co`. |
| CA7 | Cumplido | `it.each` con `''`, `'   '` y `'\t \n'` pide `/customers` sin `q`. La vista comprueba además que vuelven las 3 tarjetas. |
| CA8 | Cumplido | Composable y vista, con temporizadores simulados: pulsaciones cada 100 ms dan una sola llamada con el texto final. Un solo carácter (`'a'`) también busca. |
| CA9 | Cumplido | Composable y vista. La segunda respuesta llega antes y la primera después, y se queda la última. También se prueba que el error de una petición antigua no pisa el resultado. Si se quitara la guarda `controller !== current` (`useCustomers.ts:30,34`), los tests fallarían. |
| CA10 | Cumplido | Prueba de 3 clientes: «3 clientes». El contador usa `customers.length` (`CustomersView.vue:53`), es decir, los resultados mostrados. El caso «2 de 5» no tiene test propio (hallazgo H8, bajo). |
| CA11 | Cumplido | «1 cliente» en `CustomerCount` y en la vista, con comprobación negativa de «1 clientes». |
| CA12 | Cumplido | `CustomerCard.spec.ts` comprueba nombre, país, código, NIF, email y plan «Business» (sin «business»). `starter` y `enterprise` salen como «Starter» y «Enterprise». Tampoco hay importes. Textos conformes con el ADR 005 (`customerOptions.ts:13-17`). |
| CA13 | Cumplido | Clic, Enter y Espacio emiten `select`. `App.spec.ts` comprueba que se ve el detalle (`h1` con el nombre) y que desaparecen las tarjetas y el buscador. |
| CA14 | Cumplido | `App.spec.ts` "CA14": escribe «acme», abre el detalle, pulsa «Volver a clientes» y comprueba buscador vacío, dos llamadas `GET /customers` sin `q` y 2 tarjetas. El timer pendiente se cancela al desmontar (`useCustomers.ts:70-75`). |
| CA15 | Cumplido | Los 5 campos del formulario y el buscador tienen `label for` ↔ `id` (`useId`), verificado en test. Las tarjetas tienen `tabindex="0"`, `role="button"` y `aria-label`. Los botones son nativos. El test de "botones alcanzables" es débil (solo comprueba que no hay `tabindex` negativo), pero basta para botones nativos. |
| CA16 | Pendiente (visual, de Pablo) | No verificable por mí. Revisión estática favorable: grid de 1 columna `minmax(0,1fr)` en móvil y `auto-fill minmax(18rem,1fr)` desde 40 rem (`CustomerGrid.vue:18-31`); `overflow-wrap:anywhere` en nombre y datos; `min-width:0`; barra de herramientas con `flex-wrap`; `:focus-visible` global de 3 px en `#1d4ed8` (`main.css:48-51`). Hay que comprobarlo en el navegador a 375 px y en escritorio. |
| CA17 | Cumplido | El formulario es un `<form>` en la página, sin `dialog` ni `aria-modal`. Tiene 3 input y 2 select. País: España, Portugal, Francia, Alemania, Italia. Plan: Starter, Business, Enterprise. Los selectores empiezan en «Selecciona un país» y «Selecciona un plan». «Informativo: no cambia el precio.» va asociado con `aria-describedby`. La vista comprueba que la lista sigue visible con el panel abierto. |
| CA18 | Cumplido | Test de composable y de componente: el cuerpo de `POST` lleva `name`, `email`, `country: 'ES'`, `plan: 'starter'/'business'` y `tax_id` sin tocar (`' 12.345.678-z '` conserva espacios y puntos). No hay validación ni normalización (`useCreateCustomer.ts:29`). |
| CA19 | Cumplido | Test de vista con 201: el panel se cierra, el buscador queda vacío, la última URL es `/customers` sin `q`, `[role="status"]` dice «Cliente creado.» y hay 4 tarjetas. `CustomersView.vue:25-29`. |
| CA20 | Cumplido | Test de formulario con 422: el `detail` aparece en `role="alert"`, el campo conserva `12345678Z`, no se emite `created` y el botón no está `disabled`. |
| CA21 | Cumplido | 409 con el texto exacto, en el formulario y en la vista (panel abierto, y `role="status"` vacío). |
| CA22 | Cumplido | `TypeError` de red: aparece «No se pudo crear el cliente. Inténtalo de nuevo.» en `role="alert"` y no se emite `created`. Un 500, un 200 en lugar de 201 y 422/409 sin `detail` de texto dan el mismo mensaje (R10). |
| CA23 | Cumplido | Formulario: tras dos `submit` hay `disabled` y 1 llamada. Composable: el segundo `submit()` devuelve `false` sin llamar. La guarda `submitting` es síncrona (`useCreateCustomer.ts:25-26`). |
| CA24 | Cumplido | Búsqueda en `src/` (sin tests) de `iva`, `tramo`, `tier`, `subtotal`, `price`, `precio`, `toFixed`, `parseFloat`, `Math.*`, `Intl` y multiplicaciones por tipos: solo aparece el texto «Informativo: no cambia el precio.» y un comentario. Ninguna tarjeta ni vista calcula importes. Los tipos de IVA no están en el frontend. |
| CA25 | Cumplido | `useCustomers.spec.ts` (cuatro estados, 300 ms, recorte, codificación, sin `q`, un solo carácter, descarte de respuestas antiguas y `AbortController`) y `useCreateCustomer.spec.ts` (201, 422, 409, red, otros códigos, doble envío y selectores vacíos). |

## Requisitos de la spec
| R | Estado | Evidencia |
| --- | --- | --- |
| R1 | Cumplido | `CustomersView.vue:49-55`: `LoadingState` / `ErrorState` / `EmptyState` / datos con contador y rejilla. |
| R2 | Cumplido | Cada búsqueda va a `listCustomers` (`customersService.ts:10-15`). No hay filtrado en cliente ni paginación. |
| R3 | Cumplido | `SEARCH_DELAY_MS = 300`, `trim()`, `encodeURIComponent`, sin `?q=` si queda vacío, sin mínimo de caracteres. |
| R4 | Cumplido | `AbortController` más guarda por identidad (`useCustomers.ts:22-35`). Se aborta también al desmontar. |
| R5 | Cumplido | `App.vue:9-19`: `selected` con `CustomersView` / `CustomerDetailPlaceholder`. Al volver se vuelve a montar la lista y se recarga con la búsqueda vacía (`onMounted(fetchCustomers)`). El detalle emite `back`. |
| R6 | Cumplido | El cuerpo lleva los cinco campos y `tax_id` no se valida ni normaliza. |
| R7 | Cumplido | `:disabled="submitting"` y guarda en el composable. |
| R8 | Cumplido (con reserva H1) | `onCreated` cierra el panel, llama a `resetSearch()` y muestra «Cliente creado.» en `role="status"`. El aviso no se borra, como confirmó Pablo. La reserva H1 es el caso de cancelar mientras se envía. |
| R9 | Cumplido | `detail` de 422/409 en `role="alert"`, panel abierto con lo escrito y botón activo (`finally`). |
| R10 | Cumplido | Mensaje genérico ante red, 5xx, 200 y `detail` ausente o que no es texto (`apiError.ts:20`, `useCreateCustomer.ts:33-35`). |
| R11 | Cumplido | Formulario en la página, sin modal, con botón «Cancelar». Cancelar no envía nada (test). |
| R12 | Cumplido (visual pendiente) | CSS grid, primero móvil. Falta la comprobación visual (CA16). |
| R13 | Cumplido (visual pendiente) | Foco global `:focus-visible`, controles de 2,75 rem. Contrastes calculados por mí: `--muted` sobre `--paper` ≈ 6,5:1, texto blanco sobre `--accent` alto, borde de campos `#7a8994` sobre blanco ≈ 3,6:1 (válido para componentes de interfaz). Tarjetas con Tab y Enter/Espacio. |
| R14 | Cumplido | Ver CA24. |
| R15 | Cumplido | Tipos en `src/types/customer.ts`. Cero `any` (también en tests). Las únicas aserciones `as` son `event.target as HTMLInputElement` y los `response.json()`. `fetch` solo aparece en `src/services/`. Lógica de lista en `useCustomers.ts`, lógica del alta en `useCreateCustomer.ts`. Los componentes no tienen lógica de negocio. |
| R16 | Cumplido | Todos los textos visibles en español. Países y planes en `constants/customerOptions.ts`, sin tipos de IVA. |

## Comprobaciones adicionales pedidas
- Tamaño de archivos (límite 200 líneas): el mayor es `useCustomers.spec.ts` con 173 líneas, y el mayor de código es `CustomerForm.vue` con 119. Ninguno pasa de 200.
- Secretos y `.env`: no hay secretos en `src/`. Solo existe `frontend/.env.example` (`VITE_API_URL=http://localhost:8000`). No hay `.env` ni `.env.local`: `.env` está ignorado en `.gitignore:4` y `*.local` en `frontend/.gitignore:15`.
- URL del backend: `import.meta.env.VITE_API_URL` con valor por defecto `http://localhost:8000` (`customersService.ts:4`).
- Dependencias: sin cambios en `package.json` ni `package-lock.json` (sin diff).
- Estados: cuatro estados cubiertos. `ErrorState` usa `role="alert"` y el aviso de éxito es una región `role="status"` presente desde el principio, lo cual es correcto para que se anuncie. El error del alta usa `role="alert"` con `v-if`.
- Doble envío: sin carrera. El control es síncrono antes del `await`.
- Respuestas antiguas: de verdad descartadas (aborto más comparación de identidad, incluidos errores tardíos).
- Árbol de trabajo: el `npm run lint` del proyecto lleva `--fix`. Comprobé antes y después que `git status` no cambió (31 entradas, las mismas).

## Hallazgos
| # | Gravedad | Archivo:línea | Problema | Arreglo sugerido |
| --- | --- | --- | --- | --- |
| H1 | Media | `frontend/src/components/CustomerForm.vue:17-20, 70-73` y `frontend/src/views/CustomersView.vue:40,45` | Si el comercial pulsa «Cancelar» (o vuelve a pulsar «Nuevo cliente», que alterna `formOpen`) con el alta en curso, el formulario se desmonta, pero la petición sigue. Si la API responde 201, el cliente se crea, pero `emit('created')` se emite sobre un componente ya desmontado y Vue lo ignora. No se recarga la lista, no sale «Cliente creado.» y la lista queda desfasada. En fallo, el error se pierde. Contradice R8 en la práctica. No está cubierto por ningún test. | Desactivar «Cancelar» (y no permitir cerrar con el botón de alternancia) mientras `submitting` es `true`. Alternativa: subir `useCreateCustomer` a `CustomersView` y gestionar ahí `created`. Añadir un test (Cancelar con envío pendiente). |
| H2 | Baja | `frontend/src/components/CustomerCard.vue:14-23` | `<article role="button">` con `h3`, `dl` y datos dentro. El rol `button` hace presentacionales a sus hijos, así que un lector de pantalla anuncia solo «Abrir {nombre}, botón» y no ve país, NIF, email ni plan. Además Espacio actúa en `keydown`, no en `keyup` como un botón nativo. Cumple R13 y CA13 por teclado, pero es un patrón frágil. | Hacer un `<li>`/`<article>` con un `<button>` real (o enlace extendido) con el nombre como contenido, o incluir los datos en el `aria-label`. Espacio mejor en `keyup`. |
| H3 | Baja | `frontend/src/components/LoadingState.vue:2` y `frontend/src/components/CustomerCount.vue:10` | Usan `aria-live="polite"` sin `role="status"`, y los elementos se insertan con su contenido ya puesto. Las regiones vivas que aparecen ya rellenas suelen no anunciarse. El estado de carga y el contador no se anuncian de forma fiable. | Usar `role="status"` (en un contenedor presente siempre) o rellenar el texto después de montar la región. |
| H4 | Baja | `frontend/src/views/CustomersView.vue:18,25-29,45` y `frontend/src/components/CustomerForm.vue` | Gestión del foco ausente. Al abrir el panel el foco se queda en «Nuevo cliente». Al cancelar o crear, el botón enfocado («Cancelar» o «Crear cliente») desaparece del DOM y el foco pasa al `body`, lo que desorienta con teclado. La spec solo exige foco visible (R13), así que no incumple. | Enfocar el primer campo al abrir y devolver el foco a «Nuevo cliente» al cerrar. |
| H5 | Baja | `frontend/src/services/customersService.ts:25` | Con 201 se hace `await response.json()` aunque el resultado no se usa. Si el 201 llega con un cuerpo vacío o no JSON, `json()` lanza, el composable lo interpreta como fallo y muestra «No se pudo crear el cliente», aunque el cliente se creó. Es un caso raro, pero sería un duplicado si el comercial reintenta. | No parsear el cuerpo (devolver `void`) o protegerlo con `try/catch` tras confirmar el 201. |
| H6 | Baja | `frontend/src/views/CustomersView.vue:47` | «Cliente creado.» no se borra nunca, tal como se acordó. Si se crean dos clientes seguidos el texto no cambia y el lector de pantalla no vuelve a anunciarlo. Es una consecuencia de una decisión confirmada, solo informativa. | Opcional: vaciar `notice` al abrir de nuevo el panel. |
| H7 | Baja | `frontend/src/composables/useCustomers.ts:26` y `frontend/src/views/CustomersView.vue:49-55` | Cada búsqueda pone `status = 'loading'` y sustituye contador y tarjetas por «Cargando clientes…», con parpadeo mientras se escribe. R1 lo permite. La skill pide conservar el importe anterior solo para el slider, no para el buscador. No es incumplimiento. | Opcional: mantener los resultados anteriores atenuados mientras carga, sin ocultarlos. |
| H8 | Baja (tests) | `frontend/src/views/__tests__/CustomersView.spec.ts:143-147`, `frontend/src/views/__tests__/CustomersViewCreate.spec.ts:72-81` | El caso «2 de 5 clientes» de CA10 no tiene test (solo se prueban 3 y 1, y la lógica es `length`). CA20 con 422 y CA22 con red se prueban en el formulario, no en la vista (CA21 sí en ambos). No hay tests de «Cancelar mientras se envía» (H1) ni de que el desmontaje aborta la petición. `CustomersViewCreate.spec.ts` usa temporizadores reales y deja el buscador con un temporizador de 300 ms sin esperar. | Añadir un test explícito de «2 de 5» y de cancelar con envío pendiente. Usar `vi.useFakeTimers()` en los tests de la vista que escriben en el buscador. |
| H9 | Informativa | `frontend/src/services/customersService.ts:14,25` | Las respuestas se tipan con `as Customer[]` / `as Customer` sin validar en ejecución. Es aceptable porque el backend es de confianza y el tipo refleja el schema. | Sin acción. |

## Comandos ejecutados
Desde `C:\Users\pablo\Projects\saas-o-matic\frontend` (no se arrancó ningún servidor y no se modificó nada del proyecto):

```
npm run type-check          -> vue-tsc --build                      -> salida 0, sin errores
npm run lint                -> oxlint . --fix y eslint . --fix      -> salida 0, sin avisos
npm run test:unit -- --run  -> vitest --run                         -> 7 archivos de test, 68 tests pasados, 0 fallos (3,91 s)
```

Búsquedas estáticas (grep) sobre `frontend/src/`:
- `any`, `@ts-ignore` y `eslint-disable`: sin coincidencias.
- `fetch(`, `axios` y `XMLHttpRequest` fuera de `src/services/`: sin coincidencias.
- `iva`, `tramo`, `precio`, `subtotal`, `toFixed`, `parseFloat`, `Math.*`, `Intl`: solo el texto de ayuda del plan y un comentario.
- `secret`, `api key`, `token` y `password`: sin coincidencias.
- Recuento de líneas por archivo: máximo 173.
- `git status` antes y después: idéntico, 31 entradas.

## Pendiente fuera de la auditoría
- CA16 (Pablo): comprobar a 375 px que las tarjetas se apilan sin scroll horizontal y que el foco se ve en el buscador, los botones, los campos y las tarjetas. Tras la comprobación, marcar CA16 como cumplido.
- Recomendado antes de cerrar: resolver H1. H2 a H8 pueden quedar como mejoras.
