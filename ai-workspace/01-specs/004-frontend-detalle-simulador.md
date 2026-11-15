# 004 · Frontend: detalle del cliente, simulador e historial
Estado: Aprobada
Fecha: 2026-11-15
Objetivo: que el comercial abra un cliente y vea su ficha, mueva un slider de usuarios para ver el precio calculado por el backend (en EUR, USD o GBP), guarde la simulación y consulte el historial de simulaciones de ese cliente.

## Contexto y alcance
Entra: la vista de detalle de un cliente, que se abre desde una tarjeta de la [spec 003](003-frontend-clientes.md) y contiene tres bloques: la ficha del cliente, el simulador (usuarios, datos informativos, selector de divisa, desglose de subtotal, IVA y total, y guardado) y el historial de simulaciones. Usa `POST /simulations/preview`, `POST /simulations` y `GET /customers/{id}/simulations` de la [spec 002](002-precio-y-simulaciones.md), y `open.er-api.com` para el tipo de cambio. Referencias: ADR [002](../02-arquitectura/002-calculo-precio-backend.md), [005](../02-arquitectura/005-planes-informativos.md) (textos de los planes) y [007](../02-arquitectura/007-divisas.md). Sigue `convenciones-frontend` (slider y divisas).
No entra: la lista de clientes, el buscador y el alta (spec 003); edición y borrado de clientes o de simulaciones; paginación del historial; conversión del historial a otra divisa; y cualquier fórmula de tramos o IVA en el frontend. La conversión de divisa sí entra (R11 a R15): es solo presentación de un precio ya calculado por el backend.
Los datos del cliente son los de la tarjeta seleccionada en la spec 003 (`id`, `name`, `country`, `tax_id`, `email`, `plan`); la vista no llama a `GET /customers/{id}`.
El botón «Volver a clientes» pertenece a esta vista (Entradas, R1, CA1). Qué cliente está seleccionado y qué pasa al volver (la lista se recarga con la búsqueda vacía) es de la spec 003 (R5, CA13, CA14).

## Entradas
| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| Cliente seleccionado | datos de la tarjeta | Sí | Solo lectura. Aporta `id` y el país; no se edita |
| Usuarios (slider) | entero | Sí | De 1 a 200, paso 1, valor inicial 1. `<label>` asociado y `aria-label` |
| Usuarios (campo numérico) | entero | Sí | De 1 a 10 000, sincronizado con el slider, valor inicial 1. `<label>` asociado y `aria-label` |
| Almacenamiento (GB) | entero | Sí | De 0 a 1 000 000, valor inicial 0. Informativo: se guarda, no cambia el precio |
| Llamadas a la API | entero | Sí | De 0 a 1 000 000 000, valor inicial 0. Informativo: se guarda, no cambia el precio |
| Divisa | selección | Sí | EUR (por defecto), USD, GBP. `<label>` asociado |
| «Guardar simulación» | acción | No | Envía `POST /simulations` (R9) |
| «Reintentar» (cálculo) | acción | No | Solo aparece junto al mensaje de un fallo de red o 5xx (no con un 422): repite la petición a `preview` con el valor actual de usuarios; si hay una espera de 300 ms pendiente, la cancela y hace una sola petición (R8) |
| «Reintentar» (tipo de cambio) | acción | No | Vuelve a pedir el tipo de cambio tras un fallo (R13) |
| «Reintentar» (historial) | acción | No | Vuelve a pedir el historial tras un fallo (R10) |
| «Volver a clientes» | acción | No | Vuelve al dashboard. El botón es de esta vista; la recarga de la lista es de la spec 003 |

El plan y el país no son campos del simulador: se leen del cliente y no se pueden cambiar.

## Salidas
Respuesta de `preview` que consume el frontend (importes en EUR, formato de la spec 002):

```json
{ "users": 60, "country": "ES", "currency": "EUR", "vat_rate": "0.21",
  "subtotal": "470.00", "vat": "98.70", "total": "568.70" }
```

Cuerpo de `POST /simulations` (sin plan, país ni importes) y respuesta 201:

```json
{ "customer_id": 1, "users": 60, "storage_gb": 100, "api_calls": 5000 }
```

```json
{ "id": 7, "customer_id": 1, "users": 60, "storage_gb": 100, "api_calls": 5000,
  "country": "ES", "currency": "EUR", "vat_rate": "0.21",
  "subtotal": "470.00", "vat": "98.70", "total": "568.70",
  "created_at": "2026-11-15T10:00:00Z" }
```

`GET /customers/{id}/simulations` devuelve una lista de objetos con las claves de la respuesta anterior, más reciente primero.

La vista muestra, de arriba abajo: el botón «Volver a clientes»; la ficha (nombre, país, identificador fiscal, email y plan; el plan como «Starter», «Business» o «Enterprise», con «Informativo: no cambia el precio.»); el simulador; y el historial.
- Simulador: slider y campo numérico de usuarios, almacenamiento, llamadas a la API, selector de divisa, desglose (subtotal, IVA y total, formateados con `Intl.NumberFormat` en `es-ES`) y «Guardar simulación». Con usuarios inválidos no se ve el desglose, solo el mensaje del campo (R5).
- Historial: una fila por simulación con fecha y hora (formato `es-ES`, por ejemplo «15/11/2026, 10:00», en la zona horaria del navegador), usuarios, almacenamiento, llamadas a la API, subtotal, IVA y total en EUR tal como se guardaron, y la nota «Importes en EUR».
- Lo guardado en el backend sigue siendo EUR; la divisa elegida solo cambia lo que ve el simulador.

