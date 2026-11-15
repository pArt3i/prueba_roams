# 002 · Precio y simulaciones
Estado: Aprobada
Fecha: 2026-11-15
Objetivo: calcular el precio mensual en el backend, guardar simulaciones de un cliente y consultar su historial.

## Contexto y alcance
Entra: `POST /simulations/preview` (calcula sin guardar), `POST /simulations` (calcula y guarda) y `GET /customers/{id}/simulations`. Referencias: [ADR 002](../02-arquitectura/002-calculo-precio-backend.md), [003](../02-arquitectura/003-iva-por-pais.md), [004](../02-arquitectura/004-almacenamiento-y-llamadas-api.md) y [005](../02-arquitectura/005-planes-informativos.md) (el plan es un atributo del cliente). Formato de errores y normalización de `country`: igual que la [spec 001](001-clientes.md).
No entra: conversión de divisa (ADR 007 y spec 004; aquí todo es EUR), clientes (spec 001) ni interfaz. Las reglas de tramos, IVA y redondeo están en la skill `reglas-negocio` y no se repiten aquí. Si la skill cambia, gana la skill; los valores de los criterios salen de sus ejemplos resueltos.
El plan pertenece al cliente (spec 001, R11), es informativo y no cambia el precio. Las simulaciones no lo reciben, no lo guardan y no lo devuelven.

## Entradas
Los dos `POST` exigen un cuerpo JSON que sea un objeto (R18). Los enteros se aceptan solo como enteros JSON (R12). Los campos desconocidos se ignoran en todos los endpoints (R14).

`POST /simulations/preview`:

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `users` | entero | Sí | Entre 1 y 10 000; si no, 422 |
| `country` | string | Sí | Código de la tabla de `iva.md`; se acepta en minúsculas y se devuelve en mayúsculas; ausente o vacío, 422; otro valor, 422 |

`POST /simulations`:

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `customer_id` | entero | Sí | Debe existir; el país sale siempre del cliente (R13) |
| `users` | entero | Sí | Entre 1 y 10 000 |
| `storage_gb` | entero | Sí | Entre 0 y 1 000 000; se guarda; no cambia el precio; sin valor por defecto |
| `api_calls` | entero | Sí | Entre 0 y 1 000 000 000; se guarda; no cambia el precio; sin valor por defecto |

`GET /customers/{id}/simulations`: `id` entero. Ningún endpoint acepta importes del cliente.

## Salidas
`preview` devuelve 200 con exactamente estas claves (ejemplo: 60 usuarios, ES; importes de la skill):

```json
{ "users": 60, "country": "ES", "currency": "EUR", "vat_rate": "0.21",
  "subtotal": "470.00", "vat": "98.70", "total": "568.70" }
```

`POST /simulations` devuelve 201 con exactamente estas claves: `id`, `customer_id`, `users`, `storage_gb`, `api_calls`, `country`, `currency`, `vat_rate`, `subtotal`, `vat`, `total` y `created_at`:

```json
{ "id": 7, "customer_id": 1, "users": 60, "storage_gb": 100, "api_calls": 5000,
  "country": "ES", "currency": "EUR", "vat_rate": "0.21",
  "subtotal": "470.00", "vat": "98.70", "total": "568.70",
  "created_at": "2026-11-15T10:00:00Z" }
```

`GET /customers/{id}/simulations` devuelve 200 con una lista de objetos con esas mismas claves, más reciente primero y sin paginar (`[]` si no hay simulaciones). Lee lo guardado y nunca recalcula (R15).

Formatos (R16): `subtotal`, `vat` y `total` son texto con dos decimales (`"470.00"`); `vat_rate` es texto decimal (`"0.21"`); `currency` es siempre `"EUR"`; `created_at` es ISO 8601 en UTC con `Z`. Ningún importe ni tipo es un número JSON.

Todos los errores, también los de validación, devuelven `{"detail": "texto en español"}` (R17).

