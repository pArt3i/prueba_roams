# Auditoría · API de simulaciones (spec 002: precio y simulaciones)
Veredicto: APROBADO

Spec revisada: ai-workspace/01-specs/002-precio-y-simulaciones.md (Estado: Aprobada). También ADR 002, 003 y 004, y las skills `reglas-negocio` y `convenciones-backend`.
Alcance: `backend/app/`, `backend/tests/` y `backend/requirements.txt`, en el commit 5bcfc8c. `git status` estaba limpio. La comparación con la spec 001 usa `git diff dd7ebeb 5bcfc8c`.

Resumen: los 17 requisitos vigentes (R6 está retirado) y los 37 criterios de aceptación se cumplen y tienen test que comprueba lo que dice el criterio. No hay hallazgos de gravedad alta ni media. Hay 5 hallazgos bajos y 2 informativos, ninguno bloquea.

## Criterios de aceptación

| CA | Estado | Evidencia |
| --- | --- | --- |
| CA1 | Cumplido | `test_simulations_preview.py::test_ca1_subtotal_de_ejemplos_resueltos`. Hay 7 filas parametrizadas (1, 10, 11, 50, 51, 60, 100) con ES y el subtotal en dos decimales. |
| CA2 | Cumplido | `test_ca2_iva_y_total_de_la_tabla`. Cubre las 3 filas de la skill (ES 60, DE 11, PT 10) y comprueba `vat_rate`, `subtotal`, `vat` y `total`. |
| CA3 | Cumplido | `test_ca3_tipo_de_cada_pais_con_diez_usuarios`. Cubre los 5 países, incluido FR `"0.20"` con dos decimales. |
| CA4 | Cumplido | `test_ca4_forma_exacta_de_la_respuesta`. Compara el JSON entero con el ejemplo, comprueba el conjunto exacto de claves, `users` entero y los importes como cadenas. |
| CA5 | Cumplido | `test_ca5_diez_mil_usuarios_es_valido` da `"50170.00"`. `test_ca5_diez_mil_uno_da_422` comprueba el mensaje. También `test_pricing.py::test_ca5_*`. |
| CA6 | Cumplido | `test_ca6_usuarios_invalidos`. Un test por valor: 0, -1, 1.5, "abc", True, None y ausente. |
| CA7 | Cumplido | `test_ca7_usuarios_como_cadena` (preview). `test_ca7_ca8_usuarios_cadena_o_decimal` (POST) comprueba además que no se guarda nada (`stored_rows == []`). |
| CA8 | Cumplido | `test_ca8_*` en preview usa `10.0`, `1e1`, `1E1` y `1.0e1` en bruto. En POST: `10.0` y `1e1` en bruto, sin guardar nada. |
| CA9 | Cumplido | `test_ca9_pais_fuera_de_la_tabla` (XX). `test_ca9_pais_ausente_vacio_o_nulo` cubre "", None, ausente, 5 y lista, todos con «El país es obligatorio.». |
| CA10 | Cumplido | `test_ca10_pais_en_minusculas`. `es` da la misma respuesta que `ES`, con `country` "ES" y total 568.70. |
| CA11 | Cumplido | `test_ca11_preview_no_escribe_en_la_base_de_datos` lee la tabla directamente tras un preview válido y otro fallido. Ver hallazgo 6. |
| CA12 | Cumplido | `test_ca12_campos_desconocidos_se_ignoran`. Envía `storage_gb`, `plan`, `total`, `foo` e `id`. La respuesta es idéntica a la normal y no los contiene. |
| CA13 | Cumplido | `test_ca13_alta_valida_con_respuesta_exacta`. Comprueba claves exactas, sin `plan`, importes iguales a los de preview, valores esperados y que el historial es `[created]`. |
| CA14 | Cumplido | `test_ca14_el_pais_sale_del_cliente` (DE, XX, "", None y 5 en el cuerpo). `test_ca14_cliente_de_otro_pais_usa_su_iva` (cliente DE con `country: ES` en el cuerpo da 0.19 y 20.52). |
| CA15 | Cumplido | `test_ca15_storage_y_api_calls_no_cambian_el_precio`. Importes iguales y cada uno conserva sus valores. |
| CA16 | Cumplido | `test_ca16_storage_y_api_calls_cero`. |
| CA17 | Cumplido | `test_ca17_maximos_validos`. Comprueba también el valor en el historial. |
| CA18 | Cumplido | `test_ca18_maximo_mas_uno_da_422`. Cubre ambos campos con su mensaje y comprueba que no se guarda nada. |
| CA19 | Cumplido | `test_ca19_campo_ausente`. Un test por campo, con su mensaje y sin guardar nada. |
| CA20 | Cumplido | `test_ca20_valores_no_validos`. Producto cartesiano de 2 campos y 6 valores (-1, 1.5, "5", 5.0, True, None), con su mensaje y sin guardar nada. |
| CA21 | Cumplido | `test_ca21_customer_id_no_valido`. Cubre "1", 1.0, True, None, "abc", ausente y `[1]`, sin guardar nada. |
| CA22 | Cumplido | `test_ca22_customer_id_inexistente`. Cubre 2, 999, 0, -1, 2**63-1, 2**63, ±10**30, con 404 y sin 500. El repositorio protege el rango en `get_customer` (`repositories/customers.py:59`). |
| CA23 | Cumplido | `test_ca23_importes_e_id_del_cliente_se_ignoran`. Envía `total`, `subtotal`, `vat`, `id=99` y `plan`. El total es 568.70, el id no es 99 y no aparece `plan`. |
| CA24 | Cumplido | `test_ca24_gana_el_422_de_users_sobre_el_404`. `test_ca24_un_error_por_respuesta_en_orden` corrige los campos de uno en uno. `test_ca24_customer_id_no_valido_gana_a_todo`. |
| CA25 | Cumplido | En preview: `test_ca25_cuerpo_no_valido` (7 variantes) y `test_ca25_cuerpo_ausente_sin_content_type`. En POST: 6 variantes, sin guardar nada. |
| CA26 | Cumplido | `test_ca26_todos_los_errores_son_detail_string` comprueba `list(data) == ["detail"]` y que sea string. Además `expect_error` compara el cuerpo exacto en todos los tests. |
| CA27 | Cumplido | `test_ca27_solo_las_simulaciones_del_cliente` (2 clientes, 3 simulaciones, orden comprobado). |
| CA28 | Cumplido | `test_ca28_cliente_sin_simulaciones` da 200 y `[]`. |
| CA29 | Cumplido | `test_ca29_cliente_inexistente` (404, incluidos los enteros fuera de rango). `test_ca29_id_no_entero` (abc, 1.5, 1.0, +1, 1_0 y dígitos árabes, con 422). |
| CA30 | Cumplido | `test_ca30a_*` (2 tests). El primero crea la reciente antes y comprueba que el orden es por fecha y no por id. `test_ca30b_mismo_created_at_sale_primero_el_id_mayor` con reloj controlado. |
| CA31 | Cumplido | `test_ca31_el_historial_devuelve_lo_mismo_que_el_post` compara claves y valores. |
| CA32 | Cumplido | `test_ca32_un_cambio_del_iva_no_altera_el_historial`. Con `monkeypatch.setitem(VAT_RATES, "ES", 0.10)`, el historial conserva "0.21", "98.70" y "568.70", y la nueva simulación usa "0.10". El test fallaría si el historial recalculara. |
| CA33 | Cumplido | `test_ca33_la_fila_guarda_centimos_enteros_y_el_tipo_como_texto`. Lee la fila y comprueba 47000, 9870 y 56870 como `int`, y `vat_rate == "0.21"` como `str`. |
| CA34 | Cumplido | Tres tests: con reloj fijo da `2026-11-15T10:00:00Z` y `utcoffset == 0`. Con zona +02:00 y microsegundos se guarda y devuelve en UTC. Con el reloj real termina en `Z`. |
| CA35 | Cumplido | `test_pricing.py::test_ca35_redondeo_half_up_forzado`. Usa 10.5→11, 2.5→3 y 7.5→8, que distinguen HALF_UP de HALF_EVEN. |
| CA36 | Cumplido | `test_ca36_ningun_importe_es_un_numero_json` en preview, POST e historial. Usa `parse_float` que falla y comprueba que los importes sean `str`. |
| CA37 | Cumplido | `test_ca37_pais_con_caracteres_no_ascii` (`eſ`, `Eſ`, `ıt`, `ıT`, con 422 «País no admitido.»). `test_ca37_pais_ascii_en_minusculas`. La lógica está en `services/country.py:12`. |

