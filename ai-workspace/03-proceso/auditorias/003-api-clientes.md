# Auditoría · API de clientes (spec 001)
Veredicto: APROBADO
Spec revisada: ai-workspace/01-specs/001-clientes.md (Estado: Aprobada, R1 a R17, CA1 a CA60)

Todos los criterios de aceptación se cumplen y tienen test. No hay hallazgos de gravedad alta. Hay 1 hallazgo de gravedad media y varios bajos, ninguno bloqueante. Se recomienda resolver el hallazgo 1 y consultar a Pablo los puntos 2 y 8 antes del frontend (specs 003 y 004).

Alcance: `backend/app/` (config, db, errors, main, models, repositories, routers, schemas, services), `backend/tests/` y `backend/requirements.txt`. También ADR 001, 003, 006 y 008 y las skills `convenciones-backend` y `validacion-nif`. Auditoría de solo lectura. Para sondear comportamientos se ejecutó código en el scratchpad, con una base de datos temporal ya borrada.

## Resultado de las comprobaciones pedidas

| Comprobación | Resultado |
| --- | --- |
| Lógica de negocio en routers | Correcto. `routers/customers.py` (59 líneas) solo parsea, llama a servicio o repositorio y traduce excepciones a `HTTPException`. Validación en `services/customer_input.py`, búsqueda y orden en `services/customer_search.py`, normalización en `services/tax_id.py` y `country.py`. |
| Formato `{"detail": "texto"}` | Correcto. `errors.py` cubre 422 (`RequestValidationError`) y toda `StarletteHTTPException`, incluidos 404 y 405. Se verificó que 404 y 405 devuelven `detail` en español y que 405 conserva la cabecera `Allow`. La excepción es el 500 no controlado (hallazgo 1). |
| Consultas parametrizadas | Correcto. Solo `select(...).where(...)` y `db.get`. No hay `text()`, `execute()` ni SQL concatenado. La búsqueda se hace en Python, sin `LIKE`. |
| UNIQUE de `tax_id` y carrera | Correcto. `models/customer.py:15` declara `unique=True`. `repositories/customers.py:32-46` comprueba antes de insertar, captura `IntegrityError`, hace `rollback` y devuelve 409 (ADR 008, opción 1). Tests: `test_la_base_de_datos_tiene_unique_en_tax_id`, `test_carrera_entre_dos_altas_la_restriccion_unique_da_409` y `test_tras_el_409_de_la_carrera_la_sesion_sigue_siendo_util`. La carrera se simula con `monkeypatch`, no hay test con concurrencia real (hallazgo 3). |
| `float` en dinero | Correcto. `grep float` en `app/` solo encuentra un comentario en `pricing.py:8`. Esta spec no maneja dinero. |
| CORS por configuración | Correcto. `config.py:14-17` lee `CORS_ORIGINS` con valor por defecto `http://localhost:5173`, y `main.py:29-34` lo aplica con `CORSMiddleware`. Hay tests de origen permitido, origen no permitido y configuración sin tocar el código. |
| Secretos | Ninguno. `DATABASE_URL` y `CORS_ORIGINS` salen del entorno. No hay `.db` ni `.env` en el árbol, y `.gitignore` los excluye. |
| Archivos de más de 200 líneas | Ninguno. El mayor de `app/` tiene 137 líneas (`customer_input.py`) y el mayor de `tests/` 192 (`test_tax_id.py`). |
| Dependencias | Correcto. El diff de `requirements.txt` solo añade `dnspython==2.9.2` y `email-validator==2.4.0`, las dos autorizadas. |
| Estilo y tipos | Todas las funciones llevan tipos, `response_model` en los tres endpoints, SQLAlchemy 2.x con `Mapped` y `select()`. Código y nombres en inglés, mensajes de usuario en español. |

## Criterios de aceptación

Todos los CA tienen al menos un test nombrado `test_caN_...`. Se comprobó con `grep` que no falta ninguno entre CA1 y CA60. «CC» = `test_customers_create.py`, «CE» = `test_customers_errors.py`, «CF» = `test_customers_fields.py`, «CG» = `test_customers_get.py`, «CS» = `test_customers_search_api.py`, «CT» = `test_customers_tax_id.py`.