## Reglas de negocio
Los identificadores no se renumeran: R6 (el plan en la simulación) se retiró y no se reutiliza.
- R1: el subtotal se calcula con los tramos acumulativos de `reglas-negocio`, con `Decimal`.
- R2: IVA y total según `reglas-negocio` con el tipo del país (`iva.md`), redondeo ROUND_HALF_UP a 2 decimales.
- R3: `users` es un entero entre 1 y 10 000, en `preview` y en `POST /simulations`; cualquier otro valor da 422.
- R4: `country` de `preview` debe estar en la tabla de `iva.md`; se compara sin distinguir mayúsculas y se devuelve en mayúsculas (`es` da `ES`, como en la spec 001, R1). Ausente o vacío, 422; fuera de la tabla, 422.
- R5: `storage_gb` (entero entre 0 y 1 000 000) y `api_calls` (entero entre 0 y 1 000 000 000) son obligatorios en `POST /simulations` y no tienen valor por defecto; ausentes, 422. Se guardan y no afectan a subtotal, IVA ni total (ADR 004).
- R7: `preview` solo recibe `users` y `country`, y no escribe en la base de datos.
- R8: `POST /simulations` recalcula el precio en el servidor; los importes guardados son EUR en céntimos enteros y nunca se aceptan del cliente: un `total` (u otro importe) enviado en el cuerpo es un campo desconocido y se ignora (R14).
- R9: `POST /simulations` con un `customer_id` entero que no existe da 404 y no guarda nada.
- R10: el historial (`GET /customers/{id}/simulations`) devuelve solo las simulaciones del cliente indicado, ordenadas por `created_at` descendente y, si empatan, por `id` descendente, sin paginación. Cliente inexistente, 404.
- R11: las simulaciones guardadas no se modifican ni se borran: no existe ningún endpoint para modificarlas ni borrarlas.
- R12: coerción estricta: `customer_id`, `users`, `storage_gb` y `api_calls` solo se aceptan como enteros JSON. Se rechazan con 422 las cadenas numéricas (`"10"`), los decimales aunque valgan un entero (`10.0`, `1e1`), los booleanos (`true`) y `null`.
- R13: en `POST /simulations` el país sale siempre del cliente. Si el cuerpo trae `country`, se ignora.
- R14: los campos desconocidos del cuerpo se ignoran en todos los endpoints (igual que en la spec 001, R17): no dan error, no se guardan ni se devuelven. Por eso un importe enviado por el cliente nunca se usa, y un `plan` o un `id` enviados tampoco.
- R15: snapshot: cada simulación guarda, en el momento de crearse, `country`, `vat_rate` (texto decimal), subtotal, IVA y total (céntimos enteros). El historial lee lo guardado y nunca recalcula; un cambio posterior en la tabla de IVA no lo altera (ADR 003).
- R16: formatos de la API: importes como texto con dos decimales, `vat_rate` como texto decimal y `created_at` en ISO 8601 UTC con `Z`. En base de datos los importes van en céntimos enteros; la conversión a texto se hace al devolverlos.
- R17: todo error devuelve `{"detail": "texto en español"}` con `detail` como string, igual que la spec 001 (R13). Solo se devuelve el primer error. Orden de comprobación en `POST /simulations`: cuerpo (R18), después validación de `customer_id`, `users`, `storage_gb` y `api_calls`, en ese orden, y por último el 404 por cliente inexistente. En `preview`: cuerpo, `users` y `country`. Una petición fallida no guarda nada.
- R18: si el cuerpo de un `POST` no es JSON válido (también si falta o está vacío) o no es un objeto (`[]`, `"x"`, `123`, `null`), 422 «Cuerpo de la petición no válido.». Es lo primero que se comprueba.

## Errores
Primero R18 y después, en el orden de R17:

| Situación | Código HTTP | Mensaje |
| --- | --- | --- |
| Cuerpo que no es JSON válido o no es un objeto (`POST`) | 422 | Cuerpo de la petición no válido. |
| `customer_id` ausente, `null`, no entero o de tipo incorrecto | 422 | Identificador de cliente no válido. |
| `id` no entero en `GET /customers/{id}/simulations` | 422 | Identificador de cliente no válido. |
| `users` ausente, `null`, no entero, de tipo incorrecto o fuera de 1 a 10 000 | 422 | El número de usuarios debe ser un entero entre 1 y 10000. |
| `storage_gb` ausente, `null`, no entero, de tipo incorrecto o fuera de 0 a 1 000 000 | 422 | El almacenamiento debe ser un entero entre 0 y 1000000. |
| `api_calls` ausente, `null`, no entero, de tipo incorrecto o fuera de 0 a 1 000 000 000 | 422 | Las llamadas a la API deben ser un entero entre 0 y 1000000000. |
| `country` de `preview` ausente, vacío, `null` o de tipo incorrecto | 422 | El país es obligatorio. |
| `country` de `preview` fuera de la tabla | 422 | País no admitido. |
| Cliente inexistente | 404 | Cliente no encontrado. |

## Casos límite
- Fronteras de tramo: 1, 10, 11, 50 y 51 usuarios. Cotas de `users`: 1 y 10 000 válidos; 0 y 10 001 no.
- `users` = 0, -1, 1.5, `"abc"`, `"10"`, `10.0`, `1e1`, `null`, `true` y ausente: 422. Lo mismo, con el mensaje de su campo, para `customer_id`, `storage_gb` y `api_calls`.
- `storage_gb` = 0 y `api_calls` = 0 son válidos; -1 no. `storage_gb` = 1 000 000 y `api_calls` = 1 000 000 000 son válidos; con uno más, 422.
- `storage_gb` o `api_calls` ausentes: 422, no valen 0 por defecto.
- `country` en el cuerpo de `POST /simulations`: se ignora, aunque sea inválido (`XX`) o distinto del país del cliente.
- Campos desconocidos (`plan`, `total`, `id`, `foo`), en `preview` y en `POST /simulations`: se ignoran; no aparecen en la respuesta.
- `country` en minúsculas en `preview` (`es`): 200 con `ES`.
- `customer_id` entero que no existe (0, negativo, o mayor que el entero máximo de la base de datos): 404, nunca 500.
- Petición con varios campos inválidos: solo el primer error según R17, y con un `customer_id` inexistente y `users` = 0 gana el 422 de `users`.
- Cuerpo ausente, vacío, JSON roto o no objeto: 422 «Cuerpo de la petición no válido.».
- Con los tipos actuales el IVA siempre sale exacto (subtotal en euros enteros), así que ROUND_HALF_UP no se observa: hace falta un test unitario del redondeo con un valor forzado.
- Cliente sin simulaciones: historial 200 con `[]`.
- Dos simulaciones con el mismo `created_at`: salen por `id` descendente.
- Mismo cálculo con distinto `storage_gb` o `api_calls`: importes idénticos.
- Cambio posterior del tipo de IVA de un país: el historial conserva los valores originales; una simulación nueva usa el tipo nuevo.
- Petición fallida (422 o 404): no se guarda ninguna fila.
- Ningún importe pasa por `float` en el servicio.

## Criterios de aceptación
Salvo que se indique otra cosa, `POST /simulations` lleva `customer_id` de un cliente existente, `users`, `storage_gb` y `api_calls` válidos. Los criterios de `users` valen para `preview` y para `POST /simulations`.

