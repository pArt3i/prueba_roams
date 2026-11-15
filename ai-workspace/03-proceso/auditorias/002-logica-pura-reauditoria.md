# Auditoría · Reauditoría de la lógica pura de precio y NIF (`backend/app/services/` y `backend/tests/`)

Veredicto: APROBADO

Spec revisada: `ai-workspace/01-specs/001-clientes.md` (R1 a R4, CA4, CA59) y `ai-workspace/01-specs/002-precio-y-simulaciones.md` (R1, R2, CA1 a CA3, CA5, CA35). Contraste con `ai-workspace/02-arquitectura/006-validacion-identificador-fiscal.md`, las skills `validacion-nif` (SKILL.md y casos.md), `reglas-negocio` (SKILL.md e iva.md) y `convenciones-backend`. Informe anterior: `ai-workspace/03-proceso/auditorias/001-logica-pura-precio-nif.md`.

Resumen: los dos hallazgos altos (1 y 2) están resueltos y los demás también, salvo el 9, que sigue abierto y es solo informativo. No quedan hallazgos de gravedad alta ni media. Los 155 tests pasan y ruff está limpio. Las mutaciones en memoria confirman que los tests discriminan las guardas. Los criterios que dependen de la capa API siguen sin test, porque todavía no existen routers ni schemas (ver el final).

## Estado de los hallazgos del informe 001 (1 a 9)

| # del informe 001 | Gravedad original | Estado | Evidencia |
| --- | --- | --- | --- |
| 1. La guarda `isascii()` de ES no estaba probada | Alta | Resuelto | `tests/test_tax_id.py:51` añade la fila `P1111111{DOTLESS_I}` a `CASOS_MD`. `tests/test_tax_id.py:116-124` (`test_ca59_es_rechaza_no_ascii_antes_de_mayusculas`) usa `P1111111ı` y `ſ1111111I`. Comprueba antes que `raw.upper()` sería válido, y después que `normalize_and_validate_tax_id` lanza `InvalidTaxIdError` con el mensaje exacto. `test_ca59_la_version_ascii_si_es_valida` (l. 141-143) confirma que `P1111111I` y `S1111111I` sí son válidos. Mutación en memoria (guarda ES eliminada) y resultado: 3 tests fallan (`test_ca4_ca59_fila_de_casos_md['P1111111\u0131']` y las dos variantes de `test_ca59_es_rechaza_no_ascii_antes_de_mayusculas`). Los otros 152 pasan. |
| 2. U+00A0 y U+3000 como literales invisibles | Alta | Resuelto | `tests/constants.py:8-9`: `NBSP = chr(0x00A0)` e `IDEOGRAPHIC_SPACE = chr(0x3000)`. El escaneo de bytes (más abajo) no encuentra ningún carácter no ASCII en los tests. |
| 3. Resto de caracteres especiales como literales y sin constantes únicas | Media | Resuelto | `tests/constants.py:12-24` define `SHARP_S`, `DOTLESS_I`, `FI_LIGATURE`, `LONG_S`, `ARABIC_DIGITS` (construido con `chr(0x0661 + i)`), `N_TILDE_*` y `E_ACUTE_*`, una sola vez y con `chr()`. `tests/test_constants.py` comprueba por nombre Unicode que cada constante es el carácter que dice ser, que los dígitos árabes son 8 y valen 1 a 8, y que el `upper()` de los caracteres delicados es ASCII. `test_tax_id.py`, `test_tax_id_generic.py`, `test_pricing.py` y `test_country.py` importan de `tests.constants`. No se ha colado ningún literal nuevo (por ejemplo, `test_pricing.py:11` importa `DOTLESS_I` y `LONG_S`). |
| 4. ES rechaza no ASCII sin que lo recoja la spec | Media | Resuelto | Spec 001: R3, R2 (reescrito para todos los países), Casos límite, CA4 (menciona la fila de `P1111111ı`) y CA59. ADR 006: Decisión y Consecuencias. Skill `validacion-nif`: SKILL.md l. 14 y casos.md l. 30. Todo coincide con `tax_id.py:92-103` y con los tests. |
| 5. Normalización de `country` duplicada e inconsistente | Baja | Resuelto | `app/services/country.py:4-12` define `normalize_country` (`raw.upper() if raw.isascii() else raw`). La usan `pricing.py:6,60` y `tax_id.py:8,126`. Tests: `tests/test_country.py:16-21` (`eſ`, `ıt`, `Eſ`), `test_tax_id.py:163-170`, `test_tax_id_generic.py:104-107` y `test_pricing.py:106-113`. Mutación (usar `.upper()` a secas): falla `test_country`. Si solo se muta `tax_id`, falla `test_pais_no_ascii_que_pasaria_a_es_no_se_trata_como_es`. Si solo se muta `pricing`, falla `test_pais_desconocido_lanza_error[ıt]`. |
| 6. Valores esperados no literales en las filas válidas | Baja | Resuelto | `CASOS_MD` (`test_tax_id.py:27-53`) lleva una tercera columna con el valor normalizado esperado como literal, y `test_tax_id.py:63` compara contra ese literal. Mutación (`strip_separators` que olvida el punto): falla la fila `12.345.678-Z`. Antes ese error común pasaba. |
| 7. `calculate_price` no avisa de que no aplica el tope de 10 000 usuarios | Baja | Resuelto | `pricing.py:58` lo documenta en el docstring («Does not enforce the 10 000 users cap (spec 002 R3): the schema does»). Un `country` que no sea `str` sigue lanzando `AttributeError` (ver hallazgo 3 más abajo). Es tarea del schema. |
| 8. Comentarios y docstrings en español sin tildes | Baja | Resuelto | Todos los comentarios y docstrings de `app/` y `tests/` están en inglés. `TaxIdError`, `TaxIdEmptyError` e `InvalidTaxIdError` ya tienen docstring (`tax_id.py:27-39`). Los mensajes visibles siguen en español, como pide CLAUDE.md. Los nombres de los tests con el CA en español siguen `convenciones-backend` (ver hallazgo 6, informativo). |
| 9. `vat_rate` `"0.20"` para FR sin confirmar en la spec | Info | Abierto | `pricing.py:12` devuelve `"0.20"`. Spec 002 CA2 solo cita `"0.21"`, `"0.19"` y `"0.23"`, y CA3 dice «su tipo en texto decimal». ADR 003 solo fija el formato con `"0.21"`. Nadie ha confirmado ni documentado `"0.20"` frente a `"0.2"`. No bloquea, pero hay que cerrarlo antes del router (ver hallazgo 2). |

