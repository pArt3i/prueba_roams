# Auditoría · Lógica pura de precio y NIF (pricing.py, tax_id.py y sus tests)

Veredicto: CAMBIOS NECESARIOS

Spec revisada: `ai-workspace/01-specs/001-clientes.md` (R2 a R4, CA4) y `ai-workspace/01-specs/002-precio-y-simulaciones.md` (R1, R2, CA1 a CA3, CA5, CA35). Contraste con las skills `reglas-negocio` (SKILL.md, iva.md), `validacion-nif` (SKILL.md, casos.md) y `convenciones-backend`.

Resumen: la lógica es correcta y completa para lo que cubre. Los 128 tests pasan y ruff está limpio. Hay dos problemas altos, ambos en los tests:
- La guarda «ES rechaza no ASCII antes de `upper()`» no está realmente probada. Si se borra la guarda, los tests de ES siguen en verde.
- U+00A0 y U+3000 están como caracteres literales invisibles en el código fuente, no como escapes.

## Criterios de aceptación

Los criterios que dependen de la capa API (formato de texto con dos decimales, claves de la respuesta, 409, 422 con mensaje) no pueden probarse sobre el servicio. Quedan «sin test» hasta que existan los routers y schemas.

| CA / Regla | Estado | Evidencia |
| --- | --- | --- |
| 001 R2 (normalizar: quitar `-`, `.` y todo `isspace()`, luego mayúsculas) | Cumplido | `tax_id.py:39-46`. Tests: `test_ca2_normaliza_puntos_guion_y_minuscula`, `test_ca49_ca57_...` (U+00A0, U+3000, `\t`, `\n`, `\r\n`), `test_vacio_o_solo_separadores_es_obligatorio`, `test_strip_separators_no_pasa_a_mayusculas`. |
| 001 R3 (ES: DNI, NIE, CIF según la skill) | Cumplido | `tax_id.py:49-97`. Patrones `[0-9]` con `fullmatch`. Letras DNI, prefijo NIE, tipos CIF y control comprobados contra la skill. Test de NIE con letra o prefijo erróneo (K). |
| 001 R4 (no ES: no ASCII, 422 antes de `upper()`; 5 a 20 de A-Z0-9) | Cumplido | `tax_id.py:100-108`. `test_tax_id_generic.py`. Mutación hecha: sin `isascii()`, los 5 casos de `test_ca46_...` (`straße1`, `ıstanbul1`, `ﬁnanz1`, `ßABCD`, `ABCDſ`) se aceptarían. Esos tests sí discriminan. |
| 001 CA4 (una fila de casos.md = un test) | Cumplido en servicio, sin test a nivel endpoint | `CASOS_MD` tiene las 24 filas de casos.md en el mismo orden, parametrizadas una a una. Es una lista de datos, no un test por fila escrito a mano. La fila de U+00A0 se construye con `NBSP` real y se comprueba (`test_ca4_la_fila_con_nbsp_usa_el_caracter_real`). El `POST` con 201 o 422 sigue sin test. |
| 001 CA2, CA5, CA9, CA10, CA29, CA40, CA46, CA47, CA49, CA50, CA57 (parte pura) | Cumplido en servicio | Ver tests citados en `test_tax_id.py` y `test_tax_id_generic.py`. |
| 002 R1 (tramos acumulativos con enteros) | Cumplido | `pricing.py:34-45`. Comprobado a mano: 51 usuarios = 10 000 + 32 000 + 500 = 42 500 céntimos. |
| 002 R2 (IVA, ROUND_HALF_UP, total) | Cumplido | `pricing.py:48-61`. IVA calculado en céntimos con `Decimal.quantize(1, ROUND_HALF_UP)`. Es equivalente a redondear a 2 decimales en euros. |
| 002 CA1 (7 filas de ejemplos resueltos) | Cumplido en servicio | `SUBTOTAL_ROWS` coincide con la skill. El «texto con dos decimales» no se prueba (capa API). |
| 002 CA2 (3 filas de la tabla de IVA) | Cumplido en servicio | `VAT_ROWS`: 47000/9870/56870, 10800/2052/12852, 10000/2300/12300. El formato de texto queda para la capa API. |
| 002 CA3 (5 países de iva.md, 10 usuarios) | Cumplido en servicio | `COUNTRY_ROWS` incluye FR e IT. |
| 002 CA5 (10 000 usuarios = 50170,00) | Cumplido en servicio | 5 017 000 céntimos. El 422 con 10 001 usuarios no está en el servicio y no tiene test (capa API). |
| 002 CA35 (ROUND_HALF_UP forzado) | Cumplido | `test_ca35_redondeo_half_up_forzado`. Los casos 10,5 → 11 y 2,5 → 3 distinguen HALF_UP de HALF_EVEN. |
| 002 CA32 (monkeypatch del tipo de IVA) | Viable | `VAT_RATES` es un dict de módulo que se lee en cada llamada, así que `monkeypatch.setitem` funciona. Sin test todavía (corresponde al router). |

