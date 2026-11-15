# Bitácora de trabajo con la IA

Una entrada por fase. Qué pedí, qué propuso la IA, qué detecté y corregí yo, y por qué.

Cómo trabajé: spec primero, código después. Usé un asistente de chat para pensar el proceso y revisar los informes, y Claude Code con un equipo de subagentes (`arquitecto`, `backend-dev`, `frontend-dev`, `qa-tester`, `auditor`), skills, hooks y un `CLAUDE.md` con las reglas. Quien implementa no se audita a sí mismo: cada bloque de código pasó por el `auditor`.

---

## 0. Entorno y equipo de agentes

**Qué pedí.** Montar un equipo de agentes con una función cada uno, reglas de negocio en skills (precios, IVA, NIF, convenciones) y hooks de seguridad.

**Qué propuso la IA.** Un paquete con `CLAUDE.md`, 8 skills, 5 subagentes y 2 hooks (uno protege `.env` y las bases de datos; otro formatea al guardar).

**Qué comprobé yo.** Probé que los hooks funcionan: se bloqueó la edición de `.env`, y Claude Code se negó a crear un archivo de prueba porque mi propio `CLAUDE.md` lo prohibía hasta que lo pedí yo expresamente. Eso confirmó que las reglas se aplican.

**Commit.** `253ba15`.

## 1. Specs y ADR (cuatro specs, ocho ADR)

**Qué pedí.** Que el `arquitecto` redactara los ADR y las specs iniciales antes de escribir código.

**Qué propuso la IA.** Ocho ADR (stack, cálculo en backend, IVA por país, almacenamiento y llamadas, planes, NIF, divisas, duplicados) y cuatro specs con criterios de aceptación y muchas preguntas abiertas.

**Qué decidí yo.**
- El cliente tiene nombre, email, país, plan e identificador fiscal. Busco por nombre o identificador, parcial y sin distinguir mayúsculas, ordenado alfabéticamente.
- El plan pertenece al **cliente**, no a la simulación: es informativo y lo elige el cliente.
- Cada simulación guarda el IVA y los importes del momento (snapshot), para que el historial no cambie si cambia un tipo de IVA.
- Importes como texto con dos decimales (`"470.00"`) y tipo de IVA como texto (`"0.21"`), nunca como número. En la base de datos, céntimos enteros.
- Usuarios de 1 a 10 000; almacenamiento y llamadas obligatorios; coerción estricta de enteros.
- Frontend: el alta de clientes va en un panel de la misma pantalla; sin router; detalle con ficha, simulador e historial; slider de 1 a 200 más un campo numérico hasta 10 000.
- Divisas: conversión en el frontend, tipo pedido una vez, 5 s de espera, aviso y «Reintentar» si falla; subtotal e IVA se convierten por separado y el **total es su suma**, para que el desglose siempre cuadre.

**Qué detecté y corregí.**
- El `arquitecto` comprimió la spec 001 a 200 líneas aplicando mal mi regla (era solo para código). Se corrigió en `CLAUDE.md`.
- Al reescribir la spec 001 borró mi nota original de «Cambios de Pablo». La hice restaurar.
- La spec 004 contradecía a las demás: seguía enviando el plan en la simulación. Se alineó.
- Un error mío: un buscar y reemplazar de VS Code cambió también las plantillas de las skills `adr` y `spec-writer` (decían que toda spec nace «Aprobada»). Lo vi en `git diff` y lo deshice con `git checkout`.
- La spec 001 necesitó cinco rondas de decisiones (espacios Unicode, caracteres no ASCII, búsqueda con `ß`, etc.), todas anotadas en «Cambios de Pablo».

**Commits.** `742eeec`, `5f93004`.

## 2. Backend: lógica pura (precio y NIF)

**Qué pedí.** Solo la lógica sin FastAPI ni base de datos, con tests, antes de los endpoints.

**Qué propuso la IA.** `calculate_price` con `Decimal` y `ROUND_HALF_UP`, y la validación de DNI, NIE, CIF y formato genérico (128 tests).

**Auditoría 001: CAMBIOS NECESARIOS.**
- Un test no probaba de verdad la guarda de caracteres no ASCII (se podía borrar y seguía en verde).
- Los caracteres especiales de los tests estaban como literales invisibles.
- La regla «ES rechaza no ASCII antes de pasar a mayúsculas» no estaba en ninguna spec. Sin ella, `P1111111ı` se convertía en `P1111111I`, un CIF válido. **Decidí que la regla se quedara y se documentara** (spec 001, ADR 006, skill), anotándolo como cambio posterior a la aprobación.

**Reauditoría 002: APROBADO** (155 tests; el auditor rompió el código en memoria y comprobó que los tests fallaban).

