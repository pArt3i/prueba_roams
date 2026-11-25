# 003 · Frontend: dashboard de clientes, buscador y alta
Estado: Aprobada
Fecha: 2026-11-15
Objetivo: que el comercial vea sus clientes en tarjetas, los encuentre con un buscador, dé de alta clientes nuevos y abra el detalle de uno.

## Contexto y alcance
Entra: la pantalla principal (dashboard) con el buscador, el contador de clientes, la lista en tarjetas, el botón «Nuevo cliente» con su formulario de alta, y la navegación hacia la vista de detalle del cliente y de vuelta (la recarga de la lista). Consume `GET /customers?q=` y `POST /customers` de la [spec 001](001-clientes.md). Para el plan y sus textos, ver el [ADR 005](../02-arquitectura/005-planes-informativos.md). Sigue la skill `convenciones-frontend`: Vue 3 con `<script setup lang="ts">`, sin router ni Pinia, estado en composables, URL de `VITE_API_URL`.
No entra: la vista de detalle y el simulador ([spec 004](004-frontend-detalle-simulador.md), que incluye el botón «Volver a clientes»), edición y borrado de clientes, métricas o simulaciones recientes en el dashboard, paginación y cualquier fórmula de tramos o IVA en el frontend (R14). Tampoco la validación de identificadores fiscales: es del backend.

## Entradas
| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| Texto de búsqueda | string | No | Input con `<label>` asociado. Se lanza al escribir con espera de 300 ms, sin mínimo de caracteres. Se recorta de espacios antes de enviarse; si queda vacío, se pide la lista completa |
| Tarjeta de cliente | acción | No | Clic, o Enter o Espacio con el foco en la tarjeta: cambia a la vista de detalle de ese cliente (spec 004) |
| «Nuevo cliente» | acción | No | Abre el panel con el formulario de alta (no es un modal) |
| Nombre | string | Sí | `<label>` asociado. Se envía como `name`. La validación es del backend |
| Email | string | Sí | `<label>` asociado. Se envía como `email`. La validación es del backend |
| País | selección | Sí | `<label>` asociado. Opciones: España (`ES`), Portugal (`PT`), Francia (`FR`), Alemania (`DE`) e Italia (`IT`). Es una lista de presentación sin tipos de IVA. Empieza en una opción vacía «Selecciona un país» |
| Plan | selección | Sí | `<label>` asociado. Opciones: Starter (`starter`), Business (`business`), Enterprise (`enterprise`). Empieza en una opción vacía «Selecciona un plan». Lleva el texto de ayuda «Informativo: no cambia el precio.» |
| Identificador fiscal | string | Sí | `<label>` asociado. Se envía como `tax_id`, tal como se escribe. El frontend no lo valida |

## Salidas
`GET /customers?q=` devuelve la lista de clientes de la spec 001. Cada elemento, y la respuesta 201 de `POST /customers`, tiene esta forma:

```json
{ "id": 1, "name": "Acme S.L.", "tax_id": "12345678Z", "email": "ventas@acme.com", "country": "ES", "plan": "starter" }
```

El dashboard muestra, de arriba abajo: el buscador y el botón «Nuevo cliente»; el panel de alta si está abierto; el contador; y la rejilla de tarjetas.
- Contador: «N clientes» (plural, también con 0) y «1 cliente» (singular). Cuenta los resultados mostrados, no el total de clientes. Solo se muestra en el estado con datos.
- Tarjeta: nombre, país, identificador fiscal, email y plan. El plan se muestra como «Starter», «Business» o «Enterprise» (textos en el ADR 005), no con el valor de la API. La tarjeta no muestra más datos, ni simulaciones ni importes.