| CA | Estado | Evidencia |
| --- | --- | --- |
| CA1 | Cumplido | CC `test_ca1_alta_correcta_devuelve_201_con_id_y_tax_id` comprueba el cuerpo completo. |
| CA2 | Cumplido | CC `test_ca2_...`, comprueba lo devuelto y lo leído con GET. |
| CA3 | Cumplido | CC `test_ca3_...`, comprueba mensaje exacto y 0 filas. |
| CA4 | Cumplido | CC `test_ca4_fila_de_casos_md`, 25 filas parametrizadas que coinciden una a una con `casos.md`. Construye U+00A0, U+0131 y los dígitos árabes con `chr()`, y `test_ca4_las_filas_con_caracteres_especiales_son_los_reales` lo verifica. |
| CA5 | Cumplido | CC `test_ca5_...` |
| CA6 | Cumplido | CC `test_ca6_...` |
| CA7 | Cumplido | CT `test_ca7_...`: duplicado exacto, `12.345.678-z` y con espacios, y `count == 1`. |
| CA8 | Cumplido | CC `test_ca8_...`: vacío y ausente. |
| CA9 | Cumplido | CC `test_ca9_...` (con 5, 20 y separadores) y CT `test_ca9_ca29_...`. |
| CA10 | Cumplido | CC `test_ca10_...`, también solo separadores. |
| CA11 | Cumplido | CS `test_ca11_un_texto_que_coincide_con_uno` y la variante por identificador. |
| CA12 | Cumplido | CG `test_ca12_...`: sin `q`, `q=` vacío y `q` de espacios. |
| CA13 | Cumplido | CS `test_ca13_...`: 200 con `[]`. |
| CA14 | Cumplido | CG `test_ca14_...` |
| CA15 | Cumplido | CG `test_ca15_...`: 404 con el mensaje exacto. |
| CA16 | Cumplido | CS `test_ca16_comodines_son_texto_literal` (`%`, `_`, `%25`, `A%`, `_lfa`) y la variante con nombres que contienen `%` y `_`. |
| CA17 | Cumplido | CF `test_ca17_...` (ausente y vacío). |
| CA18 | Cumplido | CF `test_ca18_...`, también `Ana <ana@acme.com>`. |
| CA19 | Cumplido | CF `test_ca19_...` |
| CA20 | Cumplido | CF `test_ca20_...`, también `Starter`, `STARTER` y ` starter`. |
| CA21 | Cumplido | CF `test_ca21_...` (3 planes). |
| CA22 | Cumplido | CF `test_ca22_...` (120 es 201, 121 es 422). |
| CA23 | Cumplido | CC `test_ca23_...` |
| CA24 | Cumplido | CS `test_ca24_...` |
| CA25 | Cumplido | CS `test_ca25_...` |
| CA26 | Cumplido | CG `test_ca26_...` |
| CA27 | Cumplido | CT `test_ca27_...`: igualdad exacta del cuerpo. |
| CA28 | Cumplido | CT `test_ca28_...`: ES contra PT y también PT contra FR. |
| CA29 | Cumplido | CT `test_ca29_...` (4, 21 y símbolos). |
| CA30 | Cumplido | CE `test_ca30_...`, y todos los tests usan `expect_error` (`== {"detail": msg}`). |
| CA31 | Cumplido | CS `test_ca31_...`: `---` encuentra solo `Beta---1` y no devuelve todos. |
| CA32 | Cumplido | CF `test_ca32_...`: `email_of_length` comprueba la longitud exacta (254 es 201, 255 es 422). |
| CA33 | Cumplido | CE `test_ca33_...`: recorre el orden de R15 paso a paso y termina en 201. |
| CA34 | Cumplido | CE `test_ca34_...` |
| CA35 | Cumplido | CE `test_ca35_...` |
| CA36 | Cumplido | CE `test_ca36_...` |
| CA37 | Cumplido | CS `test_ca37_...` (dos tests). |
| CA38 | Cumplido | CG `test_ca38_...` |
| CA39 | Cumplido | CG `test_ca39_...` |
| CA40 | Cumplido | CT `test_ca40_...` (`Ñ` y `ñ`). |
| CA41 | Cumplido | CE `test_ca41_...`: JSON cortado, vacío, roto, bytes inválidos, cuerpo ausente y sustitutos sueltos. |
| CA42 | Cumplido | CE `test_ca42_...` (`[]`, `"texto"`, `123`, `null`, `true`, `[{}]`). |
| CA43 | Cumplido | CF `test_ca43_...`: un test por campo. |
| CA44 | Cumplido | CF `test_ca44_...`: un test por campo con los valores de la spec. |
| CA45 | Cumplido | CF `test_ca45_...` |
| CA46 | Cumplido | CT `test_ca46_...`: comprueba que en mayúsculas serían ASCII y que se rechazan. |
| CA47 | Cumplido | CT `test_ca47_...` |
| CA48 | Cumplido | CF `test_ca48_...`, y `test_los_ids_los_asigna_el_servidor_en_orden`. |
| CA49 | Cumplido | CT `test_ca49_ca57_...` (U+00A0, U+3000, tab, salto y espacio). |
| CA50 | Cumplido | CT `test_ca50_u00a0_junto_a_un_no_ascii...` y `test_ca50_ca57_solo_separadores...` (ES y PT). |
| CA51 | Cumplido | CT `test_ca51_...` |
| CA52 | Cumplido | CS `test_ca52_...` |
| CA53 | Cumplido | CS `test_ca53_...`: discrimina, porque `Beta` tiene `SS123` y solo sale `Strasse GmbH`. |
| CA54 | Cumplido | CS `test_ca54_...`: discrimina, porque `Beta` tiene `N12345` y no aparece. |
| CA55 | Cumplido | CS `test_ca55_...`: comprueba que el nombre devuelto conserva los espacios. |
| CA56 | Cumplido | CS `test_ca56_...` (3 espacios, U+00A0 y tab). |
| CA57 | Cumplido | CT `test_ca49_ca57_...`, `test_ca57_tabulador_y_salto_de_linea_al_final` y `test_ca50_ca57_...`, y CS `test_ca57_...` |
| CA58 | Cumplido | CG `test_ca58_...` |
| CA59 | Cumplido | CT `test_ca59_...`: rechaza `ı` y acepta `P1111111I`. |
| CA60 | Cumplido | CF `test_ca60_...`: `eſ`, `ıt` y `Eſ`, y después `es` da 201. |