## Criterios de aceptación

| CA / Regla | Estado | Evidencia |
| --- | --- | --- |
| 001 R1 (país sin distinguir mayúsculas) | Cumplido en servicio | `country.py:12` y `test_country.py`. La parte «obligatorio» y 422 es de la capa API. |
| 001 R2 (normalizar: quitar `-`, `.` y `isspace()`, luego mayúsculas; el no ASCII se mira entre ambos pasos, en todos los países) | Cumplido | `tax_id.py:45-52, 98, 113, 123-132`. Tests: CA2, CA49/CA57 (U+00A0, U+3000, `\t`, `\n`, `\r\n`), `test_vacio_o_solo_separadores_es_obligatorio` (ES y PT), `test_strip_separators_no_pasa_a_mayusculas`. |
| 001 R3 (DNI, NIE y CIF según la skill, más no ASCII → inválido) | Cumplido | `tax_id.py:55-103`. Patrones `[0-9]` con `fullmatch`. Letras DNI, prefijo NIE, tipos CIF (ABEH dígito, NPQRSW letra, resto ambos) y dígito de control coinciden con la skill. Cubierto por las 25 filas de `CASOS_MD`, `test_nie_*` y `test_ca59_*`. |
| 001 R4 (no ES: no ASCII antes de `upper()`, luego 5 a 20 de A-Z0-9) | Cumplido | `tax_id.py:106-115`. Tests de CA9, CA29, CA40, CA46, CA47, CA50 y dígitos Unicode en `test_tax_id_generic.py`. Mutación (guarda genérica eliminada): falla `test_ca46_...[straße1]`. |
| 001 CA4 (una fila de `casos.md` = un test) | Cumplido en servicio, sin test a nivel endpoint | `CASOS_MD` tiene 25 filas, las mismas que `casos.md` y en el mismo orden. Las verifiqué con un script que parsea el md y construye `[U+00A0]` y `(vacío)`. Incluye `P1111111ı` = No (fila 24) y los dígitos árabes U+0661 a U+0668 idénticos a los del md. Los valores esperados de las 13 filas válidas son literales. `test_ca4_las_filas_con_caracteres_especiales_usan_el_caracter_real` protege las filas de U+00A0 y U+0131. El `POST` con 201 o 422 sigue sin test (capa API). |
| 001 CA59 (`P1111111ı` → 422 «Identificador fiscal no válido.»; `P1111111I` → 201) | Cumplido en servicio, sin test a nivel endpoint | `test_ca59_es_rechaza_no_ascii_antes_de_mayusculas` y `test_ca59_la_version_ascii_si_es_valida`. El mensaje se compara con `INVALID_TAX_ID_MESSAGE` de los tests, construido de forma independiente con `chr(0x00E1)`. |
| 001 CA2, CA5, CA9, CA10, CA29, CA40, CA46, CA47, CA49, CA50, CA57 (parte pura) | Cumplido en servicio | Tests con el CA en el nombre en `test_tax_id.py` y `test_tax_id_generic.py`. |
| 002 R1 (tramos acumulativos con enteros) | Cumplido | `pricing.py:36-47`. 51 usuarios = 42 500 céntimos, coherente con la skill. |
| 002 R2 (IVA, ROUND_HALF_UP, total) | Cumplido | `pricing.py:50-52, 55-65`. IVA en céntimos con `quantize(Decimal(1), ROUND_HALF_UP)`. |
| 002 CA1 (7 filas de ejemplos resueltos) | Cumplido en servicio | `SUBTOTAL_ROWS` coincide con la skill. El texto con dos decimales es de la capa API. |
| 002 CA2 (3 filas de la tabla de IVA) | Cumplido en servicio | `VAT_ROWS`: 47000/9870/56870, 10800/2052/12852 y 10000/2300/12300. |
| 002 CA3 (5 países de iva.md con 10 usuarios) | Cumplido en servicio | `COUNTRY_ROWS` incluye FR (`"0.20"`) e IT. Pendiente de confirmar `"0.20"` (hallazgo 2). |
| 002 CA5 (10 000 usuarios = 50170,00) | Cumplido en servicio | 5 017 000 céntimos. El 422 con 10 001 es del schema (capa API). |
| 002 CA35 (ROUND_HALF_UP forzado) | Cumplido | `test_ca35_redondeo_half_up_forzado`: 10,5→11, 2,5→3 y 7,5→8 distinguen HALF_UP de HALF_EVEN, más casos por debajo y por encima de la mitad. |