## Reglas de negocio
- R1: la pantalla cubre cuatro estados: cargando, error, vacío y con datos.
- R2: cada búsqueda llama a `GET /customers?q=` y no filtra en el cliente. Sin paginación: se muestran todos los clientes que devuelve la API.
- R3: la búsqueda se lanza al escribir, con 300 ms de espera tras la última pulsación y sin mínimo de caracteres. El texto se recorta de espacios y se codifica en la URL; si queda vacío, se pide `GET /customers` sin `q`.
- R4: una respuesta antigua que llega después de una más reciente se descarta y no pisa el resultado actual (`AbortController` o ignorar respuestas antiguas).
- R5: no hay router. La aplicación cambia entre dos vistas, lista de clientes y detalle del cliente, guardando qué cliente está seleccionado. La vista de detalle ofrece la acción de volver a la lista (el botón «Volver a clientes» es de la spec 004). Al volver, la lista se monta de nuevo y se recarga desde la API con la búsqueda vacía.
- R6: el alta se envía a `POST /customers` con `name`, `email`, `country`, `plan` y `tax_id`. El frontend no valida ni normaliza identificadores fiscales ni reimplementa las validaciones de la spec 001.
- R7: mientras el alta se envía, el botón de envío está desactivado, para evitar duplicados.
- R8: respuesta 201 del alta: se cierra el panel, se limpia el texto de búsqueda, se recarga la lista completa y se muestra «Cliente creado.» en una región con `role="status"`.
- R9: respuesta 422 o 409 del alta: se muestra su `detail` en una región con `role="alert"`; el panel sigue abierto con lo escrito y el botón de envío vuelve a estar activo.
- R10: fallo de red del alta: se muestra «No se pudo crear el cliente. Inténtalo de nuevo.» en la misma región con `role="alert"`. Lo mismo ocurre ante cualquier otra respuesta que no sea 201, 409 o 422, o si 422 o 409 no traen un `detail` de texto.
- R11: el panel de alta es un formulario en la propia página, no un modal. Tiene un botón «Cancelar» que lo cierra sin enviar nada.
- R12: las tarjetas se disponen con CSS grid, primero móvil; se comprueba a 375 px y en escritorio.
- R13: foco visible y contraste suficiente en el input, los botones, los campos del formulario y las tarjetas. Las tarjetas se pueden usar con teclado (se enfocan con Tab y se abren con Enter o Espacio).
- R14: el frontend no contiene fórmulas de tramos ni de IVA. La conversión de divisa de la spec 004 es solo presentación de un precio ya calculado por el backend y está permitida; ninguna tarjeta ni vista del dashboard calcula importes.
- R15: tipos TypeScript en `src/types/` reflejan el schema del backend; sin `any`. Llamadas HTTP en `src/services/`; la lógica de la lista en el composable `useCustomers.ts` y la del alta en otro composable (por ejemplo `useCreateCustomer.ts`).
- R16: todos los textos visibles, en español. La lista de países y los textos de los planes del formulario son de presentación y viven en el frontend (fuentes: `reglas-negocio`/`iva.md` para los países y el ADR 005 para los planes).

## Errores
| Situación | Código HTTP | Mensaje |
| --- | --- | --- |
| Fallo de red o error del servidor al cargar | 5xx / sin respuesta | No se pudieron cargar los clientes. Inténtalo de nuevo. (con botón «Reintentar») |
| No hay clientes todavía | 200 con `[]` sin búsqueda | Aún no hay clientes. |
| Búsqueda sin resultados | 200 con `[]` con búsqueda | No hay clientes que coincidan con «{texto}». (el texto es el ya recortado) |
| Cargando | n/a | Cargando clientes… |
| Alta con datos no válidos | 422 | El `detail` de la API, en español (región `role="alert"`) |
| Alta con identificador fiscal duplicado | 409 | El `detail` de la API: «Ya existe un cliente con ese identificador fiscal.» (región `role="alert"`) |
| Alta con fallo de red | sin respuesta (o 5xx) | No se pudo crear el cliente. Inténtalo de nuevo. |
| Alta correcta | 201 | Cliente creado. |

## Casos límite
- Búsqueda con espacios o caracteres especiales (`%`, `_`, `&`): se codifica en la URL.
- Búsqueda con solo espacios: queda vacía tras recortar y se pide la lista completa.
- Borrar el texto de búsqueda vuelve a la lista completa.
- Una sola letra en el buscador: se busca igualmente (sin mínimo de caracteres).
- Respuesta antigua que llega después de una más reciente: no pisa el resultado actual.
- Una búsqueda con una sola coincidencia muestra «1 cliente».
- Nombres o emails muy largos en la tarjeta no rompen el diseño.
- Muchos clientes: sin paginación, la rejilla los muestra todos (supuesto de escala de la spec 001: unos cientos).
- Backend caído: aparece el estado de error, no una pantalla en blanco.
- Pantalla de 375 px sin scroll horizontal.
- Doble clic en el botón de envío del alta: solo una petición.
- Alta con un identificador duplicado (409) o inválido (422): el panel y lo escrito se conservan para corregirlo.
- Alta correcta mientras había texto en el buscador: el buscador se vacía y se muestra la lista completa.
- Volver desde el detalle: la lista se pide de nuevo, con la búsqueda vacía, así que muestra los datos actuales.
- Dejar un selector sin elegir: se envía vacío y el 422 del backend («El país es obligatorio.» o «El plan es obligatorio.») se muestra tal cual.