## Requisitos de negocio

| R | Estado | Evidencia |
| --- | --- | --- |
| R1 | Cumplido | `services/pricing.py:36-47`: tramos acumulativos con enteros (céntimos) y sin float. CA1 y CA5. |
| R2 | Cumplido | `pricing.py:50-52`: `Decimal` con ROUND_HALF_UP. CA2, CA3 y CA35. |
| R3 | Cumplido | `simulation_input.py:13,55-56`: 1 a 10 000 en preview y POST. CA5 y CA6. |
| R4 | Cumplido | `customer_input.py:101-109` y `country.py`. Minúsculas, ausente, XX y no ASCII están cubiertos (CA9, CA10 y CA37). |
| R5 | Cumplido | `simulation_input.py:75-78`. Obligatorios, con cotas y sin valor por defecto (CA16 a CA20). |
| R6 | Retirado | No se reutiliza. No hay `plan` en el modelo ni en los schemas de simulación. |
| R7 | Cumplido | `routers/simulations.py:28-36`: preview no recibe `db`. CA11 y CA12. |
| R8 | Cumplido | `routers/simulations.py:48-53`: el precio se recalcula en el servidor y solo se leen `customer_id`, `users`, `storage_gb` y `api_calls`. CA23. |
| R9 | Cumplido | `simulations.py:45-47`. CA22. |
| R10 | Cumplido | `repositories/simulations.py:41-45`: filtro por cliente y orden `created_at DESC, id DESC`. CA27 a CA30. |
| R11 | Cumplido | No hay endpoints de PUT, PATCH ni DELETE. `test_r11_no_hay_endpoints_para_modificar_ni_borrar`. |
| R12 | Cumplido | `simulation_input.py:42-43` usa `type(value) is int`, que excluye bool, float, str y None. CA7, CA8, CA20 y CA21. |
| R13 | Cumplido | `simulation_input.py` no lee `country`. El precio usa `customer.country`. CA14. |
| R14 | Cumplido | Se leen solo las claves necesarias. CA12 y CA23. |
| R15 | Cumplido | `models/simulation.py:19-25` guarda país, `vat_rate` y céntimos. `schemas/simulation.py:46-61` construye la salida solo desde lo guardado. CA32 y CA33. |
| R16 | Cumplido | `money.format_cents` (sin float), `clock.to_iso` y columnas `*_cents` enteras. CA4, CA33, CA34 y CA36. |
| R17 | Cumplido | `errors.py` convierte todo a `{"detail": str}`, incluso 405 y 500. El orden de validación es el de la spec. CA24 y CA26. |
| R18 | Cumplido | `customer_input.parse_body` se llama primero en ambos endpoints. CA25. |