## Hallazgos

No hay hallazgos de gravedad alta ni media. Ordenados por severidad:

| # | Gravedad | Archivo:línea | Problema | Arreglo sugerido |
| --- | --- | --- | --- | --- |
| 1 | Baja | `backend/app/services/country.py:12` frente a spec 001 R1, spec 002 R4, ADR 003 y skill `reglas-negocio` | Decisión de negocio fuera de spec. Un `country` con algún carácter no ASCII nunca se convierte en código: `eſ` no es ES y `ıt` no es IT. Las specs solo dicen «sin distinguir mayúsculas y se guarda en mayúsculas». Es la misma situación que fue el hallazgo 4: coherente y segura, pero sin documentar y sin CA. Hay tests, pero ningún criterio la respalda. | Pedir al arquitecto una línea en spec 001 R1, spec 002 R4 y ADR 003 («un país con algún carácter no ASCII queda fuera de la tabla: 422 «País no admitido.»»), con un CA con `eſ` o `ıt`. |
| 2 | Baja | `ai-workspace/01-specs/002-precio-y-simulaciones.md:113-114` | Sigue abierto el hallazgo 9 del informe anterior: CA2 y CA3 no recogen que FR devuelve `"0.20"` y no `"0.2"`. | Que Pablo o el arquitecto lo confirmen y lo añadan a CA3. |
| 3 | Baja | `backend/app/services/pricing.py:60`, `backend/app/services/country.py:12` | Con un `country` que no sea `str` (por ejemplo `None`), `calculate_price` lanza `AttributeError` y no `UnknownCountryError`. El servicio documenta que el tope de usuarios es del schema, pero no esto. | Dejarlo para el schema (tipo y obligatoriedad con «El país es obligatorio.») y añadir una línea al docstring. No hace falta tocar la lógica. |
| 4 | Baja | `backend/app/services/tax_id.py:132` | El valor guardado se calcula con `stripped.upper()`. Es la misma regla que `normalize_tax_id` (`tax_id.py:50-52`), en dos sitios. Hoy son equivalentes, pero R2 podría desviarse. | Que lo normalizado salga siempre de una sola función, por ejemplo `return stripped.upper()` mediante un helper común que también use `normalize_tax_id`. |
| 5 | Baja | `backend/tests/test_tax_id.py` (192 de 200 líneas) | Está a 8 líneas del límite de 200 de CLAUDE.md. Cualquier test nuevo de ES lo rompe. | Antes de añadir más, dividir por responsabilidad (por ejemplo, `test_tax_id_normalize.py` para separadores y normalización, y `test_tax_id_es.py` para DNI, NIE y CIF). |
| 6 | Info | `backend/tests/test_tax_id.py:70,74`, `backend/tests/test_tax_id.py:163-170` y `backend/tests/test_tax_id_generic.py:104-107`, nombres de tests | (a) `CASOS_MD[4]` y `CASOS_MD[23]` se indexan por posición: si se reordena el md, el test falla de forma confusa. (b) `test_tax_id.py:163` y `test_tax_id_generic.py:104` prueban casi lo mismo con `eſ`. (c) Los nombres de test mezclan español (`test_ca2_...`, siguen la skill `convenciones-backend`) e inglés (`test_constants.py`, `test_country.py`), y `CASOS_MD` es un identificador en español. CLAUDE.md pide nombres en inglés y la skill pone un ejemplo en español. | Ninguno es urgente. Para (a), localizar la fila por contenido. Para (b), dejar solo uno. Para (c), que Pablo fije el criterio de nombres de test. |
| 7 | Info | `backend/app/services/tax_id.py:24` | Único carácter no ASCII que queda en los `.py` de `app/` y `tests/`: `á` en «Identificador fiscal no válido.». Es un mensaje visible al usuario que debe estar en español y es una letra corriente, así que es inevitable (se podría escribir `\u00e1`, pero no aporta nada). | Ninguno. |