- [ ] CA1: dada cada fila de «Ejemplos resueltos» de `reglas-negocio`, cuando se llama a `preview` con ES y esos usuarios, entonces el `subtotal` es el de la fila, con dos decimales (un test por fila).
- [ ] CA2: dada cada fila de la tabla de IVA de `reglas-negocio` (usuarios, país), cuando se llama a `preview`, entonces `subtotal`, `vat` y `total` son los de la fila, con dos decimales, y `vat_rate` es el tipo de `iva.md` en texto decimal (`"0.21"`, `"0.19"`, `"0.23"`).
- [ ] CA3: dado cada país de `iva.md` (incluidos FR e IT) y 10 usuarios, cuando se llama a `preview`, entonces `vat_rate` es su tipo en texto decimal, `vat` es el subtotal por ese tipo y `total` es subtotal más IVA.
- [ ] CA4: dado 60 usuarios y ES, cuando se llama a `preview`, entonces la respuesta tiene exactamente las claves `users`, `country`, `currency`, `vat_rate`, `subtotal`, `vat` y `total`, `currency` es `"EUR"`, `users` es un entero y los importes y `vat_rate` son cadenas (ejemplo de Salidas).
- [ ] CA5: dado `users` 10000, cuando se llama a `preview` con ES, entonces 200 con `subtotal` `"50170.00"` (fórmula de la skill: 100 + 320 + 49750); con 10001, 422 con «El número de usuarios debe ser un entero entre 1 y 10000.».
- [ ] CA6: dado `users` 0, -1, 1.5, `"abc"`, `true`, `null` o ausente, cuando se llama a `preview`, entonces 422 con «El número de usuarios debe ser un entero entre 1 y 10000.» (un test por valor).
- [ ] CA7: dado `users` `"10"` (cadena), cuando se llama a `preview` o a `POST /simulations`, entonces 422 con el mismo mensaje y, en el `POST`, no se guarda nada.
- [ ] CA8: dado `users` `10.0` (decimal), cuando se llama a `preview` o a `POST /simulations`, entonces 422 con el mismo mensaje y, en el `POST`, no se guarda nada.
- [ ] CA9: dado `country` `XX`, cuando se llama a `preview`, entonces 422 con «País no admitido.»; dado `country` ausente, vacío o `null`, entonces 422 con «El país es obligatorio.».
- [ ] CA10: dado `country` `es` y 60 usuarios, cuando se llama a `preview`, entonces 200 con `country` `"ES"` y los importes de ES.
- [ ] CA11: dada una llamada a `preview`, cuando termina, entonces no hay simulaciones nuevas en la base de datos.
- [ ] CA12: dado un cuerpo de `preview` con `storage_gb`, `plan` y `total` además de `users` y `country`, cuando se llama, entonces 200, la respuesta es idéntica a la de la llamada sin esos campos y no los contiene.
- [ ] CA13: dado un cliente ES, cuando se hace `POST /simulations` válido, entonces 201, la respuesta tiene exactamente las claves `id`, `customer_id`, `users`, `storage_gb`, `api_calls`, `country`, `currency`, `vat_rate`, `subtotal`, `vat`, `total` y `created_at` (sin `plan`), los importes coinciden con `preview` para esos usuarios y ES, y la simulación aparece en el historial del cliente.
- [ ] CA14: dado un cliente ES, cuando se hace `POST /simulations` con `country` `DE` (o `XX`) en el cuerpo, entonces 201 con `country` `"ES"` y el IVA de ES.
- [ ] CA15: dadas dos simulaciones del mismo cliente con los mismos usuarios y distintos `storage_gb` y `api_calls`, entonces subtotal, IVA y total son iguales y cada una devuelve sus valores de `storage_gb` y `api_calls`.
- [ ] CA16: dados `storage_gb` 0 y `api_calls` 0, cuando se hace `POST /simulations`, entonces 201.
- [ ] CA17: dados `storage_gb` 1000000 y `api_calls` 1000000000, cuando se hace `POST /simulations`, entonces 201 y se devuelven esos valores.
- [ ] CA18: dado `storage_gb` 1000001, o `api_calls` 1000000001, cuando se hace `POST /simulations`, entonces 422 con «El almacenamiento debe ser un entero entre 0 y 1000000.» o «Las llamadas a la API deben ser un entero entre 0 y 1000000000.», y no se guarda nada.
- [ ] CA19: dado un cuerpo sin `storage_gb`, o sin `api_calls`, cuando se hace `POST /simulations`, entonces 422 con el mensaje de ese campo y no se guarda nada (un test por campo).
- [ ] CA20: dado `storage_gb` o `api_calls` con -1, 1.5, `"5"`, `5.0`, `true` o `null`, cuando se hace `POST /simulations`, entonces 422 con el mensaje de ese campo y no se guarda nada (un test por campo y valor).
- [ ] CA21: dado `customer_id` `"1"`, `1.0`, `true`, `null`, `"abc"` o ausente, cuando se hace `POST /simulations`, entonces 422 con «Identificador de cliente no válido.» y no se guarda nada.
- [ ] CA22: dado un `customer_id` entero inexistente, cuando se hace `POST /simulations`, entonces 404 con «Cliente no encontrado.» y no se guarda nada.
- [ ] CA23: dado un cuerpo válido con `total` `"1.00"`, `id` 99 y `plan` `gold` además de los campos requeridos, cuando se hace `POST /simulations`, entonces 201, el `total` guardado y devuelto es el calculado por el servidor, el `id` no es 99 y la respuesta no contiene `plan`.
- [ ] CA24: dado un cuerpo con `customer_id` inexistente y `users` 0, cuando se hace `POST /simulations`, entonces 422 de `users` y no 404; y dado un cuerpo con `users`, `storage_gb` y `api_calls` inválidos a la vez, entonces solo sale el error de `users`, y corrigiendo cada campo salen `storage_gb` y `api_calls`, uno por respuesta.
- [ ] CA25: dado un cuerpo que no es JSON válido (`{"users":`), está vacío o no es un objeto (`[]`, `"x"`, `123`, `null`), cuando se llama a `preview` o a `POST /simulations`, entonces 422 con «Cuerpo de la petición no válido.» y no se guarda nada.
- [ ] CA26: dado cualquier error (422 o 404), cuando se recibe la respuesta, entonces el cuerpo es `{"detail": "..."}` con `detail` string en español, no una lista.
- [ ] CA27: dadas simulaciones de dos clientes, cuando se consulta el historial de uno, entonces solo aparecen las suyas.
- [ ] CA28: dado un cliente sin simulaciones, cuando se consulta su historial, entonces 200 con `[]`.
- [ ] CA29: dado un id de cliente inexistente, cuando se consulta el historial, entonces 404 con «Cliente no encontrado.»; dado un id no entero (`abc`), entonces 422 con «Identificador de cliente no válido.».
- [ ] CA30: dadas dos simulaciones del mismo cliente creadas con el reloj controlado, cuando se consulta el historial, entonces (a) con `created_at` distintos, sale primero la más reciente, y (b) con el mismo `created_at`, sale primero la de mayor `id` (un test por variante).
- [ ] CA31: dada una simulación creada, cuando se consulta el historial, entonces el elemento tiene exactamente las mismas claves y valores que la respuesta del `POST /simulations`.
- [ ] CA32: dada una simulación creada para un cliente ES, cuando se cambia (con `monkeypatch`) el tipo de IVA de ES en la tabla y se consulta el historial, entonces devuelve los valores originales (`vat_rate`, `subtotal`, `vat` y `total`); una simulación nueva usa el tipo nuevo.
- [ ] CA33: dada una simulación de 60 usuarios para un cliente ES, cuando se lee la fila guardada, entonces subtotal, IVA y total son enteros en céntimos (47000, 9870 y 56870) y el tipo de IVA es el texto `"0.21"`.
- [ ] CA34: dado `created_at` de una simulación, cuando se devuelve, entonces es una cadena ISO 8601 que termina en `Z` y se interpreta como UTC.
- [ ] CA35: dado un valor forzado que exija redondeo (test unitario del servicio), entonces se aplica ROUND_HALF_UP a 2 decimales.
- [ ] CA36: dados importes y tipos de IVA en cualquier endpoint, cuando se serializa la respuesta, entonces ninguno es un número JSON (siempre cadena).