## Revisiones adicionales solicitadas

| Punto | Resultado |
| --- | --- |
| Lógica de negocio en routers | Casi limpio. Los routers solo validan, llaman a servicios y devuelven schemas. La decisión «el país sale del cliente» está en el router (hallazgo 1, baja). |
| Float en dinero | Ninguno. `grep` de `float` en `app/` solo da comentarios y docstrings. El tipo de IVA se construye con `Decimal("0.21")` y se guarda como texto. |
| Importes como texto con dos decimales | Cumplido. `PreviewOut` y `SimulationOut` declaran `str`. Se comprobó con `json.loads(parse_float=...)`. |
| Snapshot del IVA y su test | Cumplido. CA32 usa `monkeypatch` sobre `VAT_RATES`. CA33 comprueba la fila guardada. |
| Precio recalculado en el servidor | Cumplido (R8 y CA23). El cuerpo nunca aporta importes. |
| Formato de errores | Cumplido. `{"detail": "texto"}` en 404, 405, 422 y 500 (`errors.py`, `test_internal_errors.py`). |
| Consultas parametrizadas | Cumplido. Solo `select()` y `db.get` de SQLAlchemy. No hay SQL en texto ni f-strings de SQL. |
| Archivos de más de 200 líneas | Ninguno. Máximo en `app/`: 138 líneas (`customer_input.py`). Máximo en tests: 175 (`test_simulations_history.py`). |
| Secretos en el código | Ninguno. La BD y CORS salen de variables de entorno con valores por defecto. `*.db` y `.env` están en `.gitignore` y no hay ninguno versionado. |
| Dependencias no autorizadas | Ninguna. `requirements.txt` no cambia en 5bcfc8c. |
| Regresión en la spec 001 | Ninguna. Ver el apartado siguiente. |

### Cambio en `routers/customers.py` (spec 001)
Con `git diff dd7ebeb 5bcfc8c` se comprobó lo siguiente.
- `read_body`, `Db` y `Body` se movieron tal cual a `routers/deps.py`. El cuerpo de `read_body` es idéntico. Solo cambia el docstring, que ya no cita «(R13)».
- `customers.py` sigue usando los mismos endpoints, códigos y mensajes.
- `customer_input.py`: `_country` pasa a llamarse `parse_country`, con la misma lógica, para reutilizarla en preview. `validate_customer` la sigue llamando en el mismo orden (R15 de la spec 001).
- `main.py` solo añade el `include_router`.
- Los tests de la spec 001 no se tocaron. Solo se añaden fixtures a `conftest.py` y mensajes a `messages.py`, sin borrar nada. Los 555 tests pasan, entre ellos todos los de clientes.