## Reglas de negocio
- R1: la vista de detalle contiene el botón «Volver a clientes», la ficha del cliente, el simulador y el historial. La ficha usa los datos de la tarjeta seleccionada; no se llama a `GET /customers/{id}`.
- R2: el plan se muestra en la ficha, solo como información, con los textos del ADR 005. No es un campo del simulador y no se envía a ningún endpoint (ni a `preview` ni a `POST /simulations`).
- R3: el país del cálculo sale del cliente y no se puede cambiar.
- R4: slider (1 a 200, paso 1) y campo numérico (1 a 10 000) están sincronizados y empiezan en 1. Mover el slider cambia el campo; escribir en el campo mueve el slider. Si el campo pasa de 200, el slider queda en 200 y el campo conserva su valor. Ambos tienen `<label>` asociado y `aria-label`, y foco visible.
- R5: si el campo numérico está vacío, no es entero o queda fuera de 1 a 10 000, no se pide cálculo y se cancela el cálculo pendiente o en curso (su respuesta, si llega, se descarta). Se ocultan los importes (EUR y convertidos), el indicador de carga y cualquier mensaje de fallo del cálculo (con su «Reintentar», si lo tenía): no se deja el importe antiguo, y se ve solo «El número de usuarios debe ser un entero entre 1 y 10000.». «Guardar simulación» queda desactivado. Cuando el valor vuelve a ser válido se calcula de nuevo (R7).
- R6: almacenamiento y llamadas a la API son obligatorios, enteros y con valor inicial 0. Son informativos: se guardan pero no disparan el cálculo ni cambian el precio. Si no son enteros, están vacíos o fuera de rango, se ve un error de campo con los mensajes de la spec 002 («El almacenamiento debe ser un entero entre 0 y 1000000.» y «Las llamadas a la API deben ser un entero entre 0 y 1000000000.»).
- R7: el cálculo usa `POST /simulations/preview` con `users` y el `country` del cliente, y nada más. Se pide al abrir la vista (con 1 usuario) y tras 300 ms desde el último cambio de usuarios (slider o campo numérico). Una respuesta antigua que llega tarde se descarta (`AbortController` o ignorar respuestas antiguas).
- R8: mientras se calcula (con usuarios válidos), se ve un indicador de carga y el importe anterior sigue visible. La pantalla sigue operativa ante cualquier fallo y no hay reintento automático. El botón «Reintentar» solo existe en los fallos de red o 5xx:
  - Red o 5xx: se ve «No se pudo calcular el precio. Inténtalo de nuevo.» con un botón «Reintentar» junto a él. Un 422 sin `detail` de texto cuenta como fallo de red (R19) y también lo lleva.
  - 422 con `detail` de texto: se ve el mensaje de la API y no hay «Reintentar»; el usuario corrige el valor y el siguiente cambio válido de usuarios vuelve a calcular. Si un «Reintentar» devuelve 422, se ve el mensaje de la API y el botón desaparece.
  - «Reintentar» repite la petición a `preview` con el valor actual de usuarios y el país del cliente. Si hay una espera de 300 ms pendiente (el usuario cambió el valor tras el fallo), la cancela y hace una sola petición inmediata con el valor actual; no se hace una segunda al cumplirse los 300 ms. Si responde bien, desaparecen el mensaje y el botón y se ven los importes; si vuelve a fallar por red o 5xx, el mensaje y el botón siguen.
  - El siguiente cambio válido de usuarios también vuelve a calcular.
