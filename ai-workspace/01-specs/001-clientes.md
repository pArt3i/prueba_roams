# 001 · Clientes
Estado: Aprobada
Fecha: 2026-11-15
Objetivo: dar de alta clientes con identificador fiscal válido y sin duplicados, y poder buscarlos y consultarlos.

## Contexto y alcance
Entra: `POST /customers`, `GET /customers?q=` y `GET /customers/{id}`. Referencias: [ADR 001](../02-arquitectura/001-stack.md) (dependencia `email-validator`), [ADR 003](../02-arquitectura/003-iva-por-pais.md) (países), [ADR 006](../02-arquitectura/006-validacion-identificador-fiscal.md) (identificador fiscal), [ADR 008](../02-arquitectura/008-duplicados-409.md) (duplicados) y las skills `validacion-nif` y `reglas-negocio`.
No entra: edición y borrado de clientes, simulaciones (spec 002) ni interfaz (specs 003 y 004). Los algoritmos de NIF y los casos de prueba viven en la skill `validacion-nif`; esta spec no los copia. Los planes y la lista de países viven en `reglas-negocio` (`iva.md`); aquí solo se remite a ellos.
Supuesto de escala: la búsqueda y el orden se hacen en Python sobre los clientes leídos (R7, R12). Vale para unos cientos de clientes; con muchos más habría que reabrir la decisión.

## Entradas
`POST /customers`: el cuerpo debe ser un objeto JSON (R16). Los cinco campos son obligatorios; un campo con `null` o de tipo distinto al indicado cuenta como ausente (R16); los campos desconocidos se ignoran (R17):

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `name` | string | Sí | Se recorta de espacios en los extremos; no vacío; máximo 120 caracteres |
| `email` | string | Sí | Se recorta y se pasa a minúsculas; formato válido (`EmailStr` de Pydantic); máximo 254 caracteres |
| `country` | string | Sí | Ausente o vacío, 422; código de la tabla de `iva.md`; se acepta en minúsculas y se guarda en mayúsculas; otro valor, 422 |
| `plan` | string | Sí | Ausente o vacío, 422; `starter`, `business` o `enterprise` (ver `reglas-negocio`); otro valor, 422 |
| `tax_id` | string | Sí | Se normaliza (R2) y valida según `validacion-nif` (ES) o R4 (resto); se valida el último (R15) |

`GET /customers?q=`: `q` string opcional (R7). `GET /customers/{id}`: `id` entero.

## Salidas
`POST /customers` devuelve 201 con el cliente (`tax_id`, `email` y `country` van normalizados):

```json
{ "id": 1, "name": "Acme S.L.", "tax_id": "12345678Z", "email": "ventas@acme.com", "country": "ES", "plan": "starter" }
```

`GET /customers?q=` devuelve 200 con una lista de clientes con esos mismos campos (vacía si no hay coincidencias), sin paginar y ordenada según R12. `GET /customers/{id}` devuelve 200 con un cliente.

Todos los errores, también los de validación, devuelven `{"detail": "texto en español"}` (R13).