## Hallazgos

| # | Gravedad | Archivo:línea | Problema | Arreglo sugerido |
| --- | --- | --- | --- | --- |
| 1 | Alta | `backend/tests/test_tax_id.py:103-106` | `test_es_rechaza_no_ascii_antes_de_mayusculas` no prueba la guarda de ES. Comprobé por mutación en memoria, sin tocar archivos, que sin `isascii()` los cuatro valores (`B1234567ı`, `P2812345ı`, `ß2345678Z`, `1234567ﬁ`) seguirían siendo inválidos por otras razones. Por ejemplo, `ı`→`I` en `P2812345ı` no coincide con el control correcto `C`, y `ß`→`SS` rompe el patrón. Con la guarda eliminada, todo el test pasa. Un valor que sí lo discrimina es `P1111111ı`: el CIF `P1111111I` es válido y el mutante sin guarda acepta `P1111111ı`. La implementación lo rechaza. | Añadir `P1111111` + `ı` y comprobar `InvalidTaxIdError`. Añadir también un caso con `ſ` (`ſ`) en la letra de tipo (CIF tipo S válido, p. ej. `S`+7 dígitos+control, con `ſ` en lugar de `S`). Mantener los actuales como casos secundarios. |
| 2 | Alta | `backend/tests/test_tax_id.py:13-14`, `backend/tests/test_tax_id_generic.py:11` | `NBSP` (U+00A0) e `IDEOGRAPHIC_SPACE` (U+3000) están escritos como el carácter literal invisible dentro de comillas. Verificado leyendo los bytes del archivo: `'NBSP = "\xa0"'` y `'IDEOGRAPHIC_SPACE = "　"'`. Un editor, formateador o copia/pega puede convertirlos en un espacio normal sin avisar. El test CA4 «usa el carácter real» solo protege una de las filas (`test_tax_id.py:59-63`). Esto incumple lo pedido: los caracteres especiales deben ser visibles y explícitos. | Escribirlos con escape: `NBSP = " "` y `IDEOGRAPHIC_SPACE = "　"`. Valdría también `chr(0xA0)`. |
| 3 | Media | `backend/tests/test_tax_id.py:15,103,141`, `backend/tests/test_tax_id_generic.py:12-15,37,50`, `backend/tests/test_pricing.py:101` | El resto de caracteres especiales también son literales: dígitos árabe-índicos (texto bidireccional, difícil de leer en el editor), `ß`, `ı` (se confunde con `i`), `ﬁ` (se confunde con «fi»), `ſ`, `Ñ`, `é`. Los confirmé como NFC y con los puntos de código esperados: U+0131, U+00DF, U+FB01, U+017F. Aun así, en el código fuente el lector no puede distinguirlos. En `test_tax_id.py:103` y `141` ni siquiera tienen constante con nombre; sí la tienen en `test_tax_id_generic.py:13-15`. | Usar escapes con constantes nombradas en un único sitio, por ejemplo `SHARP_S = "ß"`, `DOTLESS_I = "ı"`, `FI_LIGATURE = "ﬁ"`, `LONG_S = "ſ"`, `ARABIC_DIGITS = "١٢..."`. Podrían ir en `conftest.py` o en un módulo de constantes de test para no repetirlas en dos archivos. |
| 4 | Media | `backend/app/services/tax_id.py:86-97` frente a `ai-workspace/01-specs/001-clientes.md` R2 y R4 | Decisión fuera de spec: para ES se rechaza cualquier carácter no ASCII antes de `upper()`. R4 solo dice esto para no ES. La skill `validacion-nif` normaliza (incluido `upper()`) y luego valida. Leída al pie de la letra, `P1111111ı` sería válido. La decisión es coherente y segura: sin ella `ı`→`I` y `ſ`→`S` producirían NIF falsos aceptados, y casa con la regla de dígitos solo ASCII. Pero está sin registrar. | Pedir a Pablo o al arquitecto que la documente en la spec 001 (R3 o R2) y en la skill `validacion-nif`, con su criterio de aceptación. Mientras no se registre, el test del hallazgo 1 debe citarla. |
| 5 | Baja | `backend/app/services/tax_id.py:119` frente a `backend/app/services/pricing.py:55` | La normalización de `country` está duplicada y es inconsistente. `pricing` protege con `isascii()` antes de `upper()`. `tax_id` usa `country.upper() == "ES"` sin protección. Verifiqué que `"eſ".upper() == "ES"`, así que `normalize_and_validate_tax_id(x, "eſ")` trataría el país como ES. El docstring dice que el país «ya viene validado», así que hoy no es explotable, pero la regla R1 (spec 001) está en dos sitios. | Extraer una función única, `normalize_country(raw) -> str` con `isascii()`, y usarla en ambos módulos. Añadir un test con `eſ`. |
| 6 | Baja | `backend/tests/test_tax_id.py:49-53` | En las filas válidas, `assert result == normalize_tax_id(tax_id)` compara la función bajo prueba con otra función del mismo módulo. Un error común en `strip_separators` no se detectaría. Solo CA2 y la fila de U+00A0 comparan con un literal. | Añadir la columna del valor esperado en `CASOS_MD`, por ejemplo `"12.345.678-Z"` → `"12345678Z"`. |
| 7 | Baja | `backend/app/services/pricing.py:53-61` | `calculate_price` no valida que `country` sea `str` (con `None` lanza `AttributeError`) ni el máximo de 10 000 usuarios (spec 002, R3). El tope y la coerción estricta son tarea del schema, pero no hay aviso. | Dejarlo anotado para el schema y el router de la spec 002. Mientras tanto, documentar en el docstring que el servicio no aplica el tope de 10 000. |
| 8 | Baja | `backend/app/services/pricing.py:1-16`, `backend/app/services/tax_id.py:1-4,40,87-90,101-104` | Comentarios y docstrings en español y sin tildes (`calculo`, `pais`, `espanol`), mientras que CLAUDE.md pide código y nombres en inglés. Los nombres de funciones y variables sí están en inglés. Los nombres de test en español siguen el ejemplo de `convenciones-backend` (`test_ca3_...`). `TaxIdEmptyError` e `InvalidTaxIdError` no tienen docstring. | Decidir criterio: o comentarios en inglés, o en español con tildes. Es menor y no bloquea. |
| 9 | Info | `backend/app/services/pricing.py:7-13` | `vat_rate` sale como `str(Decimal("0.20"))` = `"0.20"` para FR, y `"0.21"`, `"0.19"`, `"0.23"`, `"0.22"` para el resto. La spec 002 y el ADR 003 solo fijan `"0.21"`, `"0.19"` y `"0.23"`. Dos decimales es coherente, pero conviene que Pablo confirme `"0.20"` (frente a `"0.2"`) antes de que lo use el router. | Confirmar y, si procede, añadir `"0.20"` a CA3 de la spec 002. |