## Cambios de Pablo
Primera ronda, 2026-11-15, por decisión de Pablo:
- Formatos: importes como texto con dos decimales (`"470.00"`), `vat_rate` como texto decimal (`"0.21"`), `created_at` en ISO 8601 UTC con `Z`; en base de datos, importes en céntimos enteros (R16).
- El plan pertenece al cliente (spec 001): se quita de `POST /simulations` y de su respuesta; se elimina el campo, R6 (no se renumeran las demás), el error «Plan no válido.» y el criterio del plan `gold`; referencia al ADR 005 actualizada.
- `storage_gb` (0 a 1 000 000) y `api_calls` (0 a 1 000 000 000) son obligatorios en `POST /simulations`, se guardan, no afectan al precio y no tienen valor por defecto; ausentes, 422 (R5).
- `users`: entero entre 1 y 10 000 en `preview` y en `POST /simulations`, con el mensaje «El número de usuarios debe ser un entero entre 1 y 10000.» (R3).
- Coerción estricta: se rechazan con 422 `"10"`, `10.0`, `true` y `null`; criterios nuevos para `"10"` y `10.0` (R12, CA7, CA8).
- `POST /simulations`: el país sale siempre del cliente y un `country` en el cuerpo se ignora (R13); los campos desconocidos se ignoran en todos los endpoints, como en la spec 001, por lo que un total enviado por el cliente nunca se usa (R14).
- `preview` recibe solo `users` y `country`; `country` en minúsculas se acepta y se devuelve en mayúsculas; su respuesta no cambia (R4, R7).
- Forma exacta de las respuestas: `POST /simulations` y elementos del historial con `id`, `customer_id`, `users`, `storage_gb`, `api_calls`, `country`, `currency`, `vat_rate`, `subtotal`, `vat`, `total` y `created_at`; `preview` con `users`, `country`, `currency`, `vat_rate`, `subtotal`, `vat` y `total` (Salidas).
- Snapshot: cada simulación guarda `country`, `vat_rate`, subtotal, IVA y total al crearse; el historial lee lo guardado y no recalcula; criterio con `monkeypatch` del tipo de IVA (R15, CA32).
- Historial: `GET /customers/{id}/simulations`, más reciente primero (`created_at` descendente y, si empatan, `id` descendente), sin paginación; criterio con dos simulaciones para el orden (R10, CA30).
- Inmutabilidad: no existen endpoints para modificar ni borrar simulaciones; solo se documenta, sin criterio nuevo (R11).
- Errores: mismo formato `{"detail": "texto"}` que la spec 001 y solo el primer error; primero la validación del cuerpo (`customer_id`, `users`, `storage_gb`, `api_calls`, en ese orden) y después el 404; `customer_id` no entero, 422 «Identificador de cliente no válido.»; cuerpo mal formado, 422 «Cuerpo de la petición no válido.»; una petición fallida no guarda nada (R17, R18).
- Criterios nuevos: `users` 10000 válido y 10001 con 422; `storage_gb` y `api_calls` ausentes con 422; máximos válidos y máximos más uno con 422; `country` en minúsculas en `preview`. CA renumerados (CA1 a CA36); los de tramos e IVA remiten a la skill `reglas-negocio` en lugar de copiar sus datos.
- Alineados con estas decisiones el ADR 002 (formato de importes y snapshot), el ADR 004 (cotas y obligatoriedad) y el ADR 005 (plan en el cliente), solo donde se contradecían.
- Preguntas abiertas: todas cerradas; se elimina la sección.
- Pablo confirma las cinco decisiones que tomó el arquitecto fuera de su lista:
  - Mensajes nuevos de `storage_gb` y `api_calls`: «El almacenamiento debe ser un entero entre 0 y 1000000.» y «Las llamadas a la API deben ser un entero entre 0 y 1000000000.».
  - `country` ausente, vacío, `null` o de tipo incorrecto en `preview`: «El país es obligatorio.».
  - Orden de validación en `preview`: cuerpo, `users`, `country`.
  - Coerción estricta también en `customer_id`, `storage_gb` y `api_calls`, no solo en `users`.
  - Valores de los criterios CA5 (10 000 usuarios: subtotal `50170.00`) y CA33 (60 usuarios con ES: 47000, 9870 y 56870 céntimos).


Revisión de Pablo: cada simulación guarda el IVA y los importes del momento en que se hizo, para que el historial no cambie si luego cambia el IVA de un país. El precio lo calcula siempre el servidor y nunca se fía de lo que manda el cliente.