## Reglas de negocio
- R1: `country` es obligatorio (ausente o vacío, 422) y debe estar en la tabla de `iva.md`; si no, 422. Se compara sin distinguir mayúsculas y se guarda en mayúsculas (`es` se guarda como `ES`). Un `country` con algún carácter no ASCII (por ejemplo `eſ`, con `ſ` U+017F, o `ıt`, con `ı` U+0131) nunca se convierte en un código de la tabla, aunque en mayúsculas lo pareciera (`eſ` daría `ES` e `ıt` daría `IT`): queda fuera de la tabla y da 422 «País no admitido.».
- R2: `tax_id` se normaliza siempre antes de validar y se guarda normalizado (`validacion-nif`), sea cual sea el país. Normalizar es quitar los guiones, los puntos y cualquier espacio en blanco Unicode (U+0020, U+00A0, U+3000, tabulador, saltos de línea...; los que Python `str.isspace()` reconoce) y pasar a mayúsculas. En todos los países, entre quitar los separadores y pasar a mayúsculas se aplica la comprobación de no ASCII: para ES, la de R3; para el resto, la de R4.
- R3: si `country` es ES, `tax_id` debe ser un DNI, NIE o CIF válido según `validacion-nif` y sus casos. Además, si el `tax_id` sin separadores (R2) contiene cualquier carácter no ASCII, es inválido (422 «Identificador fiscal no válido.»); se comprueba antes de pasar a mayúsculas, porque si no `ı` (U+0131) se convertiría en `I` y podría pasar como letra de control de un CIF válido.
- R4: si `country` no es ES, primero se mira el `tax_id` sin separadores (R2), antes de pasar a mayúsculas: si contiene cualquier carácter no ASCII (`Ñ`, acentos, `ß`, `ı`, `ﬁ`...), 422 «Identificador fiscal no válido.» (así `ß` no se convierte en `SS`). Un espacio en blanco Unicode no cuenta: es separador y ya se quitó (`AB`+U+00A0+`123` queda `AB123`, válido). Después, en mayúsculas, debe tener entre 5 y 20 caracteres y solo A–Z y 0–9; vacío, más corto, más largo o con cualquier otro carácter (símbolos), 422.
- R5: dos clientes con el mismo `tax_id` normalizado son duplicados, aunque tengan distinto país: 409 y no se crea nada. Solo el `tax_id` genera 409 (no el nombre ni el email). El 409 no incluye el `id` del cliente existente.
- R6: el orden de comprobación es 422 (formato) y después 409 (duplicado).
- R7: `GET /customers?q=` recorta `q` de espacios en blanco en los extremos. Sin `q` o con `q` vacío devuelve todos los clientes. Con `q`, devuelve los clientes que cumplan alguna de estas condiciones, con coincidencia parcial: (a) su `name` contiene `q`; (b) su `tax_id` contiene `q` normalizado igual que `tax_id` (R2), pero solo si `q`, sin separadores y antes de pasar a mayúsculas, es ASCII; si tiene algún carácter no ASCII (`ß`, `ñ`, `é`...), no se busca por identificador y solo cuenta (a). En (a) la comparación ignora mayúsculas y tildes (incluida la `ñ`): descomponer en NFD, quitar marcas diacríticas y `casefold`, sin `upper()`. Además, cada serie de espacios en blanco seguidos (U+0020, U+00A0, tabulador...) cuenta como un solo espacio. Todo esto se aplica a `q` y a `name` solo para comparar: el nombre guardado y devuelto no cambia. `jose` encuentra `José`, `nu` encuentra `Núñez` y `acme   sol` encuentra `Acme Soluciones`. Como `casefold` convierte `ß` en `ss`, `q=ß` encuentra por nombre `Strasse`; es aceptable (decisión de Pablo). Se hace en Python sobre los clientes leídos, no con `LIKE` de SQL. Si `q` queda vacío tras quitar separadores, solo se busca por `name`.
- R8: `GET /customers/{id}` con un id inexistente devuelve 404.
- R9: `name` se recorta de espacios y se guarda recortado; vacío o ausente, 422; más de 120 caracteres (tras recortar), 422.
- R10: `email` es obligatorio; se recorta y se pasa a minúsculas antes de validar y se guarda así. Se valida con `EmailStr` de Pydantic (dependencia `email-validator`, autorizada por Pablo; ver ADR 001); sin formato válido, 422. Máximo 254 caracteres tras recortar; 255 o más, 422 con el mismo mensaje que el formato inválido. El email no es único: dos clientes pueden compartirlo.
- R11: `plan` es obligatorio (ausente o vacío, 422) y debe ser exactamente `starter`, `business` o `enterprise`; cualquier otro valor, 422. Es informativo y no cambia el precio (`reglas-negocio`).
- R12: `GET /customers` ordena por `name` con el mismo criterio de comparación de R7 (sin mayúsculas ni tildes, y con varios espacios seguidos como uno: `Álvaro` va entre `Alberto` y `Zoe`) y, si empatan, por `id` ascendente. El orden se aplica en Python.
- R13: todo error devuelve `{"detail": "texto en español"}` con `detail` como string, incluidos los 422 de validación; no se usa el formato por defecto de FastAPI.
- R14: `%` y `_` en `q` son texto literal, no comodines (al no usar `LIKE`, R7, no hay nada que escapar).
- R15: tras R16, de los errores de validación 422 solo se devuelve el primero, en este orden: `name`, `email`, `country`, `plan`, `tax_id`. `tax_id` va el último porque su validación depende del país (R3, R4): si `country` falta o no es válido, se devuelve el error de `country` y no se evalúa `tax_id`. El 409 solo se comprueba si no hay ningún 422 (R6).
- R16: si el cuerpo de `POST /customers` no es un JSON válido (también si falta o está vacío) o no es un objeto (`[]`, `"x"`, `123`, `null`), 422 «Cuerpo de la petición no válido.». Es lo primero que se comprueba, antes del orden de R15. Un campo con `null` o de tipo incorrecto (`name: 123`) se trata como ausente y da el mensaje «obligatorio» de ese campo, en el orden de R15.
- R17: los campos desconocidos del cuerpo del alta (`foo`, `id`...) se ignoran: no dan error, no se guardan ni se devuelven. El `id` lo asigna siempre el servidor.

## Errores
Primero R16 y después, en el orden de validación de R15:

| Situación | Código HTTP | Mensaje |
| --- | --- | --- |
| Cuerpo que no es JSON válido o no es un objeto | 422 | Cuerpo de la petición no válido. |
| `name` vacío, ausente, `null` o de tipo incorrecto | 422 | El nombre es obligatorio. |
| `name` de más de 120 caracteres | 422 | El nombre no puede superar 120 caracteres. |
| `email` vacío, ausente, `null` o de tipo incorrecto | 422 | El email es obligatorio. |
| `email` con formato inválido o de más de 254 caracteres | 422 | El email no es válido. |
| `country` vacío, ausente, `null` o de tipo incorrecto | 422 | El país es obligatorio. |
| `country` fuera de la tabla | 422 | País no admitido. |
| `plan` vacío, ausente, `null` o de tipo incorrecto | 422 | El plan es obligatorio. |
| `plan` fuera de los tres valores | 422 | Plan no válido. Valores admitidos: starter, business, enterprise. |
| `tax_id` vacío (o solo separadores, incluido cualquier espacio en blanco Unicode), ausente, `null` o de tipo incorrecto | 422 | El identificador fiscal es obligatorio. |
| `tax_id` inválido (ES, o no ES con algún carácter no ASCII que no sea separador) | 422 | Identificador fiscal no válido. |
| `tax_id` duplicado | 409 | Ya existe un cliente con ese identificador fiscal. |
| Cliente inexistente | 404 | Cliente no encontrado. |
| `id` no entero | 422 | Identificador de cliente no válido. |

La respuesta 409 solo lleva `detail`, sin `id` ni otros datos del cliente existente.

## Casos límite
- `00000000T` (DNI con número 0) es válido.
- `tax_id` formado solo por espacios en blanco (U+0020, U+00A0, tabuladores, saltos de línea), puntos y guiones queda vacío tras normalizar: 422 «El identificador fiscal es obligatorio.».
- Mismo identificador con formato distinto (`12345678Z` frente a `12.345.678-z` o con U+00A0 entre cifras): 409.
- Cliente no ES con el mismo identificador normalizado que uno ES (o de otro país): 409.
- Cliente ES con un espacio en blanco no ASCII o de control entre cifras (`1234`+U+00A0+`5678Z`, U+3000, tabulador, salto de línea): se acepta y se guarda `12345678Z`.
- Cliente ES con cualquier carácter no ASCII en el `tax_id` una vez quitados los separadores: 422, aunque en mayúsculas diera un identificador válido. `P1111111ı` (la última letra es `ı`, U+0131, i sin punto) daría `P1111111I`, un CIF válido: se rechaza. Un espacio en blanco Unicode no cuenta, porque es separador (caso anterior).
- `tax_id` no ES de 4 caracteres: 422; de 5: 201; de 20: 201; de 21: 422; con símbolo (`AB/123`): 422; con carácter no ASCII (`ÑAB123`, `ñab123`): 422.
- `tax_id` no ES con `ß`, `ı` o `ﬁ`: 422 aunque en mayúsculas diera ASCII válido (`straße1` daría `STRASSE1`).
- `tax_id` no ES con U+00A0 entre caracteres ASCII (`AB`+U+00A0+`123`): 201, porque es separador; con U+00A0 junto a un carácter no ASCII (`ß`+U+00A0+`AB123`): 422.
- Cuerpo ausente, vacío, JSON roto o no objeto (`[]`, `"x"`, `123`, `null`): 422 «Cuerpo de la petición no válida.».
- Campo con `null` o de tipo incorrecto (`name: 123`, `plan: ["starter"]`, `tax_id: 12345678`): se trata como ausente.
- Campos desconocidos (`foo`, `id: 99`): se ignoran; el `id` devuelto lo asigna el servidor.
- `name` de 120 caracteres: 201; de 121: 422; con espacios en los extremos, se guarda recortado; solo espacios: 422.
- `email` de 254 caracteres válidos: 201; de 255: 422. Con espacios y mayúsculas (`  Ventas@Acme.COM `): se guarda `ventas@acme.com`.
- Varios campos inválidos a la vez: solo se devuelve el error del primero según R15. Con `country` `XX` y `tax_id` vacío: «País no admitido.».
- `country` o `plan` ausentes o vacíos: «El país es obligatorio.» y «El plan es obligatorio.», no «País no admitido.» ni «Plan no válido.».
- `plan` con otra capitalización (`Starter`) o distinto de los tres valores: 422.
- `country` en minúsculas (`es`): se acepta y se guarda `ES`.
- `country` con algún carácter no ASCII (`eſ`, con `ſ` U+017F; `ıt`, con `ı` U+0131): 422 «País no admitido.», aunque en mayúsculas diera `ES` o `IT`.
- `q` con caracteres comodín (`%`, `_`): se tratan como texto literal.
- `q` solo con espacios (cualquier espacio en blanco): equivale a vacío y devuelve todos. `q` solo con separadores (`---`): se busca solo por nombre.
- `q` con otro formato que el guardado (`12.345.678-z` encuentra `12345678Z`; también con U+00A0 o tabulador entre cifras).
- `q` con otra combinación de mayúsculas y tildes que el nombre: `JOSÉ` encuentra `Jose`, `jose` encuentra `José`, `nu` encuentra `Núñez`.
- `q` con algún carácter no ASCII (`ß`, `ñ`): solo se busca por nombre, con `casefold` y sin tildes. `q=ß` encuentra `Strasse` por nombre (`ß` se compara como `ss`), pero no por identificador: aceptado por Pablo.
- Varios espacios seguidos cuentan como uno en la búsqueda por nombre, en `q` y en `name` (también U+00A0 o tabulador): `Acme   Soluciones` se encuentra con `q=acme soluciones`, y `q=acme    sol` encuentra `Acme Soluciones`. El nombre guardado conserva sus espacios.
- Búsqueda sin resultados: 200 con lista vacía, no 404.
- Nombres que solo difieren en mayúsculas, tildes o en el número de espacios seguidos (`ana`, `Ana`, `Aná`, `Ana  `): empatan y se ordenan por `id`.
- `id` 0, negativo o no numérico.
- Petición fallida (422 o 409): no se crea ninguna fila.