- R9: «Guardar simulación» envía `POST /simulations` con `customer_id`, `users`, `storage_gb` y `api_calls`, y nunca plan, país ni importes. Está desactivado mientras hay un cálculo en curso, durante la espera de 300 ms desde el último cambio de usuarios (hasta que llega la respuesta correcta), si el último cálculo falló (red, 5xx o 422), si hay algún campo inválido (incluidos los usuarios) y mientras se guarda, para que un doble clic no duplique la simulación. Con 201 se ve «Simulación guardada.» (región `role="status"`) y se recarga el historial. Los errores se ven en una región `role="alert"`; el botón vuelve a activarse al terminar. Si el guardado falla (404, 422 o red), el historial no se recarga.
- R10: el historial se pide a `GET /customers/{id}/simulations` al abrir la vista y tras cada guardado correcto. Se muestra en el orden que devuelve la API (más reciente primero), sin reordenarlo en el cliente. Tiene cuatro estados: cargando, error con «Reintentar», vacío y con datos. No se convierte a otra divisa: los importes se ven en EUR, como se guardaron, con la nota «Importes en EUR». La fecha lleva fecha y hora en formato `es-ES` (por ejemplo «15/11/2026, 10:00», sin segundos), calculadas desde `created_at` (UTC) en la zona horaria del navegador.
- R11: la divisa por defecto es EUR. Con EUR no se convierte nada. Cambiar de divisa no vuelve a pedir el precio: se reutilizan los importes en EUR de la última respuesta de `preview` y el tipo en memoria.
- R12: el tipo de cambio (EUR a USD y GBP) se pide una sola vez a `open.er-api.com` (ADR 007), la primera vez que se elige USD o GBP. Una sola petición devuelve ambos tipos: elegir USD y luego GBP, o al revés, no repite la petición. El tipo se guarda en memoria hasta que se recargue la página, y se conserva al volver a la lista y abrir otro cliente (el estado vive fuera de la vista de detalle, que se monta de nuevo). Solo se conserva una respuesta completamente válida (R13): un fallo no se guarda y se vuelve a pedir con «Reintentar».
- R13: si la petición del tipo no responde en 5 segundos o falla, se muestran los importes en EUR con el aviso visible «No se pudo obtener el tipo de cambio. Se muestran los importes en EUR.» y un botón «Reintentar» que vuelve a pedirlo. No hay reintento automático. La pantalla no se rompe. Cuenta como fallo de la API, con el mismo tratamiento, una respuesta con `result` distinto de `"success"` o en la que `rates.USD` o `rates.GBP` sea inválido: ausente, no numérico, menor o igual que 0, o con «e» en su texto decimal (R15). Basta con que uno de los dos tipos sea inválido para que toda la respuesta sea un fallo, aunque el tipo de la divisa elegida sea válido; no se guarda nada, ni siquiera el tipo válido. Con el fallo, el selector se queda en la divisa elegida (USD o GBP) para poder reintentar; con EUR seleccionado no se ve el aviso.
- R14: subtotal e IVA se convierten por separado (importe en EUR × tipo, a 2 decimales con ROUND_HALF_UP) y el total mostrado es el subtotal convertido más el IVA convertido, de modo que el desglose siempre cuadra. El total no se convierte aparte y puede diferir en 0,01 de (total en EUR × tipo).
- R15: requisito de aritmética: ningún importe pasa por coma flotante. Los importes de la API (texto `"470.00"`) se pasan a céntimos enteros y la multiplicación por el tipo y el redondeo se hacen con enteros (por ejemplo `BigInt`) o con una librería decimal. El tipo se trata por su representación decimal en texto (ADR 007), que se obtiene con `String(n)` del número que entrega `JSON.parse` (no con `response.text()` ni con un `reviver`): `1.0829` da `"1.0829"` y `1.005` da `"1.005"`. Si el texto resultante contiene «e» (notación científica, por ejemplo `1e-7`), el tipo se trata como inválido (R13). Si se eligiera una librería, es una dependencia nueva y requiere avisar a Pablo antes de añadirla. La conversión es la función pura `convertAmount`, en `src/utils/currency.ts`; se muestra con `Intl.NumberFormat` en `es-ES`.
- R16: tres estados siempre cubiertos en cada bloque que carga datos: cargando, error y con datos (y vacío en el historial). Diseño primero móvil, comprobado a 375 px y en escritorio; contraste suficiente. Textos en español.
- R17: tipos TypeScript en `src/types/` que reflejan los schemas del backend; sin `any`. Llamadas HTTP en `src/services/`. Lógica en composables: `usePricing` (cálculo con espera, cancelación, errores y reintento), uno para el tipo de cambio, uno para el guardado y uno para el historial. La conversión vive en `src/utils/currency.ts` (R15).
- R18: el frontend no calcula tramos ni IVA. La única aritmética de dinero permitida es `convertAmount` (R14 y R15).
- R19: los mensajes de fallo de red, 5xx y tipo de cambio son textos propios del frontend (los de la tabla de Errores). En un 404 o un 422 con `detail` de texto se muestra ese `detail`. Un 422 sin `detail` de texto se trata como fallo de red de esa operación (igual que la spec 003, R10); en `preview`, ese fallo lleva «Reintentar» (R8).
- R20: atribución de los tipos de cambio (términos de uso de `open.er-api.com`, [fuente](https://www.exchangerate-api.com/docs/free)): el simulador muestra siempre un enlace con el texto exacto «Rates By Exchange Rate API» y `href` `https://www.exchangerate-api.com`. Es visible con independencia de la divisa elegida (EUR, USD o GBP) y de que la API de tipos responda o falle. Puede ser discreto (texto pequeño), pero legible. No cambia ninguna otra regla (ADR 007).

## Errores
| Situación | Código HTTP | Mensaje |
| --- | --- | --- |
| Usuarios vacío, no entero o fuera de 1 a 10 000 | n/a (sin llamada) | El número de usuarios debe ser un entero entre 1 y 10000. (solo este mensaje; sin importes) |
| Almacenamiento inválido | n/a (sin llamada) | El almacenamiento debe ser un entero entre 0 y 1000000. |
| Llamadas a la API inválidas | n/a (sin llamada) | Las llamadas a la API deben ser un entero entre 0 y 1000000000. |
| Fallo de red o 5xx en `preview` | 5xx / sin respuesta | No se pudo calcular el precio. Inténtalo de nuevo. (con botón «Reintentar») |
| 422 en `preview` con `detail` de texto | 422 | Se muestra el mensaje en español de la API (sin botón «Reintentar») |
| 422 en `preview` sin `detail` de texto | 422 | Se trata como fallo de red: No se pudo calcular el precio. Inténtalo de nuevo. (con botón «Reintentar») |
| API de tipos de cambio caída, sin respuesta en 5 s, con `result` distinto de `"success"`, o con alguno de los dos tipos ausente, no numérico, ≤ 0 o con «e» en su texto | n/a | No se pudo obtener el tipo de cambio. Se muestran los importes en EUR. (con botón «Reintentar») |
| Guardado correcto | 201 | Simulación guardada. |
| Cliente inexistente al guardar | 404 | Cliente no encontrado. |
| 422 al guardar | 422 | Se muestra el mensaje en español de la API |
| Fallo de red o 5xx al guardar | 5xx / sin respuesta | No se pudo guardar la simulación. Inténtalo de nuevo. |
| Cargando el historial | n/a | Cargando historial… |
| Fallo al cargar el historial | 5xx / sin respuesta | No se pudo cargar el historial. Inténtalo de nuevo. (con botón «Reintentar») |
| Historial sin simulaciones | 200 con `[]` | Aún no hay simulaciones. |

Un 422 sin `detail` de texto se trata como fallo de red (R19; igual que la spec 003, R10).

## Casos límite
- Slider en 1 (mínimo) y en 200 (máximo). Campo numérico en 200 (slider en 200), en 201 y en 10 000 (válidos, slider en 200) y en 10 001 (inválido, sin llamada).
- Campo numérico vacío, `0`, negativo o decimal (`1.5`): inválido, sin llamada, con mensaje y sin importes visibles.
- Escribir `10001` y corregir a `100` antes de 300 ms: una sola llamada, con 100.
- Movimientos rápidos: solo una petición tras 300 ms de calma.
- La respuesta de 100 usuarios llega después que la de 60: se muestra la de 60.
- Usuarios inválidos mientras había un cálculo pendiente o en curso: se cancela, se ocultan los importes y no se pide otro hasta que el valor vuelva a ser válido; una respuesta que llegue tarde no reaparece.
- Usuarios inválidos tras un cálculo fallido: se oculta el mensaje de fallo (con su «Reintentar», si lo tenía) y solo se ve el mensaje del campo; al volver a un valor válido se calcula de nuevo.
- Cálculo fallido por red o 5xx y «Reintentar» que vuelve a fallar por red o 5xx: el mensaje y el botón siguen; sin reintentos automáticos.
- «Reintentar» con una espera de 300 ms pendiente (el usuario cambió el valor tras el fallo): se cancela la espera y se hace una sola petición inmediata con el valor actual; al cumplirse los 300 ms no se hace una segunda.
- 422 en `preview` con `detail` de texto: se ve el mensaje de la API, sin «Reintentar»; «Guardar simulación» sigue desactivado; al corregir el valor, el siguiente cambio válido vuelve a calcular. Un «Reintentar» que devuelve 422 muestra el mensaje de la API y el botón desaparece. Un 422 sin `detail` de texto se trata como fallo de red y sí lleva «Reintentar».
- Cambiar almacenamiento o llamadas a la API: no hay llamada a `preview` y el desglose no cambia.
- Almacenamiento en 0 y 1 000 000, y llamadas en 0 y 1 000 000 000: válidos; con uno más, o -1, o decimal, o vacío: error de campo y «Guardar simulación» desactivado.
- Cambio de divisa sin nueva petición de precio: se reutilizan los importes EUR y el tipo en memoria.
- Elegir USD y luego GBP: una sola petición de tipos (devuelve ambos). Volver a EUR y a USD: ninguna petición nueva.
- Volver a la lista y abrir otro cliente: el tipo en memoria se conserva; al elegir USD o GBP no se vuelve a pedir. El detalle recién abierto empieza en EUR.
- Fallo de tipos con USD o GBP elegido: importes en EUR con aviso; el selector se mantiene en la divisa elegida para poder reintentar. Con EUR seleccionado no se ve el aviso. El fallo no se conserva en memoria.
- Respuesta de tipos en el límite de 5 s: a los 5 s sin respuesta se considera fallo; una respuesta tardía posterior se ignora.
- Tipo de cambio ausente, no numérico (`"abc"`, `null`) o menor o igual que 0 (`0`, `-1`): se trata como fallo de la API, con aviso y «Reintentar».
- Solo uno de los dos tipos inválido (USD válido y GBP inválido, o al revés) o `result` distinto de `"success"` (por ejemplo `"error"`) con ambos tipos válidos: toda la respuesta es un fallo, aunque el tipo de la divisa elegida sea válido; no se guarda nada y «Reintentar» vuelve a pedir ambos.
- Lectura del tipo con `String(n)`: el número `1.0829` da `"1.0829"` y `1.005` da `"1.005"` (sin cifras de coma flotante como `1.00499…`).
- Tipo cuyo texto contiene «e» (`1e-7`, `0.0000001` y `1e21`): inválido, toda la respuesta es un fallo.
- Reintento del tipo que vuelve a fallar: el aviso sigue visible y el botón sigue disponible.
- Subtotal e IVA convertidos por separado pueden sumar 0,01 de diferencia respecto a convertir el total: es lo esperado (R14, CA27 y CA28).
- Guardar con 1 usuario y con 10 000 usuarios: se envía el valor del campo.
- Pulsar «Guardar» dos veces: una sola petición.
- Guardar mientras se espera el cálculo, incluidos los 300 ms de espera tras un cambio: el botón está desactivado.
- Fallo al guardar (404, 422 o red): el historial no se recarga y el botón vuelve a estar activo.
- Guardado correcto pero fallo al recargar el historial: se ve «Simulación guardada.» y el error del historial con «Reintentar».
- Historial con fecha `created_at` `2026-11-15T10:00:00Z`: se ve «15/11/2026, 10:00» con el navegador en UTC y «15/11/2026, 11:00» en `Europe/Madrid` (invierno); la hora depende de la zona del navegador.
- Historial con muchas filas: sin paginación, se ven todas (supuesto de escala de la spec 001).
- Nombres o emails largos en la ficha no rompen el diseño. Pantalla de 375 px sin scroll horizontal.
- Backend caído al abrir la vista: error de cálculo (con «Reintentar») y error de historial, sin pantalla en blanco.

## Criterios de aceptación
Cada criterio indica cómo se comprueba. Los marcados «Vitest» se prueban con Vitest y `@vue/test-utils`: los de lógica sobre los composables (`usePricing`, tipo de cambio, guardado, historial) y la función `convertAmount`, los de interfaz sobre los componentes. CA37 es del auditor y CA38 es una comprobación visual, porque Vitest no mide diseños ni revisa código.

- [ ] CA1 (Vitest): dado un cliente seleccionado `{ id: 1, name: "Acme S.L.", country: "ES", tax_id: "12345678Z", email: "ventas@acme.com", plan: "business" }`, cuando se abre el detalle, entonces se ven la ficha con los cinco datos (plan «Business»), el simulador, el historial y el botón «Volver a clientes», y no se llama a `GET /customers/{id}`.
- [ ] CA2 (Vitest): dado el detalle abierto, entonces no hay control de plan ni de país en el simulador, y la llamada inicial a `preview` lleva exactamente `users` 1 y `country` `ES` (el del cliente).
- [ ] CA3 (Vitest): dado el simulador, entonces el slider tiene mínimo 1, máximo 200, paso 1 y valor 1, el campo numérico vale 1, y ambos tienen `<label>` asociado y `aria-label`.
- [ ] CA4 (Vitest): dado el slider y el campo numérico, cuando se mueve el slider a 150, entonces el campo dice 150; cuando se escribe 80 en el campo, el slider queda en 80; y cuando se escribe 500, el slider queda en 200, el campo conserva 500 y se calcula con 500.
- [ ] CA5 (Vitest): dado el campo numérico con 0, 10001, vacío o 1.5, entonces no se llama a `preview`, se ve «El número de usuarios debe ser un entero entre 1 y 10000.» y «Guardar simulación» está desactivado; con 10000 es válido.
- [ ] CA6 (Vitest): dado un desglose visible, cuando el campo numérico pasa a 0, 10001, vacío o 1.5, entonces desaparecen los importes (subtotal, IVA y total, en EUR y convertidos) y el indicador de carga, se ve solo el mensaje del campo y «Guardar simulación» sigue desactivado; si había un cálculo en curso, su respuesta tardía no vuelve a mostrar importes; al volver a un valor válido se calcula de nuevo y los importes reaparecen.
- [ ] CA7 (Vitest): dado el slider o el campo numérico, cuando se cambia varias veces seguidas en menos de 300 ms, entonces se hace una sola llamada a `preview` con el último valor y el país del cliente (test con temporizadores simulados).
- [ ] CA8 (Vitest): dadas dos peticiones de cálculo donde la primera responde después, entonces se muestra el resultado de la última.
- [ ] CA9 (Vitest): dado un cálculo en curso con usuarios válidos, entonces se ve el indicador de carga y el último importe sigue visible.
- [ ] CA10 (Vitest): dado un cambio válido de usuarios, cuando aún no han pasado 300 ms (temporizadores simulados), entonces «Guardar simulación» está desactivado; sigue desactivado mientras el cálculo está en curso y solo se activa cuando llega la respuesta correcta.
- [ ] CA11 (Vitest): dado un cambio en almacenamiento o en llamadas a la API, entonces no se llama a `preview` y los importes no cambian.
- [ ] CA12 (Vitest): dado almacenamiento o llamadas con -1, 1.5, vacío o por encima del máximo (1000001 y 1000000001), entonces se ve el error de campo con el mensaje de la spec 002 y «Guardar simulación» está desactivado; 0 y los máximos son válidos.
- [ ] CA13 (Vitest): dada la respuesta de `preview` (60 usuarios, ES), entonces se ven subtotal 470,00 €, IVA 98,70 € y total 568,70 € con formato `Intl.NumberFormat` en `es-ES`.
- [ ] CA14 (Vitest): dado un fallo de red o 5xx en `preview`, entonces se ve «No se pudo calcular el precio. Inténtalo de nuevo.», la pantalla sigue operativa, «Guardar simulación» está desactivado y el siguiente cambio válido de usuarios vuelve a calcular.
- [ ] CA15 (Vitest): dado un cálculo fallido por red o 5xx (un test para cada uno), entonces el botón «Reintentar» aparece junto al mensaje; cuando se pulsa, se repite la llamada a `preview` con el valor actual de usuarios y el país del cliente; si responde bien, desaparecen mensaje y botón, se ven los importes y «Guardar simulación» se activa; si vuelve a fallar por red o 5xx, mensaje y botón siguen y no hay reintentos automáticos; y si los usuarios pasan a ser inválidos, el mensaje de fallo y el botón se ocultan.
- [ ] CA16 (Vitest): dado un cálculo fallido por red o 5xx con «Reintentar» visible, cuando se cambia el valor de usuarios a otro válido (queda una espera de 300 ms pendiente, con temporizadores simulados) y se pulsa «Reintentar» antes de que pasen los 300 ms, entonces se cancela la espera, se hace una sola llamada a `preview` con el valor nuevo y el país del cliente, y al avanzar los temporizadores no se hace una segunda llamada.
- [ ] CA17 (Vitest): dado un 422 de `preview` con `detail` de texto, entonces se muestra su mensaje en español, no hay botón «Reintentar», «Guardar simulación» está desactivado y el siguiente cambio válido de usuarios vuelve a calcular; dado un «Reintentar» que devuelve 422, entonces se ve el mensaje de la API y el botón desaparece; y dado un 422 sin `detail` de texto, entonces se trata como fallo de red («No se pudo calcular el precio. Inténtalo de nuevo.») y sí lleva «Reintentar».
- [ ] CA18 (Vitest): dado «Guardar simulación» con cálculo correcto, entonces se llama a `POST /simulations` con exactamente `customer_id`, `users`, `storage_gb` y `api_calls` (sin plan, país ni importes), y con 201 se ve «Simulación guardada.» y se vuelve a pedir `GET /customers/{id}/simulations`.
- [ ] CA19 (Vitest): dado un cálculo en curso (incluida la espera de 300 ms), un cálculo fallido, un campo inválido o un guardado en curso, entonces «Guardar simulación» está desactivado; y dos clics seguidos producen una sola llamada a `POST /simulations`.
- [ ] CA20 (Vitest): dado un 404, un 422 o un fallo de red al guardar, entonces se ven respectivamente «Cliente no encontrado.», el mensaje de la API y «No se pudo guardar la simulación. Inténtalo de nuevo.», el historial no se recarga y el botón vuelve a estar activo; y un 422 sin `detail` de texto se ve como el fallo de red.
- [ ] CA21 (Vitest): dado el historial con dos simulaciones, entonces cada fila muestra fecha y hora, usuarios, almacenamiento, llamadas a la API, subtotal, IVA y total en EUR tal como se guardaron, la nota «Importes en EUR», el orden es exactamente el que devuelve la API, y elegir USD en el simulador no cambia las filas.
- [ ] CA22 (Vitest): dada una simulación con `created_at` `2026-11-15T10:00:00Z`, entonces la fecha de la fila se ve en formato `es-ES` con fecha y hora, «15/11/2026, 10:00» con la zona horaria del entorno de pruebas fijada en UTC y «15/11/2026, 11:00» con `Europe/Madrid`, sin segundos.
- [ ] CA23 (Vitest): dado el historial, entonces se ve «Cargando historial…» mientras se pide, «No se pudo cargar el historial. Inténtalo de nuevo.» con «Reintentar» tras un fallo (al pulsarlo se vuelve a pedir), y «Aún no hay simulaciones.» con una lista vacía.
- [ ] CA24 (Vitest): dado el detalle recién abierto, entonces la divisa es EUR, no se pide el tipo de cambio y los importes no se convierten.
- [ ] CA25 (Vitest): dado que se elige USD, luego GBP y luego USD, entonces el tipo de cambio se pide una sola vez (una petición sirve para USD y GBP).
- [ ] CA26 (Vitest): dado que ya se pidió el tipo de cambio, cuando se vuelve a la lista, se abre otro cliente y se elige USD (o GBP), entonces no se vuelve a pedir y los importes se convierten con el tipo en memoria; el detalle del otro cliente empieza en EUR.
- [ ] CA27 (Vitest): dado el selector en USD con tipo fijo 1.0829 y el desglose en EUR 470.00, 98.70 y 568.70, entonces se ven subtotal 508,96, IVA 106,88 y total 615,84 (suma de ambos convertidos), no 615,85.
- [ ] CA28 (Vitest): dada la función `convertAmount` (`src/utils/currency.ts`), entonces, con el tipo como texto decimal: `"470.00"` × 1.0829 da `"508.96"`; `"98.70"` × 1.0829 da `"106.88"`; `"568.70"` × 1.0829 da `"615.85"` (el total convertido directamente difiere en 0,01 de la suma, 615,84); `"1.00"` × 1.005 da `"1.01"` y `"0.03"` × 1.5 da `"0.05"` (ROUND_HALF_UP, sin errores de coma flotante).
- [ ] CA29 (Vitest): dado que, para varios tipos fijos y desgloses (el del CA13 y 108,00 / 20,52 / 128,52 de DE), se elige USD o GBP, entonces subtotal convertido más IVA convertido es siempre igual al total mostrado.
- [ ] CA30 (Vitest): dado que la petición del tipo falla o no responde en 5 s (temporizadores simulados; a los 4999 ms aún no hay aviso y a los 5000 ms sí), entonces se ven los importes en EUR, «No se pudo obtener el tipo de cambio. Se muestran los importes en EUR.» y «Reintentar», sin romper la pantalla; el selector se queda en USD o GBP; con EUR seleccionado no se ve el aviso; y una respuesta posterior a los 5 s se ignora.
- [ ] CA31 (Vitest): dada una respuesta de tipos con `rates.USD` o `rates.GBP` ausente, no numérico (`"abc"`, `null`) o menor o igual que 0 (`0`, `-1`), entonces se trata como fallo de la API: aviso, importes en EUR y «Reintentar» (un test por valor), y el fallo no se guarda en memoria.
- [ ] CA32 (Vitest): dada una respuesta de tipos con `result` distinto de `"success"` (por ejemplo `"error"`) y ambos tipos válidos, o con un tipo válido y el otro inválido (USD válido y GBP inválido, y al revés), cuando se elige la divisa del tipo válido, entonces toda la respuesta cuenta como fallo (aviso, importes en EUR y «Reintentar») y no se guarda ningún tipo en memoria, ni siquiera el válido; y tras «Reintentar» con una respuesta correcta se ven los importes convertidos (un test por caso).
- [ ] CA33 (Vitest): dado el aviso del tipo de cambio, cuando se pulsa «Reintentar», entonces se vuelve a pedir; si responde bien, se ven los importes convertidos y desaparece el aviso; si falla, el aviso sigue y no hay reintentos automáticos.
- [ ] CA34 (Vitest): dada una respuesta de tipos con `result` `"success"`, `rates.USD` `1.0829` y `rates.GBP` `1.005` (números JSON), cuando el composable del tipo de cambio la lee, entonces los textos de los tipos son exactamente `"1.0829"` y `"1.005"` (`String(n)`) y la respuesta es válida.
- [ ] CA35 (Vitest): dada una respuesta de tipos en la que `rates.USD` o `rates.GBP` es `1e-7`, `0.0000001` o `1e21` (su `String(n)` contiene «e»), entonces ese tipo se trata como inválido y toda la respuesta cuenta como fallo: aviso, importes en EUR, «Reintentar» y nada guardado en memoria (un test por valor).
- [ ] CA36 (Vitest): dados `usePricing`, el composable del tipo de cambio, `convertAmount` y el guardado y el historial, entonces tienen tests Vitest de: `usePricing` (espera de 300 ms, cancelación y descarte de respuestas antiguas, usuarios inválidos, errores y reintento: CA5 a CA10 y CA14 a CA17), tipo de cambio (una sola petición, conservación en memoria, 5 s, tipo inválido, reintento y lectura con `String(n)`: CA25, CA26 y CA30 a CA35), conversión (CA28 y CA29) y guardado e historial (CA18 a CA23).
- [ ] CA37 (auditor): dado el código de `frontend/src/`, entonces no hay fórmula de tramos ni de IVA, y la única aritmética de dinero es `convertAmount` (R14 y R15), sin coma flotante en los importes; el tipo se lee con `String(n)`, sin `response.text()` ni `reviver` (R15). Una conversión de divisa correcta no es una violación de «sin fórmulas de precio»; cualquier otro cálculo de importes, sí. Tampoco hay dependencias nuevas sin aviso a Pablo.
- [ ] CA38 (comprobación visual): dado un ancho de 375 px, entonces ficha, simulador e historial se ven sin desbordes horizontales, con foco visible en slider, campos y botones y contraste suficiente.
- [ ] CA39 (Vitest): dado el simulador, entonces hay un enlace con el texto exacto «Rates By Exchange Rate API» y `href` `https://www.exchangerate-api.com`, visible con EUR (detalle recién abierto, sin petición de tipos), con USD o GBP elegido, y también cuando la petición del tipo de cambio falla o no responde en 5 s (R20).

## Cambios de Pablo
Primera ronda, 2026-11-15, por decisión de Pablo:
- Título y objetivo: la spec pasa a llamarse «004 · Frontend: detalle del cliente, simulador e historial» y cubre ficha, simulador e historial (el archivo se llama ahora `004-frontend-detalle-simulador.md`; ver la Segunda ronda).
- Vista de detalle: se abre desde una tarjeta de la spec 003 y contiene ficha, simulador e historial; los datos son los de la tarjeta, sin llamar a `GET /customers/{id}`; hay botón «Volver a clientes» (R1, Entradas).
- Plan y país: el plan se muestra en la ficha desde el cliente, solo informativo, y ya no es campo del simulador ni se envía a `POST /simulations`; el país sale del cliente y no se puede cambiar (R2, R3). Cierra las preguntas sobre el campo plan y el país.
- Usuarios: slider de 1 a 200, paso 1, y campo numérico sincronizado de 1 a 10 000, valor inicial 1, ambos con `<label>` y `aria-label`; con valor vacío o fuera de rango no hay cálculo y se ve «El número de usuarios debe ser un entero entre 1 y 10000.» (R4, R5). Cierra la pregunta del máximo y el paso del slider.
- Informativos: almacenamiento (GB) y llamadas a la API son campos numéricos obligatorios, enteros, valor inicial 0, máximos 1 000 000 y 1 000 000 000; se guardan sin disparar el cálculo; inválidos dan error de campo con los mensajes de la spec 002 y desactivan «Guardar simulación» (R6). Cierra la pregunta de los campos informativos.
- Cálculo: `POST /simulations/preview` con `users` y el país del cliente, espera de 300 ms tras el último cambio, descarte de respuestas antiguas, e importe anterior visible con indicador de carga (R7, R8).
- Guardado: `POST /simulations` con `customer_id`, `users`, `storage_gb` y `api_calls` (nunca plan, país ni importes); desactivado durante cálculo, tras fallo de cálculo, con campos inválidos y mientras guarda; tras 201, «Simulación guardada.» y recarga del historial; 404, 422 y fallo de red con sus mensajes (R9, Errores).
- Divisa: EUR por defecto, USD y GBP; el tipo se pide una sola vez, la primera vez que se elige USD o GBP, y se guarda en memoria; sin respuesta en 5 s o con fallo, importes en EUR con aviso y botón «Reintentar»; la conversión se hace en el frontend (R11 a R13). Cierra las preguntas de dónde se convierte, el tiempo de espera y el reintento.
- Conversión: subtotal e IVA se convierten por separado (a 2 decimales, ROUND_HALF_UP) y el total mostrado es su suma; sin coma flotante en los importes; formato con `Intl.NumberFormat` en `es-ES`; lo guardado sigue siendo EUR; criterio con tipo fijo y caso de redondeo donde el total convertido directamente difiere en 0,01 (R14, R15, CA21, CA22; numeración de la Primera ronda, ahora CA27 y CA28). Cierra la pregunta de conversión y suma.
- Historial: `GET /customers/{id}/simulations`, más reciente primero, con fecha (`es-ES`), usuarios, almacenamiento, llamadas a la API, subtotal, IVA y total en EUR como se guardaron, nota «Importes en EUR» y estados cargando, error con «Reintentar» y «Aún no hay simulaciones.»; sin conversión a otra divisa (R10). Cierra la pregunta del historial.
- Criterios de aceptación: nuevos y ajustados para detalle, campo sincronizado, rangos, informativos, guardado, historial, fallos, reintento y conversión; CA renumerados de CA1 a CA28; marcados cuáles son de Vitest, del auditor y visuales. CA13 anterior (sin fórmulas en `src/`) pasa a ser comprobación del auditor (entonces CA27, ahora CA37) y deja de ser un test de Vitest; la comprobación permite la función de conversión de divisa. Vitest cubre `usePricing`, el tipo de cambio, la conversión y el guardado y el historial (entonces CA26, ahora CA36).
- Pregunta sobre los textos en español de los planes: ya resuelta en el ADR 005; la spec los remite a él (no es una decisión nueva de esta ronda).
- ADR 007 y skill `reglas-negocio` (solo la parte de divisas): alineados con la conversión en el frontend, los 5 s, el reintento y «convertir por partes y sumar».

Segunda ronda, 2026-11-15, por decisión de Pablo (las referencias a CA están actualizadas a la numeración actual, tras la Tercera ronda):
- Renombrado: el archivo se llama `004-frontend-detalle-simulador.md` (antes `004-frontend-simulador.md`). Corregida la línea de la Primera ronda que decía que conservaba el nombre antiguo; no quedan más menciones del nombre antiguo en las cuatro specs ni en el ADR 007.
- a) Cálculo fallido: muestra un botón «Reintentar» junto al mensaje que repite la petición con el valor actual de usuarios (Entradas, R8, Errores, CA15; CA14 y CA17 ajustados). Lo leo como válido para cualquier fallo del cálculo (red, 5xx o 422). Sustituido en la Tercera ronda: solo en red o 5xx.
- b) Usuarios inválidos: se ocultan los importes y se muestra solo el mensaje del campo, sin dejar el importe antiguo; «Guardar» sigue desactivado (R5, Salidas, Casos límite, CA6).
- c) «Guardar» también está desactivado durante la espera de 300 ms (R9, Casos límite, CA10).
- d) Un tipo de cambio ausente, no numérico o menor o igual que 0 cuenta como fallo de la API (R13, Errores, Casos límite, CA31).
- e) La fecha del historial lleva fecha y hora en formato `es-ES` («15/11/2026, 10:00») en la zona horaria del navegador (Salidas, R10, Casos límite, CA22).
- f) El tipo de cambio en memoria se conserva al volver a la lista y abrir otro cliente (R12, Casos límite, CA26).
- g) Reglas firmes (ya no son supuestos): una sola petición de tipos para USD y GBP (R12, CA25); el selector se queda en USD o GBP tras un fallo (R13, CA30); el historial se muestra en el orden de la API (R10, CA21); sin recarga del historial si falla el guardado (R9, CA20); textos propios para los fallos de red y 5xx; un 422 sin `detail` se trata como fallo de red (R19, CA17 y CA20).
- h) La función de conversión es `convertAmount`, en `src/utils/currency.ts` (R15, R17, R18, CA28, CA37).
- i) Renumeración de los CA (numeración de la Segunda ronda; la de la Tercera ronda está abajo): los antiguos CA1 a CA5 se mantienen; CA6 pasa a CA7; CA7 a CA8; CA8 a CA9; CA9 a CA11; CA10 a CA12; CA11 a CA13; CA12 a CA14; CA13 a CA16; CA14 a CA17; CA15 a CA18; CA16 a CA19; CA17 a CA20; CA18 a CA22; CA19 a CA23; CA20 a CA24 (la parte de volver a la lista y abrir otro cliente, a CA25); CA21 a CA26; CA22 a CA27; CA23 a CA28; CA24 a CA29; CA25 a CA31; CA26 a CA32; CA27 a CA33; CA28 a CA34. Nuevos: CA6, CA10, CA15, CA21, CA25 y CA30. Añadidas dos preguntas abiertas.