**Commits.** `8956909`, `ccc9da9`.

## 3. Backend: API de clientes (spec 001)

**Qué pedí.** Modelo, validación, errores y endpoints de clientes, con un test por criterio (CA1 a CA60).

**Qué propuso la IA.** Capa `repositories/` nueva, validación del cuerpo a mano (para cumplir el formato `{"detail": ...}` y el primer error en orden), `UNIQUE` en `tax_id`. 377 tests.

**Auditoría 003: APROBADO**, con un hallazgo medio: un error inesperado devolvía «Internal Server Error» en texto plano. Se corrigió (500 con `{"detail": ...}`) y se acotó el 409 a la restricción `UNIQUE` de `tax_id` (cualquier otro error de integridad es un error interno).

**Decidí:** `country` y `plan` no se recortan de espacios; en la ruta, `0`, negativos y enteros enormes dan 404, y `+1` o no numéricos dan 422. Documentado en la spec (octava ronda). Total: 395 tests.

**Commit.** `dd7ebeb`.

## 4. Backend: API de simulaciones (spec 002)

**Qué pedí.** `preview`, guardado e historial, con el precio siempre recalculado en el servidor.

**Qué propuso la IA.** Modelo con importes en céntimos y snapshot del IVA, reloj controlable en tests y monkeypatch de la tabla de IVA (555 tests).

**Auditoría 004: APROBADO.** El único punto de decisión (qué pasaría si un país saliera de la tabla de IVA) lo dejé sin tocar: hoy no puede ocurrir y no quise inventar una regla.

**Commit.** `5bcfc8c`.

## 5. Frontend: clientes (spec 003)

**Qué pedí.** Dashboard con buscador, contador y tarjetas, y el alta de clientes.

**Qué propuso la IA.** Composables `useCustomers` y de alta, componentes pequeños y 68 tests.

**Auditoría 005: APROBADO**, con un hallazgo medio: si se cancelaba el formulario mientras se enviaba el alta, el cliente se creaba pero la lista no se refrescaba. Se corrigió moviendo el alta a la vista, con test (73 tests). Hice yo la comprobación visual a 375 px y que el alta, el duplicado (409) y el identificador inválido (422) funcionan contra el backend real.

**Commit.** `2e6381a`.

## 6. Frontend: simulador (spec 004)

**Qué pedí.** Detalle del cliente con slider sincronizado con un campo numérico, cálculo con espera de 300 ms, conversión EUR/USD/GBP e historial.

**Qué propuso la IA.** `convertAmount` con `BigInt` (sin coma flotante), tipo de cambio conservado al volver a la lista, validación estricta de la respuesta de la API y 243 tests.

**Auditoría 006: APROBADO**, sin hallazgos importantes.

**Qué detecté yo.** Al revisar los términos de uso de `open.er-api.com` vi que **exigen un enlace de atribución** («Rates By Exchange Rate API»). No estaba en ninguna spec, así que lo documenté primero (R20, CA39, ADR 007) y después lo implementé. Total: 248 tests.

**Comprobación manual.** 60 usuarios con ES: 470,00 € + 98,70 € = 568,70 €. En USD: 518,77 + 108,94 = 627,71 US$ (el total es la suma de lo convertido). El simulador funciona con la API de tipos de cambio real y desde el navegador.

**Commit.** `3edde97`.

---

## Resumen de auditorías

| # | Qué se auditó | Veredicto |
| --- | --- | --- |
| 001 | Lógica pura de precio y NIF | Cambios necesarios |
| 002 | Reauditoría de la lógica pura | Aprobado |
| 003 | API de clientes | Aprobado (1 hallazgo medio, corregido) |
| 004 | API de simulaciones | Aprobado |
| 005 | Frontend de clientes | Aprobado (1 hallazgo medio, corregido) |
| 006 | Frontend del simulador | Aprobado |

Los informes completos están en `03-proceso/auditorias/`.

## Deuda técnica conocida

- Las tarjetas de cliente usan `role="button"` en lugar de un `<button>` nativo.
- Al abrir el panel de alta no se mueve el foco al primer campo.
- Un 201 con cuerpo vacío en el alta se mostraría como fallo.
- La lista parpadea brevemente al buscar.
- Python 3.12 se asume compatible pero solo se probó con 3.13.8.
- Los 500 no llevan cabeceras CORS: el navegador los ve como fallo de red (el frontend los trata igual).
- No se han revisado todos los límites de uso de `open.er-api.com`; el diseño (una petición por sesión) los respeta.
- Pasada final de documentación pendiente: versión de los límites de la API en el ADR 007 y la frase de «país fuera de tabla» en ADR 003 y spec 001.