## Criterios de aceptación
Salvo que se indique otra cosa, las peticiones de alta llevan `name`, `email`, `country`, `plan` y `tax_id` válidos.

- [ ] CA1: dado un cliente ES con `12345678Z`, cuando se hace `POST /customers`, entonces 201 y el cuerpo contiene `id` y `tax_id` `12345678Z`.
- [ ] CA2: dado `tax_id` `12.345.678-z`, cuando se crea, entonces 201 y se guarda y devuelve `12345678Z`.
- [ ] CA3: dado `12345678A` (letra incorrecta) para ES, cuando se crea, entonces 422 con «Identificador fiscal no válido.» y no hay fila nueva.
- [ ] CA4: dada cada fila de `validacion-nif/casos.md`, cuando se crea un cliente ES con ese identificador, entonces 201 si la columna dice Sí y 422 si dice No (un test por fila; en la fila con `[U+00A0]` el test construye el carácter U+00A0 real, y en la de `P1111111ı` el carácter U+0131 real).
- [ ] CA5: dado `tax_id` vacío en ES, cuando se crea, entonces 422 con «El identificador fiscal es obligatorio.».
- [ ] CA6: dado `country` `XX`, cuando se crea, entonces 422 con «País no admitido.».
- [ ] CA7: dado un cliente ya creado, cuando se crea otro con el mismo identificador (también con otro formato), entonces 409 y el total de clientes no cambia.
- [ ] CA8: dado `name` vacío o ausente, cuando se crea, entonces 422 con «El nombre es obligatorio.».
- [ ] CA9: dado un cliente no ES con identificador de 5 a 20 caracteres A–Z y 0–9 tras normalizar, cuando se crea, entonces 201.
- [ ] CA10: dado un cliente no ES con identificador vacío, cuando se crea, entonces 422.
- [ ] CA11: dados tres clientes, cuando se hace `GET /customers?q=` con un texto que coincide con uno, entonces 200 con solo ese cliente.
- [ ] CA12: dados clientes existentes, cuando se hace `GET /customers` sin `q`, entonces 200 con todos.
- [ ] CA13: dada una búsqueda sin coincidencias, cuando se hace `GET /customers?q=zzz`, entonces 200 con `[]`.
- [ ] CA14: dado un cliente existente, cuando se hace `GET /customers/{id}`, entonces 200 con sus datos.
- [ ] CA15: dado un id inexistente, cuando se hace `GET /customers/{id}`, entonces 404 con «Cliente no encontrado.».
- [ ] CA16: dado `q` con `%` o con `_`, cuando se busca, entonces no devuelve todos los clientes por interpretarlo como comodín.
- [ ] CA17: dado un alta sin `email` (o vacío), cuando se crea, entonces 422 con «El email es obligatorio.» y no hay fila nueva.
- [ ] CA18: dado `email` `sin-arroba`, cuando se crea, entonces 422 con «El email no es válido.».
- [ ] CA19: dado `email` `  Ventas@Acme.COM `, cuando se crea, entonces 201 y el cuerpo devuelve `ventas@acme.com`.
- [ ] CA20: dado `plan` `gold`, cuando se crea, entonces 422 con «Plan no válido. Valores admitidos: starter, business, enterprise.».
- [ ] CA21: dado `plan` `starter`, `business` y `enterprise`, cuando se crea un cliente con cada uno, entonces 201 y el cuerpo devuelve ese plan.
- [ ] CA22: dado un `name` de 121 caracteres, cuando se crea, entonces 422 con «El nombre no puede superar 120 caracteres.»; con 120, 201.
- [ ] CA23: dado `country` `es`, cuando se crea, entonces 201 y el cuerpo devuelve `ES`.
- [ ] CA24: dado un cliente con `tax_id` `12345678Z`, cuando se busca `q=12.345.678-z`, entonces 200 con ese cliente.
- [ ] CA25: dado un cliente llamado `Acme Soluciones S.L.`, cuando se busca `q=  ACME sol `, entonces 200 con ese cliente (parcial, sin distinguir mayúsculas y con `q` recortado).
- [ ] CA26: dados clientes `beta`, `Alfa` y `alfa` (en ese orden de alta), cuando se hace `GET /customers`, entonces el orden es `Alfa`, `alfa`, `beta` (alfabético sin distinguir mayúsculas, empate por `id`).
- [ ] CA27: dado un duplicado, cuando se crea, entonces 409 y el cuerpo es exactamente `{"detail": "Ya existe un cliente con ese identificador fiscal."}`, sin `id`.
- [ ] CA28: dado un cliente ES `12345678Z`, cuando se crea uno de país `PT` con `12345678Z`, entonces 409 (la unicidad no mira el país).
- [ ] CA29: dado un cliente no ES con identificador de 4 o de 21 caracteres, o con símbolos, cuando se crea, entonces 422 con «Identificador fiscal no válido.».
- [ ] CA30: dado cualquier error de validación (por ejemplo un campo ausente), cuando se recibe la respuesta, entonces `detail` es un string en español, no una lista.
- [ ] CA31: dado `q` `---` (vacío tras normalizar), cuando se busca, entonces solo se busca por nombre y no se devuelven todos los clientes.
- [ ] CA32: dado un `email` válido de 254 caracteres, cuando se crea, entonces 201; dado uno de 255 caracteres, entonces 422 con «El email no es válido.» y no hay fila nueva.
- [ ] CA33: dada una petición con `name` vacío, `email` inválido, `country` `XX`, `plan` `gold` y `tax_id` vacío, cuando se crea, entonces 422 solo con «El nombre es obligatorio.»; corrigiendo en cada paso el primer campo, los errores salen en el orden `email`, `country`, `plan`, `tax_id`, uno por respuesta.
- [ ] CA34: dado `country` `XX` y `tax_id` vacío a la vez, cuando se crea, entonces 422 con «País no admitido.» (el `tax_id` no se evalúa).
- [ ] CA35: dado `country` ausente o vacío, cuando se crea, entonces 422 con «El país es obligatorio.».
- [ ] CA36: dado `plan` ausente o vacío, cuando se crea, entonces 422 con «El plan es obligatorio.».
- [ ] CA37: dados los clientes `José Pérez` y `Núñez S.L.`, cuando se busca `q=jose`, entonces 200 con `José Pérez`; con `q=nu`, 200 con `Núñez S.L.`; y dado `Jose Pérez`, `q=JOSÉ` también lo encuentra. Ningún `tax_id` de la prueba contiene esos textos.
- [ ] CA38: dados clientes `Zoe`, `Álvaro` y `Alberto` (en ese orden de alta), cuando se hace `GET /customers`, entonces el orden es `Alberto`, `Álvaro`, `Zoe`.
- [ ] CA39: dados `José` y `Jose` (en ese orden de alta), cuando se hace `GET /customers`, entonces empatan y salen por `id`: `José`, `Jose`.
- [ ] CA40: dado un cliente de país `PT` con `tax_id` `ÑAB123` (o `ñab123`), cuando se crea, entonces 422 con «Identificador fiscal no válido.» y no hay fila nueva.
- [ ] CA41: dado un cuerpo que no es JSON válido (`{"name":`), vacío o ausente, cuando se hace `POST /customers`, entonces 422 con «Cuerpo de la petición no válido.» (`detail` string) y no hay fila nueva.
- [ ] CA42: dado un cuerpo JSON válido que no es un objeto (`[]`, `"texto"`, `123`, `null`), cuando se crea, entonces 422 con «Cuerpo de la petición no válido.» y no hay fila nueva.
- [ ] CA43: dado cada campo (`name`, `email`, `country`, `plan`, `tax_id`) con `null` y el resto válido, cuando se crea, entonces 422 con el mensaje «obligatorio» de ese campo (un test por campo).
- [ ] CA44: dado cada campo con tipo incorrecto (`name` 123, `email` 123, `country` 34, `plan` `["starter"]`, `tax_id` 12345678) y el resto válido, cuando se crea, entonces 422 con el mensaje «obligatorio» de ese campo (un test por campo).
- [ ] CA45: dados `country` `XX` y `tax_id` `null`, cuando se crea, entonces 422 con «País no admitido.»; dados `name` 123 y `plan` `gold`, entonces «El nombre es obligatorio.» (R15 se mantiene con null y tipos incorrectos).
- [ ] CA46: dado un cliente `PT` con `tax_id` `straße1`, `ıstanbul1` o `ﬁnanz1`, cuando se crea, entonces 422 con «Identificador fiscal no válido.» y no hay fila nueva (en mayúsculas serían `STRASSE1`, `ISTANBUL1` y `FINANZ1`, válidos).
- [ ] CA47: dado un cliente `PT` con `tax_id` `AB` + U+00A0 + `123` (espacio no separable, que es separador), cuando se crea, entonces 201 y se guarda y devuelve `AB123`.
- [ ] CA48: dado un alta válida con campos extra (`"foo": "x"`, `"id": 99`), cuando se crea, entonces 201, el `id` lo asigna el servidor (no es 99) y el cuerpo no contiene `foo`.
- [ ] CA49: dado un cliente ES con `tax_id` `1234` + U+00A0 + `5678Z` (y otro con U+3000 en su lugar), cuando se crea, entonces 201 y se guarda `12345678Z`.
- [ ] CA50: dado un cliente `PT` con `tax_id` `ß` + U+00A0 + `AB123`, cuando se crea, entonces 422 con «Identificador fiscal no válido.»; dado `tax_id` solo U+00A0, entonces 422 con «El identificador fiscal es obligatorio.»; en ambos no hay fila nueva.
- [ ] CA51: dado un cliente con `12345678Z`, cuando se crea otro con `1234` + U+00A0 + `5678z`, entonces 409 y el total de clientes no cambia.
- [ ] CA52: dado un cliente con `tax_id` `12345678Z`, cuando se busca `q` = `1234` + U+00A0 + `5678z`, entonces 200 con ese cliente.
- [ ] CA53: dados `Beta` (`PT`, `SS123`) y `Strasse GmbH` (`PT`, `XY789`), cuando se busca `q=ß`, entonces 200 solo con `Strasse GmbH`: no se busca por identificador (`ß` no se convierte en `SS`) y el nombre se compara con `casefold`.
- [ ] CA54: dados `Núñez S.L.` (`PT`, `ABC123`) y `Beta` (`PT`, `N12345`), cuando se busca `q=ñ`, entonces 200 solo con `Núñez S.L.` (por nombre, sin tildes); `Beta` no aparece aunque su identificador contiene `N`.
- [ ] CA55: dado un cliente `Acme   Soluciones S.L.` (tres espacios seguidos en el nombre), cuando se busca `q=acme soluciones`, entonces 200 con ese cliente, y el `name` devuelto conserva los tres espacios.
- [ ] CA56: dado un cliente `Acme Soluciones S.L.`, cuando se busca `q` = `acme` + tres espacios + `sol`, o `acme` + U+00A0 + `sol`, o `acme` + tabulador + `sol`, entonces 200 con ese cliente en cada caso.
- [ ] CA57: dado un cliente ES con `tax_id` `1234` + tabulador + `5678Z` + salto de línea, cuando se crea, entonces 201 y se guarda `12345678Z`; dado `tax_id` solo tabuladores y saltos de línea, entonces 422 con «El identificador fiscal es obligatorio.»; y `q` = `1234` + tabulador + `5678z` encuentra el cliente.
- [ ] CA58: dados `Ana  Ruiz` (dos espacios), `Ana Ruiz` y `Álex` (en ese orden de alta), cuando se hace `GET /customers`, entonces el orden es `Álex`, `Ana  Ruiz`, `Ana Ruiz` (los dos primeros empatan en comparación y salen por `id`).
- [ ] CA59: dado un cliente ES con `tax_id` `P1111111ı` (la última letra es `ı`, U+0131, i sin punto; en mayúsculas sería `P1111111I`, un CIF válido), cuando se crea, entonces 422 con «Identificador fiscal no válido.» y no hay fila nueva; dado `P1111111I` (ASCII), entonces 201.
- [ ] CA60: dado `country` `eſ` (`ſ` es U+017F, la s larga; en mayúsculas sería `ES`) o `ıt` (`ı` es U+0131, i sin punto; en mayúsculas sería `IT`), cuando se crea, entonces 422 con «País no admitido.» y no hay fila nueva; dado `country` `es` (ASCII), entonces 201 y se guarda `ES`.