## Hallazgos

| # | Gravedad | Archivo:línea | Problema | Arreglo sugerido |
| --- | --- | --- | --- | --- |
| 1 | Baja | `backend/app/routers/simulations.py:48-53` | El router decide qué país se usa para el precio (`customer.country`, R13). Además `repositories/simulations.py:27` vuelve a leer `customer.country` para el snapshot. Hay dos fuentes del país: si divergieran, el IVA aplicado y el país guardado podrían no coincidir. | Añadir un servicio `price_for_customer(users, customer_country)`. O que el repositorio use `price.country`, incluyendo el país en `PriceBreakdown`. |
| 2 | Baja | `backend/app/routers/simulations.py:15-19` | El router de simulaciones importa `CustomerInputError`, `parse_body` y `parse_customer_id` de `services/customer_input.py`. Es una dependencia cruzada entre dominios. `simulation_input.py` también importa `ID_INVALID` y `parse_country` de ese módulo. | Extraer a un módulo neutro (por ejemplo `services/input_common.py`) con `InputError`, `parse_body`, `parse_customer_id` y `parse_country`. |
| 3 | Baja | `backend/app/services/pricing.py:58` | El docstring dice «the schema does» para el tope de 10 000 usuarios. La comprobación está en `services/simulation_input.py:13,56`, no en un schema. | Corregir el docstring. |
| 4 | Baja | `backend/app/services/pricing.py:60-62` y `routers/simulations.py:48` | Si el país de un cliente guardado sale algún día de `VAT_RATES` (por ejemplo, al reducir la tabla), `calculate_price` lanza `UnknownCountryError` y el cliente recibe un 500. Ahora no puede ocurrir (los clientes se validan contra la misma tabla), la spec no lo cubre y no hay test. | Decidir con Pablo qué respuesta se quiere y añadirla a la spec. No inventar la regla. |
| 5 | Baja | `backend/tests/test_simulations_preview.py:77` | El helper de CA3 deduce el total con `int(vat[:2])` sobre un texto («21.00»). Funciona, pero es poco legible y fácil de romper. | Pasar el total esperado como parámetro explícito en `COUNTRIES`. |
| 6 | Baja | `backend/tests/test_simulations_preview.py:147-152` | CA11 comprueba que no hay filas de simulaciones, pero no hay ningún cliente creado. Un `preview` que escribiera algo de otro tipo no se detectaría. | Crear un cliente antes y comprobar también el recuento de clientes. |
| 7 | Info | `backend/app/services/customer_input.py:53-63` | JSON con claves duplicadas (`{"users":1,"users":2}`) toma la última. Un BOM UTF-8 al inicio se acepta. Un entero de más de 4300 dígitos da 422 del campo (comprobado con un script en memoria; no hay tests). La spec no lo regula. | Sin acción. Solo documentarlo si Pablo lo quiere. |
| 8 | Info | Salida de pytest | Aviso `StarletteDeprecationWarning`: se usa `httpx` con `TestClient` y se recomienda `httpx2`. | No añadir dependencias sin avisar a Pablo. Tenerlo presente al actualizar. |

## Comandos ejecutados
Todos desde `C:\Users\pablo\Projects\saas-o-matic\backend`, sin activar el venv ni arrancar servidores.
- `.venv/Scripts/python -m pytest -q` da `555 passed, 1 warning in 24.56s` (el aviso es el del hallazgo 8).
- `.venv/Scripts/python -m ruff format --check .` da `54 files already formatted`.
- `.venv/Scripts/python -m ruff check .` da `All checks passed!`.
- `git status --short` (limpio), `git log --oneline` y `git diff dd7ebeb 5bcfc8c` con `--stat` y por archivo (`routers/customers.py`, `customer_input.py`, `main.py` y otros) para la regresión de la spec 001.
- `grep` de `float|Float|Numeric`, de secretos y de SQL en texto en `app/`, y `git ls-files` de `.db`, `.env` y `pycache`.
- Script de comprobación en memoria (con SQLite temporal fuera del repositorio) para JSON con NaN, claves duplicadas, BOM, barra final, entero gigante y `Content-Type: text/plain`. No se modificó nada del repositorio.