Resumen: 60 cumplidos, 0 no cumplidos, 0 sin test.

## Reglas R1 a R17

| Regla | Estado | Dónde se implementa |
| --- | --- | --- |
| R1 | Cumplida | `customer_input.py:101-108` y `country.py:12` (solo se convierte a mayúsculas si es ASCII). |
| R2 | Cumplida | `tax_id.py:45-52` (`isspace()`, `.` y `-`; después `upper()`). |
| R3 | Cumplida | `tax_id.py:98` (no ASCII se comprueba antes de `upper()`). |
| R4 | Cumplida | `tax_id.py:113-115` (`[A-Z0-9]{5,20}` con `fullmatch`). |
| R5 y R6 | Cumplidas | `repositories/customers.py:32-46`. El 409 solo lleva `detail`, y el 422 va antes porque la validación precede al repositorio. |
| R7 | Cumplida | `customer_search.py:35-78`. NFD, `casefold`, sin marcas y espacios colapsados. La búsqueda por `tax_id` solo se hace con `q` ASCII. Sin `LIKE`. |
| R8 | Cumplida | `routers/customers.py:50-59`. |
| R9 | Cumplida | `customer_input.py:79-85`. |
| R10 | Cumplida | `customer_input.py:88-98`. `check_deliverability` no se activa y se rechaza `Name <a@b>` con la comprobación de `<` y `>`. |
| R11 | Cumplida | `customer_input.py:111-117`. |
| R12 | Cumplida | `customer_search.py:68-70`. |
| R13 | Cumplida salvo el 500 | `errors.py` (hallazgo 1). |
| R14 | Cumplida | No hay `LIKE`. |
| R15 | Cumplida | `customer_input.py:130-137`. |
| R16 | Cumplida | `parse_body` (`customer_input.py:53-63`). Captura JSON roto, no objeto, bytes inválidos, recursión y sustitutos sueltos. |
| R17 | Cumplida | Se usa `payload.get(...)` y se ignora el resto. |