Tercera ronda, 2026-11-15, por decisión de Pablo:
- «Reintentar» del cálculo con una espera de 300 ms pendiente: cancela la espera y hace una sola petición con el valor actual (Entradas, R8, Casos límite, CA16). Cierra la primera pregunta abierta.
- Tipo de cambio: si solo uno de los dos tipos (USD, GBP) es inválido o `result` no es `"success"`, toda la respuesta cuenta como fallo (EUR con aviso y «Reintentar»; no se guarda nada) (R12, R13, Errores, Casos límite, CA32). Cierra la segunda pregunta abierta.
- «Reintentar» del cálculo solo aparece en fallos de red o 5xx; con un 422 de `preview` se muestra el mensaje de la API y no hay «Reintentar», el usuario corrige el valor (Entradas, R8, R9, R19, Errores, Casos límite, CA15 y CA17). Sustituye la interpretación a) de la Segunda ronda.
- Lectura del tipo sin coma flotante: `String(n)` del número leído, con tests (1.0829 y 1.005); si el texto contiene «e», el tipo es inválido; el ADR 007 descarta `response.text()` y `reviver` (R13, R15, Casos límite, CA34, CA35 y CA37).
- Preguntas abiertas: todas cerradas; se elimina la sección. ADR 007 alineado (decisión de lectura y preguntas cerradas).
- Renumeración de los CA (numeración de la Tercera ronda, la actual): CA1 a CA15 se mantienen (CA15 ajustado a red o 5xx); nuevo CA16 (reintentar con espera pendiente); los antiguos CA16 a CA30 pasan a CA17 a CA31 (el antiguo CA16 es ahora CA17, ajustado a «422 sin Reintentar»); nuevo CA32 (un tipo inválido o `result` distinto de `"success"`); el antiguo CA31 pasa a CA33; nuevos CA34 (`String(n)`) y CA35 (texto con «e»); CA32 pasa a CA36, CA33 a CA37 y CA34 a CA38. Las referencias internas a CA (intro de criterios, Casos límite, CA36 y rondas anteriores) están actualizadas.

Cuarta ronda, 2026-11-15, posterior a la aprobación, por decisión de Pablo a raíz de la auditoría 006:
- Atribución de los tipos de cambio: los términos de uso de `open.er-api.com` exigen mostrar un enlace «Rates By Exchange Rate API» a `https://www.exchangerate-api.com` dondequiera que se usen sus tipos (fuente: https://www.exchangerate-api.com/docs/free). Nueva regla R20 y nuevo criterio CA39 (Vitest); el enlace es visible siempre en el simulador, con cualquier divisa y con la API respondiendo o fallando. No se renumera nada ni cambia ninguna otra decisión. El Estado de la spec no cambia. ADR 007 actualizado (nota de términos de uso cerrada).

Revisión de Pablo: el total en otra divisa es la suma del subtotal y el IVA ya convertidos, así el desglose siempre cuadra aunque difiera un céntimo del total convertido directamente.