## Verificado sin hallazgo

- Escaneo de bytes con `python -I` de todos los `.py` de `app/` y `tests/` (14 archivos, UTF-8, sin BOM ni CR): un solo carácter con `ord > 127` en total (hallazgo 7, `tax_id.py:24`). No queda ninguno en los tests, ni en `test_pricing.py`, ni invisibles. Tampoco hay caracteres de control sueltos.
- Sin `float` en dinero. `grep float app tests` solo da el comentario de `pricing.py:8` («to avoid float»). Importes en `int` (céntimos) y `Decimal` para el tipo y el redondeo.
- Límite de 200 líneas: `country.py` 12, `pricing.py` 65, `tax_id.py` 132, `constants.py` 28, `test_constants.py` 41, `test_country.py` 21, `test_pricing.py` 119, `test_tax_id.py` 192, `test_tax_id_generic.py` 107. Todos por debajo de 200 (ver hallazgo 5).
- Servicios puros: sin FastAPI ni base de datos, con tipos en todas las funciones. `__pycache__`, `.venv` y las cachés están ignorados por git.
- Coherencia entre specs, ADR y skills: spec 001 (R2, R3, R4, Casos límite, CA4, CA59), ADR 006 y skill `validacion-nif` (SKILL.md y casos.md) describen la misma regla que el código. El texto del md y `CASOS_MD` coinciden fila a fila. No encuentro incoherencias nuevas entre ellas. Lo único nuevo es el hallazgo 1, que ninguna de ellas recoge. `iva.md` coincide con `VAT_RATES` (ES 21, PT 23, FR 20, DE 19, IT 22).
- Mutaciones, solo en memoria (script en el scratchpad con `python -I` que importa el módulo, parchea la función y lanza pytest; no se editó ningún archivo del proyecto):
  - Guarda ES eliminada: fallan 3 tests, los de CA4 y CA59 con `ı` y `ſ`.
  - Guarda genérica eliminada: falla `test_ca46_...[straße1]`.
  - `normalize_country` sustituida por `.upper()` en `tax_id`: falla el test de `eſ` como no ES.
  - `normalize_country` sustituida por `.upper()` en `pricing`: falla `[ıt]`.
  - `normalize_country` sustituida por `.upper()` en los tres módulos: falla `test_country`.
  - `strip_separators` que solo quita U+0020, punto y guion: falla la fila de U+00A0.
  - `strip_separators` que olvida el punto: falla la fila `12.345.678-Z`.
  - Sin mutaciones, los 155 tests pasan.

## Comandos ejecutados

```
cd backend && .venv/Scripts/python -m pytest -q
  -> 155 passed in 0.15s
cd backend && .venv/Scripts/python -m ruff format --check .
  -> 12 files already formatted
cd backend && .venv/Scripts/python -m ruff check .
  -> All checks passed!
wc -l app/*.py app/services/*.py tests/*.py
grep -rn "float" app tests
git status --short; git diff --stat
.venv/Scripts/python -I scan.py       (volcado de todo carácter ord>127 con punto de código y nombre, BOM y CR, en app/ y tests/)
.venv/Scripts/python -I casos.py      (parsea casos.md y lo compara con CASOS_MD: filas, orden, validez, literales esperados)
.venv/Scripts/python -I mut.py <mutación>   (7 mutaciones solo en memoria, con PYTHONDONTWRITEBYTECODE=1 y pytest -p no:cacheprovider)
  scripts en C:\Users\pablo\AppData\Local\Temp\claude\fd51300ddf347e46\94089702-2548-4643-b731-7b867b04ed9d\scratchpad\ (scan.py, casos.py, mut.py)
```

No se modificó ni se creó ningún archivo del proyecto.

## Pendiente fuera de este alcance (capa API, sin routers ni schemas todavía)

- Spec 002: CA1 a CA3 (formato de texto con dos decimales), CA4, CA5 (422 con 10 001), CA32 y CA36.
- Spec 001: CA4 (POST con 201 o 422), CA5, CA7, CA51 y CA59 (a nivel endpoint, sin fila nueva).
- Orden de validación R15 y mensajes «obligatorio» de `country` y `tax_id` ausentes o `null`.