## Preguntas abiertas
- Ninguna. Se cerraron las dos de la cuarta ronda (otros espacios en blanco como separadores y espacios seguidos en la búsqueda por nombre).

## Cambios de Pablo
**Nota original de Pablo**
Cambios aplicados el 2026-11-15, por decisión de Pablo:
- Campos: el cliente tiene `name`, `tax_id`, `email`, `country` y `plan`, todos obligatorios (Entradas, Salidas, R9 a R11).
- `email`: formato válido, guardado en minúsculas y sin espacios en los extremos (R10).
- `plan`: `starter`, `business` o `enterprise`; otro valor, 422 (R11).
- `name`: recortado, no vacío, máximo 120 caracteres (R9).
- `country`: se acepta en minúsculas y se guarda en mayúsculas (R1).
- `tax_id` fuera de ES: entre 5 y 20 caracteres alfanuméricos tras normalizar (R4).
- Duplicados: unicidad solo por `tax_id` normalizado, sin país; el 409 no incluye el `id` del existente (R5).
- Errores: todos devuelven `{"detail": "texto en español"}`, también los de validación (R13); mensajes nuevos para email, plan y longitud de nombre.
- Búsqueda: `q` por nombre o identificador fiscal, parcial y sin distinguir mayúsculas; `q` recortado y normalizado como `tax_id` para el identificador; sin paginación; orden alfabético por nombre y por `id` si empatan; comodines literales (R7, R12, R14).
- Criterios de aceptación: CA1 a CA16 sin cambios salvo CA9 (ahora remite a R4); nuevos CA17 a CA31.
- Preguntas abiertas: eliminadas las resueltas (campos, búsqueda, paginación y orden, formato genérico, unicidad, país en minúsculas, formato de errores 422, `id` en el 409); añadidas cuatro nuevas.