ADR 001: dependencia `email-validator` autorizada y añadida; la versión no está registrada en el ADR (hallazgo 7). ADR 003: se reutiliza la tabla `VAT_RATES` de `pricing.py`, sin duplicar países. ADR 006: servicio puro en `services/`. ADR 008: opción 1 implementada. Skill `validacion-nif`: patrones `[0-9]` con `fullmatch`, y algoritmos DNI, NIE y CIF correctos.

## Hallazgos

| # | Gravedad | Archivo:línea | Problema | Arreglo sugerido |
| --- | --- | --- | --- | --- |
| 1 | Media | `backend/app/errors.py:32-34` | R13 dice que todo error devuelve `{"detail": "texto en español"}`. Un error no controlado (500) responde `Internal Server Error` en texto plano. Se comprobó con una ruta que lanza una excepción. Solo se registran manejadores para `RequestValidationError` y `StarletteHTTPException`. | Registrar un manejador de `Exception` que devuelva 500 con `{"detail": "Error interno del servidor."}`, y añadir su test. Hay que mantener el comportamiento actual de 404 y 405. |
| 2 | Baja | `backend/app/services/customer_input.py:103,113` | `country` o `plan` formados solo por espacios (`"   "`) o con espacios en los extremos (`" ES "`) no cuentan como vacíos: dan «País no admitido.» y «Plan no válido…», no «obligatorio». La spec no dice si `country` y `plan` se recortan. No es incumplimiento, es un hueco de la spec. | Preguntar a Pablo si deben recortarse, antes de inventar la regla. Si se decide, ajustar la spec y añadir CA y test. |
| 3 | Baja | `backend/app/repositories/customers.py:44`; `backend/tests/test_customers_db.py:65-83` | (a) Se captura cualquier `IntegrityError` y se traduce a 409. Hoy solo existe el UNIQUE de `tax_id`, pero una restricción futura se confundiría con él. (b) La carrera se prueba con `monkeypatch`, no con dos peticiones concurrentes. Cubre el camino de código, pero no la concurrencia real. (c) SQLite no tiene `timeout` configurado: bajo escrituras concurrentes, un `OperationalError: database is locked` acabaría en 500. | Dejarlo anotado. Si se añaden más restricciones, distinguir la causa. Para (c), evaluar `connect_args={"timeout": ...}` y reabrir la opción PostgreSQL del ADR 001 solo si el uso crece. |
| 4 | Baja | `backend/tests/messages.py:3-5`; `backend/tests/constants.py:27-28` | El docstring de `messages.py` dice «ASCII only… unicode escapes», pero el archivo tiene 8 caracteres no ASCII literales. Además `constants.py` repite `INVALID_TAX_ID_MESSAGE` y `EMPTY_TAX_ID_MESSAGE`, que ya están en `messages.py`: dos fuentes para el mismo texto esperado. | Corregir el docstring (o escapar de verdad los acentos) y unificar en `messages.py`, adaptando `test_tax_id.py`. |
| 5 | Baja | `backend/tests/test_customers_create.py:12-38`; `backend/tests/test_tax_id.py:27` | La tabla `CASOS_MD` (25 filas de `casos.md`) está duplicada en dos archivos. Hoy coinciden, pero pueden desalinearse. | Moverla a `tests/constants.py` o a un módulo común y reutilizarla. |
| 6 | Baja | `backend/app/repositories/customers.py:10`; `backend/app/routers/customers.py:20` | Los mensajes de usuario están repartidos: `DUPLICATE_MESSAGE` en el repositorio, `NOT_FOUND_MESSAGE` en el router y el resto en servicios. La regla de duplicados (R5) vive en el repositorio y no en `services/`, aunque el ADR 008 habla de «comprobar en el servicio». La skill pide servicios sin base de datos, así que la ubicación es razonable. | Opcional: reunir los mensajes en un único módulo (por ejemplo `app/messages.py`) para evitar divergencias con `tests/messages.py`. |
| 7 | Baja | `ai-workspace/02-arquitectura/001-stack.md:44` | La pregunta abierta del ADR 001 pide fijar la versión mínima de `email-validator` al implementar la spec 001. No se ha actualizado: `email-validator==2.4.0` y `dnspython==2.9.2` (dependencia transitiva) no figuran. | Que el arquitecto añada ambas versiones a la tabla y cierre la pregunta. |
| 8 | Baja | `backend/app/services/customer_input.py:66-70`; `backend/tests/test_customers_get.py:40-49` | La spec lista «`id` 0, negativo o no numérico» sin decir el resultado de 0 y negativos. La implementación da 404 para enteros (`0`, `-1`) y 422 para lo que no sea `-?[0-9]+` (`+1`, `1_0`, `1.0`, `%201`). Es coherente con el Errores de la spec, pero los tests fijan una decisión que no está escrita. | Que Pablo confirme (y la spec lo refleje) que `0` y negativos dan 404 y que `+1` da 422. |
| 9 | Info | `backend/tests/helpers.py:34-36` | `count()` demuestra «no hay fila nueva» con `GET /customers`, que es parte de lo que se prueba. Solo `test_las_peticiones_fallidas_no_dejan_filas` mira la base de datos directamente. No es fallo, porque `GET` se prueba aparte. | Opcional: usar la base de datos directamente en los tests de «no crea fila». |
| 10 | Info | `ai-workspace/01-specs/001-clientes.md:86` | La spec dice «Cuerpo de la petición no válida.» en Casos límite y «no válido.» en el cuadro de Errores y en CA41. La implementación y los tests usan la forma del cuadro. | Corregir la errata en la spec. |