Sobre las decisiones que la implementación añadió fuera de spec:
- ES rechaza no ASCII antes de `upper()`: coherente con R4 y la skill, pero sin registrar (hallazgo 4).
- `isascii()` también en `country` de `calculate_price`: coherente con spec 002 R4 y ADR 003 (el país se compara sin distinguir mayúsculas). Evita que `ıt` valga como `IT`; hay test (`"ıt"` en `test_pais_desconocido_lanza_error`).
- `bool` rechazado como `users`: coherente con spec 002 R12.
- Cadena vacía tras normalizar → `TaxIdEmptyError` antes de la comprobación no ASCII: coherente con la tabla de Errores y con CA50.

## Verificado sin hallazgo

- Sin `float` en dinero. `grep` de `float` en `app` y `tests`: solo aparece en un comentario (`pricing.py:6`). Importes en `int` (céntimos) y `Decimal` para el tipo y el redondeo. El único literal decimal fuera de `Decimal(...)` es `1.5`, una entrada inválida de test, no dinero.
- Datos de los tests tomados de las skills: `SUBTOTAL_ROWS` (7 filas de reglas-negocio), `VAT_ROWS` (3 filas de la tabla de IVA), `COUNTRY_ROWS` (5 países de iva.md), `CASOS_MD` (24 filas de casos.md) y el valor 50170 de la spec. Los valores de `test_ca35` (50×0,21, 10×0,25, 30×0,25...) los pide la spec 002 como «valor forzado». Los NIE negativos (`Z1234567L`, `X1234567R`, `Y1234567L`, `K1234567L`) son inventados pero derivados de casos válidos de casos.md. Aceptable.
- Límite de 200 líneas: `pricing.py` 61, `tax_id.py` 125, `test_pricing.py` 110, `test_tax_id.py` 145, `test_tax_id_generic.py` 87.
- Estilo según `convenciones-backend`: servicios puros sin FastAPI ni base de datos, tipos en todas las funciones, nombres de test con el CA. `ruff check` sin avisos y `ruff format --check` sin cambios.
- Tipos de CIF (ABEH solo dígito, NPQRSW solo letra, resto ambos), cálculo del dígito de control, tabla `JABCDEFGHI`, patrones NIE y DNI: revisados línea a línea contra la skill.
- Codificación: los cinco archivos están en UTF-8, con saltos de línea LF y sin BOM.

## Comandos ejecutados

```
cd backend && .venv/Scripts/python -m pytest -q
  -> 128 passed in 0.13s
cd backend && .venv/Scripts/python -m ruff format --check .
  -> 8 files already formatted
cd backend && .venv/Scripts/python -m ruff check .
  -> All checks passed!
wc -l app/services/*.py tests/*.py
grep -rn "float" app tests
.venv/Scripts/python -I (script en línea): volcado de cada carácter no ASCII con su punto de código y nombre Unicode, por archivo y línea
.venv/Scripts/python -I (script en línea, solo en memoria): mutación sin guarda isascii() para ES y no ES
.venv/Scripts/python -I (script en línea): comprobación de "eſ".upper() == "ES" y de P1111111I como CIF válido
git status --short, git diff --stat
```

No se modificó ningún archivo ni se creó ninguno.

## Pendiente fuera de este alcance

Los criterios de la capa API siguen sin test y deberán cubrirse al implementar routers y schemas:
- Spec 002: CA1 a CA3 (formato de texto con dos decimales), CA4, CA5 (422 con 10 001 usuarios), CA32 y CA36.
- Spec 001: CA4 (POST con 201 o 422), CA5, CA7 y CA51.