Segunda ronda, 2026-11-15, por decisión de Pablo:
- Email: se valida con `EmailStr` de Pydantic; Pablo autoriza la dependencia `email-validator` (anotada en el ADR 001); máximo 254 caracteres; se guarda recortado y en minúsculas (R10).
- Validación: solo se devuelve el primer error, en el orden `name`, `email`, `country`, `plan`, `tax_id` (el último porque depende del país); mensajes nuevos «El país es obligatorio.» y «El plan es obligatorio.» (R1, R11, R15).
- Búsqueda y orden: ignoran mayúsculas y tildes (`ñ`, acentos) con comparación Unicode, en Python sobre los clientes leídos y no con `LIKE`; los comodines son texto literal; vale para unos cientos de clientes (R7, R12, R14).
- `tax_id` fuera de ES: solo A–Z y 0–9 (ASCII) tras normalizar y pasar a mayúsculas; actualizado el ADR 006 (R4).
- Tipos de IVA: fuentes citadas en el ADR 003 (sin cambios en esta spec).
- Criterios de aceptación: ajustados CA8, CA9, CA16 y CA20 (el plan ausente pasa a CA36); nuevos CA32 a CA40.
- Preguntas abiertas: cerradas las del criterio y la longitud del email, los mensajes de país y plan ausentes, el orden de varios errores y las tildes y `ñ`; quedan tres (la de la `Ñ` pasa a ser la de mayúsculas que cambian de alfabeto).