No hay hallazgos sobre: dinero con `float`, SQL a mano, secretos, archivos largos, pantallas (no aplica al backend) ni reglas duplicadas en el código de `app/`. La tabla de países y los tipos de IVA se leen de `pricing.py` y los algoritmos de NIF viven solo en `tax_id.py`.

## Comandos ejecutados

```
cd backend && .venv/Scripts/python -m pytest -q
  -> 377 passed, 1 warning (deprecación de httpx en starlette.testclient, ajena al código)
cd backend && .venv/Scripts/python -m ruff format --check .
  -> 37 files already formatted
cd backend && .venv/Scripts/python -m ruff check .
  -> All checks passed!
git status / git diff   (cambios solo en requirements.txt y tests/constants.py; el resto son archivos nuevos)
wc -l sobre app/ y tests/   (máximo 137 y 192 líneas)
grep: float, text(, execute(, secretos, test_caN presentes de CA1 a CA60
Sondeos con la app real sobre una base de datos temporal, ya borrada: 500 no controlado,
país/plan con espacios, /customers/ (307), BOM en el cuerpo, 405 con Allow
```

Rutas relevantes:
- `C:\Users\pablo\Projects\saas-o-matic\ai-workspace\01-specs\001-clientes.md`
- `C:\Users\pablo\Projects\saas-o-matic\backend\app\errors.py`
- `C:\Users\pablo\Projects\saas-o-matic\backend\app\repositories\customers.py`
- `C:\Users\pablo\Projects\saas-o-matic\backend\app\services\customer_input.py`
- `C:\Users\pablo\Projects\saas-o-matic\backend\tests\messages.py`
- `C:\Users\pablo\Projects\saas-o-matic\ai-workspace\02-arquitectura\001-stack.md`