## Criterios de aceptación
Cada criterio indica cómo se comprueba. Los marcados «Vitest» se prueban con Vitest y `@vue/test-utils`: los de lógica sobre los composables `useCustomers` y de alta de cliente, los de interfaz sobre los componentes. Solo CA24 es del auditor; CA16 es una comprobación visual, porque Vitest no mide diseños.

- [ ] CA1 (Vitest): dado el backend con clientes, cuando se abre el dashboard, entonces se muestra una tarjeta por cliente.
- [ ] CA2 (Vitest): dada una petición en curso, entonces se ve «Cargando clientes…».
- [ ] CA3 (Vitest): dado un fallo de red, entonces se ve el mensaje de error con «Reintentar», y al pulsarlo se vuelve a pedir.
- [ ] CA4 (Vitest): dada una lista vacía sin búsqueda, entonces se ve «Aún no hay clientes.».
- [ ] CA5 (Vitest): dada una búsqueda sin resultados, entonces se ve «No hay clientes que coincidan con «texto».».
- [ ] CA6 (Vitest): dado un texto en el buscador, cuando pasan 300 ms, entonces se llama a `GET /customers?q=texto` con el texto recortado y codificado.
- [ ] CA7 (Vitest): dado un texto que queda vacío tras recortar (vacío o solo espacios), cuando se lanza la búsqueda, entonces se llama a `GET /customers` sin `q` y se muestra la lista completa.
- [ ] CA8 (Vitest): dado el buscador, cuando se escribe varias veces seguidas en menos de 300 ms (temporizadores simulados), entonces se hace una sola llamada, con el texto final; y con un solo carácter también se busca.
- [ ] CA9 (Vitest): dadas dos búsquedas seguidas donde la primera responde después, entonces se muestra el resultado de la última.
- [ ] CA10 (Vitest): dados tres clientes mostrados, entonces el contador dice «3 clientes»; y dada una búsqueda que devuelve 2 de 5 clientes, dice «2 clientes» (cuenta los resultados mostrados, no el total).
- [ ] CA11 (Vitest): dado un solo cliente mostrado, entonces el contador dice «1 cliente».
- [ ] CA12 (Vitest): dado un cliente `{ name: "Acme S.L.", country: "ES", tax_id: "12345678Z", email: "ventas@acme.com", plan: "business" }`, entonces su tarjeta muestra los cinco datos y el plan aparece como «Business»; con `starter` y `enterprise`, «Starter» y «Enterprise».
- [ ] CA13 (Vitest): dada una tarjeta, cuando se pulsa (o se enfoca y se pulsa Enter o Espacio), entonces se cambia a la vista de detalle de ese cliente y deja de verse la lista.
- [ ] CA14 (Vitest): dado el detalle de un cliente abierto desde la lista, cuando el detalle pide volver a la lista (la acción la ofrece la vista de la spec 004), entonces se ve el dashboard con el buscador vacío y se hace una nueva petición `GET /customers` sin `q`.
- [ ] CA15 (Vitest): dado el buscador y el formulario, entonces cada campo tiene `<label>` asociado y los botones y tarjetas se alcanzan con el teclado (el foco visible se comprueba además con CA16).
- [ ] CA16 (comprobación visual): dado un ancho de 375 px, entonces las tarjetas se apilan sin desbordar horizontalmente, y el foco se ve en input, botones y tarjetas.
- [ ] CA17 (Vitest): dado el dashboard, cuando se pulsa «Nuevo cliente», entonces se abre un panel (no un modal) con los campos nombre, email, país, plan e identificador fiscal; el país ofrece España, Portugal, Francia, Alemania e Italia, el plan ofrece Starter, Business y Enterprise, y el plan lleva «Informativo: no cambia el precio.».
- [ ] CA18 (Vitest): dado el formulario relleno, cuando se envía, entonces se llama a `POST /customers` con `name`, `email`, `country` (código de dos letras), `plan` (en minúsculas) y `tax_id` tal como se escribió, sin validarlo ni normalizarlo.
- [ ] CA19 (Vitest): dado un alta con respuesta 201, entonces se cierra el panel, se vacía el buscador, se pide `GET /customers` sin `q` y se ve «Cliente creado.».
- [ ] CA20 (Vitest): dada una respuesta 422, entonces el `detail` de la API se ve en una región con `role="alert"`, el panel sigue abierto con lo escrito y el botón vuelve a estar activo.
- [ ] CA21 (Vitest): dada una respuesta 409 con «Ya existe un cliente con ese identificador fiscal.», entonces ese texto se ve en una región con `role="alert"` y el panel sigue abierto.
- [ ] CA22 (Vitest): dado un fallo de red en el alta, entonces se ve «No se pudo crear el cliente. Inténtalo de nuevo.» en una región con `role="alert"` y el panel sigue abierto.
- [ ] CA23 (Vitest): dado un alta en curso, entonces el botón de envío está desactivado, y al pulsarlo dos veces seguidas solo se hace una llamada a `POST /customers`.
- [ ] CA24 (auditor): dado el código de `frontend/src/`, entonces no contiene fórmulas de tramos ni de IVA; la conversión de divisa de la spec 004 es solo presentación y está permitida.
- [ ] CA25 (Vitest): dados los composables `useCustomers` y de alta de cliente, entonces tienen tests Vitest de: los cuatro estados, la búsqueda (espera de 300 ms, recorte y codificación), el descarte de respuestas antiguas, y el alta (201, 422, 409, fallo de red y doble envío).