Tercera ronda, 2026-11-15, por decisión de Pablo:
- Email de más de 254 caracteres: se reutiliza «El email no es válido.» (R10, Errores; ya lo cubre CA32). Pregunta cerrada.
- Cuerpo mal formado: si no es JSON válido o no es un objeto, 422 «Cuerpo de la petición no válido.»; un campo `null` o de tipo incorrecto se trata como ausente, con el «obligatorio» de ese campo (R16, R15, Errores; nuevos CA41 a CA45). Pregunta cerrada.
- `tax_id` fuera de ES: si el original contiene cualquier carácter no ASCII, 422 «Identificador fiscal no válido.», comprobado antes de pasar a mayúsculas (R2, R4; nuevos CA46 y CA47; ADR 006 actualizado). Sustituye la pregunta sobre `ß`, `ı` y `ﬁ`.
- Simulaciones: cada una guarda el tipo de IVA aplicado y subtotal, IVA y total en céntimos en el momento de calcular (ADR 003 actualizado).
- Pendiente para la spec 002 (no editada aquí): (a) la pregunta «Tipo de IVA guardado (snapshot)» debe cerrarse como snapshot; (b) R8 solo dice que los importes se guardan en céntimos: debe añadir el tipo de IVA y que se guardan subtotal, IVA y total (no solo el total) y que no se recalculan al leer; (c) la pregunta «Formato de importes» mezcla guardado (céntimos, ya decidido) y respuesta de la API (los ejemplos usan cadena decimal `"470.00"` y `"vat_rate": "0.21"`): hay que separarlas y decidir cómo se guarda y se devuelve el tipo; (d) conviene un CA que compruebe que el historial no cambia si cambia la tabla de IVA.
- Versiones mínimas del ADR 001 y skills `validacion-nif` (patrones `[0-9]`, nuevo caso con dígitos Unicode en `casos.md`, que CA4 ya recorre) y `reglas-negocio` (`iva.md`): actualizados sin cambios en esta spec.
- Preguntas abiertas: cerradas las tres anteriores; quedan tres nuevas (campos desconocidos, qué cuenta como espacio y `q` con caracteres no ASCII).

Cuarta ronda, 2026-11-15, por decisión de Pablo:
- Campos desconocidos en el alta: se ignoran (nuevo R17; CA48). Pregunta cerrada.
- Espacios: al normalizar `tax_id` y `q`, cualquier espacio Unicode (incluido U+00A0) es separador y se elimina; la regla de no ASCII se aplica al valor que queda (R2, R4, Errores, Casos límite). CA47 cambia: `AB`+U+00A0+`123` pasa de 422 a 201 (se guarda `AB123`). Nuevos CA49 a CA52. Pregunta cerrada.
- `q` no ASCII: la búsqueda por identificador solo se aplica si `q`, sin separadores, es ASCII; si no, solo por nombre, con `casefold` y sin tildes, sin `upper()` (R7; nuevos CA53 y CA54). Pregunta cerrada.
- ADR 003: tipo de IVA en texto decimal (`"0.21"`), importes en céntimos y devueltos como `"470.00"`, tabla en ES, PT, FR, DE e IT. ADR 001: Python 3.12 o superior, probado con 3.13.8. ADR 006 alineado con los separadores.
- Pendiente para la spec 002 (no editada): sigue (a), (b) y (d); el (c) queda decidido por el ADR 003 (céntimos guardados, `"470.00"` y `"0.21"` en la API), así que la spec 002 debe cerrar esas preguntas y aplicarlo.
- Preguntas abiertas: cerradas las tres anteriores; quedan dos nuevas (tabulador y saltos de línea; espacios internos de `q` en el nombre).

Quinta ronda, 2026-11-15, por decisión de Pablo:
- Separadores: en `tax_id` y `q`, cualquier espacio en blanco, incluidos el tabulador y los saltos de línea, cuenta como separador (R2, R7, Entradas, Errores, Casos límite; CA57). Pregunta cerrada.
- Búsqueda por nombre: varios espacios en blanco seguidos cuentan como uno, en `q` y en `name`, solo para comparar y ordenar (R7, R12; nuevos CA55 a CA58). Pregunta cerrada.
- `q=ß` encuentra `Strasse` por nombre (`casefold`): aceptable y documentado en R7 y Casos límite, sin criterio nuevo; CA53 se mantiene.
- Límite de líneas: el máximo de 200 es solo para archivos de código, no para specs ni ADR; los casos límite compactados en la cuarta ronda se restauran con su redacción detallada, actualizada a estas decisiones.
- Skill `validacion-nif`: «quitar espacios» incluye cualquier espacio en blanco Unicode, tabulador y saltos de línea; `casos.md` añade el caso `1234[U+00A0]5678Z` (válido), que CA4 recorre.
- ADR 002: resuelta la pregunta del formato de importes (JSON en texto con dos decimales, guardado en céntimos, ADR 003). ADR 007: USD y GBP también en texto con dos decimales. La spec 002 sigue pendiente de cerrar sus preguntas.

Sexta ronda, 2026-11-15, cambio posterior a la aprobación, por decisión de Pablo a raíz de la auditoría 001-logica-pura-precio-nif (hallazgos 1 y 4). La spec mantiene `Estado: Aprobada`:
- `tax_id` en ES: cualquier carácter no ASCII, una vez quitados los separadores, es inválido, y se comprueba antes de pasar a mayúsculas; si no, `ı` (U+0131) pasaría a `I` y podría valer como letra de control de un CIF válido. Es una regla que ya estaba implementada y no figuraba en la spec; se documenta (R3, Casos límite; nuevo CA59 con `P1111111ı`; CA4 menciona la fila nueva de `casos.md`). ADR 006 y skill `validacion-nif` alineados.
- Notación: en CA4, en la Quinta ronda y en `casos.md`, el carácter U+00A0 que antes iba escrito literal (invisible) pasa a escribirse `[U+00A0]`, para que se vea. No cambia ninguna regla.
- R2: la comprobación de no ASCII (entre quitar los separadores y pasar a mayúsculas) se aplica en todos los países, con remisión a R3 para ES y a R4 para el resto; antes R2 decía «Fuera de ES». Es solo un ajuste de redacción: no cambia ninguna regla ni criterio.

Séptima ronda, 2026-11-15, cambio posterior a la aprobación, a raíz de la reauditoría 002-logica-pura-reauditoria (hallazgo 1). Redactado por el arquitecto a petición de la sesión; Pablo debe confirmarlo. La spec mantiene `Estado: Aprobada`:
- `country`: un país con algún carácter no ASCII (`eſ`, con `ſ` U+017F; `ıt`, con `ı` U+0131) nunca se convierte en un código de la tabla, aunque en mayúsculas diera `ES` o `IT`: queda fuera de la tabla y da 422 «País no admitido.». Es una regla que ya estaba implementada (`normalize_country`) y no figuraba en la spec; se documenta (R1, Casos límite; nuevo CA60). Sin cambio de comportamiento. ADR 003 y spec 002 (R4, CA37) alineados.

Revisión de Pablo: he comprobado que el cliente tiene los cinco campos que pedía (nombre, identificador fiscal, email, país y plan). El plan lo elige el cliente, no la simulación, por eso va en el cliente. Dos clientes no pueden tener el mismo identificador fiscal aunque sea de otro país, porque es el dato que identifica a la empresa.