## Mis cambios
Primera ronda, 2026-11-15, por decisión mía:
- Dashboard: buscador, contador de clientes («N clientes», «1 cliente»; cuenta los resultados mostrados), tarjetas de cliente y botón «Nuevo cliente»; sin métricas ni simulaciones recientes (Salidas, Contexto y alcance). Pregunta cerrada.
- Tarjeta: muestra nombre, país, identificador fiscal, email y plan, los cinco campos que devuelve `GET /customers` según la spec 001; el plan se ve como «Starter», «Business» o «Enterprise»; ejemplo JSON actualizado con los cinco campos y el `id` (Salidas, CA12). Pregunta cerrada.
- Navegación sin router: pulsar una tarjeta (accesible con teclado) cambia a la vista de detalle del cliente (spec 004), que tiene un botón «Volver a clientes»; la lista se recarga al volver (R5, CA13, CA14). Pregunta cerrada.
- Búsqueda: se lanza al escribir con 300 ms de espera y sin mínimo de caracteres; el texto se recorta y, si queda vacío, se pide la lista completa; las respuestas antiguas se descartan (CA9 se mantiene); sin paginación (R2 a R4, CA6 a CA9). Preguntas de búsqueda, respuestas antiguas y paginación cerradas.
- Alta de clientes (entra en esta spec): botón «Nuevo cliente» que abre un panel con formulario (no modal) con nombre, email, país (España, Portugal, Francia, Alemania, Italia; lista de presentación sin tipos de IVA), plan (Starter, Business, Enterprise) e identificador fiscal, todos con `<label>`; se envía a `POST /customers`, con el botón desactivado mientras se envía; 422 o 409 muestran su `detail` en `role="alert"`; fallo de red, «No se pudo crear el cliente. Inténtalo de nuevo.»; con 201 se cierra el panel, se limpia la búsqueda, se recarga la lista y se muestra «Cliente creado.»; el frontend no valida identificadores fiscales (R6 a R11, Entradas, CA17 a CA23). Pregunta cerrada.
- Criterios de aceptación: añadidos los de contador (singular y plural), tarjeta con los cinco datos, apertura del detalle y vuelta, alta con éxito, 422, 409, fallo de red, sin doble envío y espera de 300 ms en la búsqueda; CA renumerados de CA1 a CA25.
- Tests: CA11 anterior (sin fórmulas de precio) pasa a ser una comprobación del auditor (ahora CA24) y deja de ser un test de Vitest; Vitest cubre el composable `useCustomers` (cuatro estados, búsqueda, descarte de respuestas antiguas) y el de alta de cliente (CA25).
- ADR 005 y skill `convenciones-frontend`: el ADR 005 recoge los textos en español de los planes (pregunta cerrada); la skill añade que las respuestas antiguas también se descartan en el buscador.
- Confirmo los supuestos del arquitecto: al volver se recarga la lista sin búsqueda, botón Cancelar en el alta, selectores que empiezan vacíos, texto de ayuda en el plan, errores raros con el mismo mensaje que la red, «Cliente creado.» sin desaparecer y contador solo con datos.

Segunda ronda, 2026-11-15, por decisión mía:
- R14 y CA24: pasan a decir «sin fórmulas de tramos ni IVA; la conversión de divisa de la spec 004 es solo presentación y está permitida». Se ajusta también el alcance («No entra») en el mismo sentido.
- Botón «Volver a clientes»: pertenece a la vista de detalle (spec 004). Se quita de las Entradas de esta spec y deja de ser un elemento propio; R5 solo menciona que el detalle ofrece la acción de volver. Se conservan los criterios de «pulsar una tarjeta abre el detalle» (CA13) y «al volver, la lista se recarga con la búsqueda vacía» (CA14, reescrito sin citar el botón como elemento de esta spec). No hace falta renumerar: siguen CA1 a CA25.


Mi revisión: el alta de clientes va en un panel de la misma pantalla y no en una página aparte, para que el comercial no pierda el listado.
