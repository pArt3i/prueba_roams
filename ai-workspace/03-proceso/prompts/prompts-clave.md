# Prompts clave

Selección de los prompts que más pesaron en el proyecto, tal cual se enviaron a Claude Code, en el orden en que se usaron. No están todos (hubo muchos mensajes cortos de aclaración); están los que muestran **cómo he dirigido a la IA**.

## Cómo trabajé

- **Dos herramientas.** Un asistente de chat para pensar el proceso y revisar los informes, y Claude Code para ejecutar el trabajo. Los prompts los redacté con ayuda del asistente de chat y los pegué en Claude Code. Las decisiones de producto y de arquitectura son mías: en muchos casos el asistente de chat propuso opciones y yo elegí o ajusté, y las ejecutó Claude Code.
- **Un equipo de subagentes con una sola función cada uno:** `arquitecto` (specs y ADR), `backend-dev`, `frontend-dev`, `qa-tester` y `auditor`. Sus reglas están en `.claude/agents/` y las normas del proyecto en `CLAUDE.md`.
- **Ciclo fijo:** spec aprobada → implementa un subagente → **audita otro distinto** → se corrige → reauditoría → verificación → commit mío. Quien implementa no se audita a sí mismo.
- **Los commits los hago yo**, desde la terminal. `CLAUDE.md` prohíbe a la IA hacer commit o push, y los prompts de implementación incluyen «no hagas commits».
- **Patrones que se repiten en los prompts:** «Edita solo estos archivos», «No modifiques nada salvo guardar tu informe», «No cambies más comportamiento ni añadas dependencias», y pedir al final un informe de los archivos tocados. Es la forma de evitar que la IA se salga del encargo.

## Índice

- 1. Primer encargo al arquitecto: ADR y specs
- 2. Mis decisiones sobre la spec 001 (clientes)
- 3. Casos raros: campos desconocidos, espacios Unicode y caracteres no ASCII
- 4. Cierre de la spec 003 (frontend de clientes)
- 5. Cierre de la spec 004 (detalle, simulador e historial)
- 6. Decisiones sobre el tipo de cambio (tercera ronda de la spec 004)
- 7. Primera implementación: solo la lógica pura
- 8. Auditoría de la lógica pura
- 9. Decisión tras la auditoría: la regla se queda y se documenta
- 10. Implementación de la API de clientes
- 11. Auditoría de la API de clientes
- 12. Corrección de los hallazgos
- 13. Implementación de la API de simulaciones
- 14. Implementación del frontend de clientes
- 15. Auditoría del frontend de clientes
- 16. Implementación del simulador
- 17. Auditoría del frontend completo
- 18. Un requisito que ninguna spec recogía: atribución de la API de divisas
- 19. Implementación de la atribución
- 20. README

---

## 1. Primer encargo al arquitecto: ADR y specs

**Fase:** Spec primero, código después

**Qué buscaba.** Que el `arquitecto` redactara los 8 ADR y las 4 specs antes de escribir una línea de código, con las decisiones ya tomadas por mí y todo lo demás como «Preguntas abiertas», sin inventar respuestas.

**Resultado.** Salieron 8 ADR y 4 specs con muchas preguntas abiertas. Las fui cerrando en rondas, anotadas en «Mis cambios» de cada spec.

```text
Usa el subagente arquitecto. Lee CLAUDE.md y la skill reglas-negocio.

Primero redacta los ADR en ai-workspace/02-arquitectura (Estado: Propuesta) para estas decisiones: 001 stack; 002 el precio se calcula solo en el backend con POST /simulations/preview; 003 tabla de IVA por país y simplificaciones; 004 almacenamiento y llamadas a la API solo se guardan; 005 planes informativos; 006 validación del identificador fiscal; 007 divisas con open.er-api.com y fallback a EUR; 008 duplicados con 409.

Después redacta las specs en ai-workspace/01-specs (Estado: Borrador): 001 clientes (POST /customers, GET /customers?q=, GET /customers/{id}); 002 precio y simulaciones (POST /simulations/preview, POST /simulations, GET /customers/{id}/simulations); 003 frontend: buscador, dashboard y tarjetas de cliente; 004 frontend: simulador con slider y selector de divisa.

Decisiones: las de la skill reglas-negocio, más almacenamiento y llamadas a la API que se guardan sin afectar al precio, país fuera de tabla con 422, y duplicados con 409. No escribas código de la aplicación. Lo que falte, a «Preguntas abiertas». Deja vacía la sección «Cambios de Pablo».
```

---

## 2. Mis decisiones sobre la spec 001 (clientes)

**Fase:** Spec primero, código después

**Qué buscaba.** Cerrar las preguntas abiertas de la spec 001 (campos, duplicados, formato de errores, búsqueda) con decisiones mías, aplicadas en todas las secciones para que la spec quedara coherente. Los campos, la búsqueda y el orden son míos; el resto lo propuso el asistente de chat y lo acepté.

**Resultado.** La spec 001 necesitó varias rondas de decisiones (hasta la octava, ya con la API implementada). Cada una quedó anotada con fecha y motivo.

```text
Usa el subagente arquitecto. Edita solo ai-workspace/01-specs/001-clientes.md y no cambies su Estado (sigue en Borrador). Aplica estas decisiones mías en TODAS las secciones que afecten, para que la spec quede coherente:

CAMPOS DEL CLIENTE
- El cliente tiene: name, tax_id, email, country y plan. Todos obligatorios.
- email: formato válido, se guarda en minúsculas y sin espacios en los extremos.
- plan: starter, business o enterprise; cualquier otro valor da 422.
- name: sin espacios en los extremos, no vacío, máximo 120 caracteres.
- country: se acepta en minúsculas y se guarda en mayúsculas.
- tax_id fuera de ES: entre 5 y 20 caracteres alfanuméricos tras normalizar.

DUPLICADOS Y ERRORES
- La unicidad es solo por tax_id normalizado, sin tener en cuenta el país.
- El 409 no incluye el id del cliente existente.
- Todos los errores devuelven {"detail": "texto en español"}, también los de validación.
- Mensajes nuevos: «El email es obligatorio.», «El email no es válido.», «Plan no válido. Valores admitidos: starter, business, enterprise.», «El nombre no puede superar 120 caracteres.».

BÚSQUEDA
- GET /customers?q= busca por nombre o por identificador fiscal, con coincidencia parcial y sin distinguir mayúsculas.
- q se recorta de espacios. Para el identificador, q se normaliza igual que tax_id; si queda vacío tras normalizar, solo se busca por nombre.
- Sin paginación. Orden alfabético por nombre, sin distinguir mayúsculas, y por id si empatan.
- Los comodines (%, _) se tratan como texto literal.

QUÉ ACTUALIZAR
- Entradas, Salidas (el JSON de ejemplo con email y plan), Reglas de negocio, Errores y Casos límite.
- Criterios de aceptación: mantén los existentes y añade los nuevos con el mismo formato dado/cuando/entonces. Deben cubrir email (ausente, inválido, mayúsculas), plan inválido, nombre demasiado largo, país en minúsculas, búsqueda por identificador con otro formato, búsqueda parcial sin distinguir mayúsculas, orden alfabético y 409 sin id.
- Preguntas abiertas: elimina las que queden resueltas.
- Cambios de Pablo: conserva lo que ya escribí y añade debajo una lista con los cambios aplicados.
- No modifiques los ADR. Al final de tu respuesta, dime qué habría que cambiar en los ADR 003, 006 y 008 para que no contradigan esta spec.
```

---

## 3. Casos raros: campos desconocidos, espacios Unicode y caracteres no ASCII

**Fase:** Spec primero, código después

**Qué buscaba.** Decidir qué pasa con casos poco habituales antes de que el código los resuelva por su cuenta (espacio U+00A0, `ß`, texto no ASCII en la búsqueda).

**Resultado.** Cada decisión se convirtió en criterio de aceptación con su test.

```text
Usa el subagente arquitecto. Aplica estas decisiones mías:
1. Campos desconocidos en el alta: se ignoran.
2. Espacios: al normalizar identificadores y q, cualquier espacio Unicode (incluido U+00A0) cuenta como separador y se elimina. La regla de no ASCII se aplica al valor que queda tras quitar esos espacios.
3. q con caracteres no ASCII: la búsqueda por identificador solo se aplica si q, tras quitar separadores, es ASCII; si no, se busca solo por nombre. La búsqueda por nombre usa casefold e ignora tildes, no upper().
4. ADR 003: el tipo de IVA se guarda y se devuelve como texto decimal ("0.21"). Los importes se guardan en céntimos y la API los devuelve como texto con dos decimales ("470.00"). La tabla se queda en ES, PT, FR, DE e IT.
5. ADR 001: Python 3.12 o superior, probado con 3.13.8.
6. Añade los criterios de aceptación necesarios en la spec 001 y anota las decisiones en «Cambios de Pablo» como «Cuarta ronda», sin borrar lo anterior.
No toques la spec 002 todavía. Edita solo la spec 001 y los ADR 001, 003 y 006.
```

---

## 4. Cierre de la spec 003 (frontend de clientes)

**Fase:** Spec primero, código después

**Qué buscaba.** Cerrar todas las preguntas abiertas de la spec 003 y registrar cada decisión. Incluye una instrucción para corregir un error de la IA anterior: el límite de 200 líneas es solo para código, no para specs.

**Resultado.** La spec pasó a Aprobada y quedó alineada con la 001, la 002 y la 004.

```text
Usa el subagente arquitecto. Aplica estas decisiones mías a la spec 003 (ai-workspace/01-specs, usa el nombre actual del archivo). Cierra TODAS las preguntas abiertas: resuélvelas en el cuerpo, borra la sección «Preguntas abiertas» y registra cada decisión en «Cambios de Pablo» como «Primera ronda, 2026-11-15, por decisión de Pablo». No compactes la spec: el límite de 200 líneas es solo para código.

1. Dashboard: buscador, contador de clientes («N clientes», «1 cliente» en singular; cuenta los resultados mostrados), tarjetas de cliente y un botón «Nuevo cliente». Sin métricas ni simulaciones recientes.
2. Datos de cada tarjeta (los que devuelve GET /customers según la spec 001): nombre, país, identificador fiscal, email y plan. Actualiza el JSON de ejemplo de la spec con los cinco campos y el id. El plan se muestra como «Starter», «Business» o «Enterprise».
3. Navegación sin router: pulsar una tarjeta (accesible con teclado) cambia a la vista de detalle del cliente (spec 004) y esa vista tiene un botón «Volver a clientes». La lista se recarga al volver.
4. Búsqueda: se lanza al escribir con una espera de 300 ms, sin mínimo de caracteres. El texto se recorta antes de enviarse; si queda vacío, se pide la lista completa. Las respuestas antiguas se descartan (mantén CA9). Sin paginación.
5. Alta de clientes (ahora entra en esta spec): botón «Nuevo cliente» que abre un panel con formulario (no modal) con campos nombre, email, país (selector con España, Portugal, Francia, Alemania e Italia; es una lista de presentación sin tipos de IVA), plan (selector Starter, Business, Enterprise) e identificador fiscal. Todos con <label> asociado. Se envía a POST /customers. Mientras se envía, el botón se desactiva para evitar duplicados. Si la API responde 422 o 409, se muestra su mensaje «detail» en una región con role="alert". Si hay fallo de red: «No se pudo crear el cliente. Inténtalo de nuevo.». Si se crea (201): se cierra el panel, se limpia la búsqueda, se recarga la lista y se muestra «Cliente creado.». El frontend no valida identificadores fiscales; la validación es del backend.
6. Añade criterios de aceptación para: contador (singular y plural), tarjeta con los cinco datos, apertura del detalle al pulsar una tarjeta y vuelta, formulario con éxito, con 422, con 409, con fallo de red, sin doble envío, y debounce de 300 ms en la búsqueda. Renumera los CA.
7. CA11 (sin fórmulas de precio) pasa a ser una comprobación del auditor, no un test de Vitest. Los tests de Vitest cubren el composable useCustomers (cuatro estados, búsqueda, descarte de respuestas antiguas) y el de alta de cliente.
8. ADR 005: añade los textos en español de los planes (Starter, Business, Enterprise) y cierra su pregunta abierta. En la skill convenciones-frontend, si no dice que las respuestas antiguas se descartan también en el buscador, añádelo con una frase; no toques nada más.

Edita solo la spec 003, el ADR 005 y la skill convenciones-frontend. Al terminar dime qué archivos tocaste, cuántas líneas tiene la spec y si queda alguna pregunta abierta o contradicción con las specs 001 y 002.
```

---

## 5. Cierre de la spec 004 (detalle, simulador e historial)

**Fase:** Spec primero, código después

**Qué buscaba.** Lo mismo para el simulador. Aquí se resolvió una contradicción: la spec 004 seguía enviando el plan en la simulación, cuando por decisión mía el plan pertenece al cliente y es informativo.

**Resultado.** La spec 004 quedó alineada con la 002 (el plan ya no viaja en la simulación).

```text
Usa el subagente arquitecto. Aplica estas decisiones mías a la spec 004 (ai-workspace/01-specs, usa el nombre actual del archivo). Cambia su título a «004 · Frontend: detalle del cliente, simulador e historial» y su objetivo en consecuencia. Cierra TODAS las preguntas abiertas: resuélvelas en el cuerpo, borra la sección «Preguntas abiertas» y registra cada decisión en «Cambios de Pablo» como «Primera ronda, 2026-11-15, por decisión de Pablo». No compactes la spec: el límite de 200 líneas es solo para código.

1. La vista de detalle (se abre desde una tarjeta de la spec 003) contiene la ficha del cliente, el simulador y el historial de simulaciones. Los datos del cliente son los de la tarjeta seleccionada; no hace falta llamar a GET /customers/{id}. Hay un botón «Volver a clientes».
2. El plan se muestra en la ficha desde el cliente, solo informativo. Ya no es un campo del simulador ni se envía a POST /simulations (spec 002). El país sale del cliente y no se puede cambiar.
3. Slider de usuarios de 1 a 200, paso 1, más un campo numérico sincronizado que acepta de 1 a 10 000 (si el valor pasa de 200, el slider queda en 200). Valor inicial 1. Ambos con <label> asociado y aria-label. Si el campo numérico queda vacío o fuera de rango, no se pide cálculo y se ve el mensaje «El número de usuarios debe ser un entero entre 1 y 10000.».
4. Almacenamiento (GB) y llamadas a la API son campos numéricos obligatorios, enteros, valor inicial 0, con máximos 1 000 000 y 1 000 000 000 respectivamente (spec 002). Son informativos: se guardan pero no disparan el cálculo ni cambian el precio. Si son inválidos, se ve un error de campo con los mismos mensajes que la spec 002 y «Guardar simulación» queda desactivado.
5. El cálculo usa POST /simulations/preview con users y el país del cliente, con una espera de 300 ms tras el último cambio (slider o campo numérico) y descarte de respuestas antiguas. Mientras se calcula, el importe anterior sigue visible con un indicador de carga.
6. «Guardar simulación» envía POST /simulations con customer_id, users, storage_gb y api_calls (nunca plan, país ni importes). Se desactiva mientras hay un cálculo en curso, si el cálculo falló, si hay campos inválidos y mientras se guarda (así no se duplica con doble clic). Tras un 201 se muestra «Simulación guardada.» y se recarga el historial. Un 404 muestra «Cliente no encontrado.»; un 422 muestra el mensaje de la API; un fallo de red muestra «No se pudo guardar la simulación. Inténtalo de nuevo.».
7. Divisa: EUR por defecto, USD y GBP. El tipo de cambio se pide una sola vez a open.er-api.com la primera vez que se elige USD o GBP y se guarda en memoria. Si la petición no responde en 5 segundos o falla, se muestran los importes en EUR con un aviso visible («No se pudo obtener el tipo de cambio. Se muestran los importes en EUR.») y un botón «Reintentar» que vuelve a pedirlo. La conversión se hace en el frontend.
8. Conversión: subtotal e IVA se convierten por separado (importe en EUR × tipo, a 2 decimales con ROUND_HALF_UP) y el total mostrado es la suma del subtotal convertido y el IVA convertido, de forma que el desglose siempre cuadra. Sin acumular errores de coma flotante en los importes (usa aritmética con enteros en céntimos o una librería decimal; indícalo en la spec como requisito). Formato con Intl.NumberFormat en es-ES. Lo guardado en el backend sigue siendo EUR. Añade un criterio con un tipo fijo y un caso de redondeo donde el total convertido directamente difiera en 0,01 de la suma.
9. Historial: GET /customers/{id}/simulations, más reciente primero. Cada fila muestra fecha (formato es-ES), usuarios, almacenamiento, llamadas a la API y subtotal, IVA y total en EUR tal como se guardaron, con la nota «Importes en EUR». Estados: cargando, error con «Reintentar» y vacío con «Aún no hay simulaciones.». No se convierte a otra divisa.
10. Criterios de aceptación nuevos o ajustados: detalle con ficha, simulador e historial; campo numérico sincronizado con el slider; valores fuera de rango sin llamada; los campos informativos no disparan cálculo; guardar desactivado en los casos indicados; envío de POST sin plan ni importes; recarga del historial tras guardar; fallos de cálculo, guardado e historial; reintento del tipo de cambio; conversión con total = suma. Renumera los CA. CA13 (sin fórmulas en src/) pasa a ser comprobación del auditor, no test de Vitest. Los tests de Vitest cubren usePricing (espera, cancelación y errores), el composable del tipo de cambio (una sola petición, 5 s, reintento), la función de conversión y el guardado/historial.
11. ADR 007: refleja la conversión en el frontend, el tiempo de espera de 5 s, el reintento, la regla de «convertir por partes y sumar» y cierra sus preguntas abiertas. En la skill reglas-negocio, actualiza solo la parte de conversión de divisas para que diga lo mismo (total = subtotal convertido + IVA convertido); no toques nada más.

Edita solo la spec 004, el ADR 007 y la skill reglas-negocio. Al terminar dime qué archivos tocaste, cuántas líneas tiene la spec y si queda alguna pregunta abierta o contradicción con las specs 001, 002 y 003.
```

---

## 6. Decisiones sobre el tipo de cambio (tercera ronda de la spec 004)

**Fase:** Spec primero, código después

**Qué buscaba.** Resolver los casos límite de la API de divisas antes de implementarla: reintentos, respuesta parcial, lectura del tipo sin coma flotante.

**Resultado.** Se añadieron criterios de aceptación y se descartaron las otras opciones en el ADR 007.

```text
Usa el subagente arquitecto. Aplica estas decisiones mías a la spec 004 y al ADR 007:
1. «Reintentar» con una espera de 300 ms pendiente: cancela la espera y hace una sola petición.
2. Tipo de cambio: si solo uno de los dos tipos (USD, GBP) es inválido o result no es "success", toda la respuesta cuenta como fallo (se muestra EUR con aviso y «Reintentar»).
3. «Reintentar» del cálculo solo aparece en fallos de red o 5xx. Con un 422 de preview se muestra el mensaje de la API y no hay «Reintentar»; el usuario corrige el valor.
4. Lectura del tipo sin coma flotante: se usa String(n) del número leído, con tests (incluye 1.0829 y 1.005). Si el texto resultante contiene «e» (notación científica), el tipo se trata como inválido. Descarta en el ADR las otras dos opciones.
Cierra las «Preguntas abiertas» de la spec 004 (borra la sección), regístralo en «Cambios de Pablo» como «Tercera ronda, 2026-11-15, por decisión de Pablo» y añade criterios de aceptación donde haga falta, renumerando y actualizando la tabla de renumeración. Edita solo la spec 004 y el ADR 007. Al terminar dime líneas de la spec y si queda alguna contradicción.
```

---

## 7. Primera implementación: solo la lógica pura

**Fase:** Implementación guiada por specs

**Qué buscaba.** Empezar por lo más crítico (precio y validación del NIF) sin FastAPI ni base de datos, para poder auditarlo aislado.

**Resultado.** 128 tests. Después lo audité (prompt 8).

```text
Usa el subagente backend-dev. Implementa SOLO la lógica pura, sin FastAPI, sin base de datos y sin routers, de las specs 001 y 002 (ya Aprobadas). Primero lee CLAUDE.md, las skills reglas-negocio, validacion-nif y convenciones-backend, y las specs.

1. Cálculo de precio (spec 002, R1 y R2): una función que, dados usuarios y país, devuelva el tipo de IVA como texto decimal, subtotal, IVA y total en céntimos enteros, con Decimal, tramos acumulativos de la skill y tipos de iva.md, ROUND_HALF_UP y sin float. Tests de los criterios CA1 a CA3, CA5 (10 000 usuarios dan 50170.00) y CA35 (redondeo forzado).
2. Identificador fiscal (spec 001, R2 a R4): normalización (cualquier espacio Unicode, puntos y guiones, mayúsculas) y validación de DNI, NIE y CIF, más el formato genérico para países no ES (5 a 20 caracteres A–Z y 0–9; cualquier carácter no ASCII, inválido, comprobado antes de pasar a mayúsculas). Tests del CA4 (un test por cada fila de validacion-nif/casos.md, con el carácter U+00A0 real) y de los casos límite de R2 y R4 (ß, ı, ﬁ, U+00A0, tabulador, vacío).

Crea la estructura de backend/ según convenciones-backend si no existe. No instales dependencias nuevas. Ejecuta pytest y ruff hasta que todo pase. No hagas commits. Al terminar dime los archivos creados, el resultado de los tests y cualquier decisión que hayas tomado fuera de las specs.
```

---

## 8. Auditoría de la lógica pura

**Fase:** Control de calidad

**Qué buscaba.** Que un subagente distinto del que escribió el código lo revisara contra las specs y las skills, buscando tests que no prueben de verdad lo que dicen y caracteres invisibles. Con la orden expresa de no modificar nada.

**Resultado.** Veredicto **CAMBIOS NECESARIOS**: un test no probaba de verdad la guarda de no ASCII, había caracteres invisibles y una regla implementada que no estaba en ninguna spec.

```text
Usa el subagente auditor. Revisa la lógica pura que acaba de escribir backend-dev: backend/app/services/pricing.py, backend/app/services/tax_id.py y sus tests en backend/tests/. Compáralos con la spec 001 (R2 a R4, CA4) y la spec 002 (R1, R2, CA1 a CA3, CA5, CA35), y con las skills reglas-negocio y validacion-nif. Comprueba además: que no haya float en dinero, que los tests usen datos de las skills y no valores inventados, y que los caracteres especiales de los tests (U+00A0, ß, ı, ﬁ) sean visibles y explícitos en el código fuente (por ejemplo con escapes \u00a0 o con chr()), no caracteres invisibles. No modifiques nada. Cuando termines, guarda tu informe tal cual en ai-workspace/03-proceso/auditorias/001-logica-pura-precio-nif.md.
```

---

## 9. Decisión tras la auditoría: la regla se queda y se documenta

**Fase:** Control de calidad

**Qué buscaba.** Ante una regla que el código aplicaba pero ninguna spec recogía (`ı` se convertía en `I` y un CIF inválido pasaba como válido), decidí conservarla y documentarla en spec, ADR y skill, anotándola como cambio posterior a la aprobación.

**Resultado.** Spec 001 (CA59), ADR 006 y skill actualizados. Reauditoría aprobada con 155 tests.

```text
Usa el subagente arquitecto. El auditor detectó una regla implementada que no está en la spec: en ES, cualquier carácter no ASCII en el identificador fiscal (una vez quitados los separadores) es inválido y se comprueba antes de pasar a mayúsculas; si no, `ı` se convertiría en `I` y podría pasar como letra de control de un CIF válido. Decisión mía: la regla se queda y se documenta.
1. Spec 001: añade esa frase a R3, un caso límite y un criterio nuevo CA59 con el caso `P1111111ı` (el que propuso el auditor), que da 422 «Identificador fiscal no válido.». La spec ya estaba Aprobada: no cambies su Estado y registra el cambio en «Cambios de Pablo» como «Sexta ronda, 2026-11-15, cambio posterior a la aprobación, por decisión de Pablo a raíz de la auditoría 001-logica-pura-precio-nif».
2. ADR 006: añade que la comprobación de no ASCII se aplica también a ES.
3. Skill validacion-nif: añade la misma regla en una frase y, si encaja con el formato de la tabla, el caso `P1111111ı` con resultado No en casos.md.
Edita solo la spec 001, el ADR 006 y la skill validacion-nif. Al terminar dime qué archivos tocaste.
```

---

## 10. Implementación de la API de clientes

**Fase:** Implementación guiada por specs

**Qué buscaba.** Implementar la spec 001 completa con un test por criterio de aceptación, respetando la estructura por capas.

**Resultado.** 377 tests. Audité el resultado (prompt 11).

```text
Usa el subagente backend-dev. Implementa la spec 001 (clientes, Aprobada) completa en backend/: modelo SQLAlchemy, validación y errores, servicios y routers de POST /customers, GET /customers?q= y GET /customers/{id}. Lee primero CLAUDE.md, la spec 001, los ADR 001, 003, 006 y 008 y las skills convenciones-backend y validacion-nif.
Orden de trabajo: (1) servicios puros de la búsqueda y el orden (R7, R12: NFD, casefold, espacios en blanco seguidos como uno, q normalizado como tax_id solo si es ASCII) con sus tests; (2) base de datos SQLite con DATABASE_URL y creación de tablas al arrancar, y el modelo con UNIQUE en tax_id (ADR 008); (3) validación y formato de errores {"detail": "texto"} con solo el primer error en el orden de R15, incluidas las reglas R16 y R17, sin el formato por defecto de FastAPI; (4) routers finos. Un test por cada criterio de aceptación, CA1 a CA60, con base de datos de pruebas aislada y emails con dominio acme.com.
Te autorizo a instalar email-validator (ADR 001) y, si no está ya en requirements.txt, httpx (lo necesita TestClient). Ninguna otra dependencia sin avisarme. Actualiza requirements.txt. Configura CORS para el origen del frontend en desarrollo (http://localhost:5173) mediante configuración, no a mano. No arranques servidores en primer plano ni hagas commits. Ejecuta pytest y ruff hasta que todo pase. Al terminar dime los archivos creados, el resultado de los tests, los criterios que no hayas podido probar y cualquier decisión fuera de la spec.
```

---

## 11. Auditoría de la API de clientes

**Fase:** Control de calidad

**Qué buscaba.** Auditoría criterio por criterio, más comprobaciones transversales: lógica de negocio en routers, SQL concatenado, secretos, archivos largos, tests que no prueban lo que dicen y dependencias no autorizadas.

**Resultado.** **APROBADO** con un hallazgo medio: un error inesperado devolvía «Internal Server Error» en texto plano.

```text
Usa el subagente auditor. Audita la implementación de la spec 001 (clientes) en backend/: app/, tests/ y requirements.txt. Compárala criterio por criterio con ai-workspace/01-specs/001-clientes.md (R1 a R17 y CA1 a CA60), con los ADR 001, 003, 006 y 008 y con las skills convenciones-backend y validacion-nif. Comprueba además: lógica de negocio dentro de routers, formato de errores {"detail": "texto"} en todos los casos (incluidos 404 y 405), uso de consultas parametrizadas de SQLAlchemy (sin SQL a mano ni concatenado), el UNIQUE de tax_id y el manejo de la carrera entre dos altas, ningún float en dinero, la configuración de CORS (por configuración, no a mano), secretos en el código, archivos de más de 200 líneas, que los tests de cada CA comprueben de verdad lo que dice el criterio y que no haya dependencias nuevas sin autorizar (solo email-validator y dnspython). Ejecuta pytest y ruff. No modifiques nada salvo guardar tu informe tal cual en ai-workspace/03-proceso/auditorias/003-api-clientes.md.
```

---

## 12. Corrección de los hallazgos

**Fase:** Control de calidad

**Qué buscaba.** Pedir solo la corrección de lo que señalaba el informe, sin cambiar más comportamiento, y volver a ejecutar tests y lint.

**Resultado.** 500 con `{"detail": ...}`, el 409 acotado a la restricción UNIQUE de `tax_id`, y 395 tests.

```text
Usa el subagente backend-dev. Corrige estos hallazgos del informe ai-workspace/03-proceso/auditorias/003-api-clientes.md:
1. Un error no controlado (500) debe devolver {"detail": "Error interno del servidor."} con código 500, nunca texto plano, y no debe filtrar trazas ni datos al cliente. Añade el manejador y su test.
2. Solo el IntegrityError causado por la restricción UNIQUE de tax_id debe convertirse en 409; cualquier otro IntegrityError debe tratarse como error interno. Añade el test.
3. Elimina la duplicación en los tests que señala el informe (CASOS_MD, mensajes y el docstring de messages.py), sin cambiar lo que prueban.
No cambies más comportamiento. No añadas dependencias ni hagas commits. Ejecuta pytest y ruff hasta que todo pase y dime los archivos tocados y el resultado.
```

---

## 13. Implementación de la API de simulaciones

**Fase:** Implementación guiada por specs

**Qué buscaba.** Implementar la spec 002: vista previa, guardado con snapshot del IVA e historial; el precio siempre se recalcula en el servidor.

**Resultado.** 555 tests. Auditoría 004: **APROBADO**.

```text
Usa el subagente backend-dev. Implementa la spec 002 (precio y simulaciones, Aprobada) completa en backend/: POST /simulations/preview, POST /simulations y GET /customers/{id}/simulations. Lee primero CLAUDE.md, la spec 002, los ADR 002, 003 y 004 y las skills reglas-negocio y convenciones-backend, y reutiliza lo que ya existe (services/pricing.py, services/country.py, errors.py, la base de datos y los helpers de la spec 001).
Orden de trabajo: (1) modelo de la simulación: importes en céntimos enteros, tipo de IVA como texto, país, storage_gb, api_calls, created_at en UTC, y clave foránea al cliente; (2) validación manual con el formato de errores {"detail": "texto"}, solo el primer error, en el orden de R17, con coerción estricta de enteros (R12), campos desconocidos ignorados (R14) y cuerpo no válido (R18); (3) repositorio y routers finos; el historial más reciente primero y por id descendente si empatan; (4) formato de respuesta: importes como texto con dos decimales, vat_rate como texto decimal, created_at ISO 8601 UTC con Z, sin ningún número JSON en importes. Haz que la hora de creación se pueda controlar en los tests (CA30) y que el tipo de IVA se pueda cambiar con monkeypatch (CA32). Para el id de cliente aplica las mismas reglas que GET /customers/{id} (spec 001 R8): 0, negativos y enteros enormes dan 404, nunca 500.
Un test por cada criterio de aceptación, CA1 a CA37. No añadas dependencias ni hagas commits, y no arranques servidores. Ejecuta pytest y ruff hasta que todo pase y dime los archivos creados, el resultado, los criterios sin probar y cualquier decisión fuera de la spec.
```

---

## 14. Implementación del frontend de clientes

**Fase:** Implementación guiada por specs

**Qué buscaba.** Implementar la spec 003 con la estructura que exigen las skills (tipos, servicios, composables, componentes pequeños) y autorizando solo las dependencias imprescindibles.

**Resultado.** 68 tests. Auditoría 005.

```text
Usa el subagente frontend-dev. Implementa la spec 003 (dashboard de clientes, buscador y alta; Aprobada) en frontend/. Lee primero CLAUDE.md, la spec 003 y la spec 001 (contrato de la API), el ADR 005 y la skill convenciones-frontend. Si tienes context7, consulta la documentación de la versión instalada de Vue y Vite antes de usar una API que no recuerdes con seguridad; si el plugin frontend-design está instalado, aplícalo al diseño visual.
Estructura: tipos en src/types/, llamadas HTTP en src/services/ con la URL de VITE_API_URL (crea frontend/.env.example con VITE_API_URL=http://localhost:8000; no toques ningún .env real), lógica en composables (useCustomers y el de alta de cliente), componentes pequeños para el buscador, el contador, la tarjeta, la rejilla, el formulario de alta y los estados de cargando, error y vacío. Sin router ni Pinia: la App cambia entre la lista y una vista de detalle provisional (un marcador que la spec 004 sustituirá) guardando el cliente seleccionado. Textos en español, primero móvil, foco visible y contraste suficiente.
Tests con Vitest y @vue/test-utils para todos los criterios marcados (Vitest) de la spec 003, CA1 a CA25 salvo CA16 y CA24. Si falta @vue/test-utils o un entorno de DOM, te autorizo a añadirlos; ninguna otra dependencia sin avisarme. No arranques servidores ni hagas commits. Comprueba con cd frontend && npm run type-check && npm run lint && npm run test:unit -- --run hasta que todo pase. Al terminar dime los archivos creados, el resultado, los criterios sin probar y cualquier decisión fuera de la spec.
```

---

## 15. Auditoría del frontend de clientes

**Fase:** Control de calidad

**Qué buscaba.** Comprobar entre otras cosas que no hay fórmulas de precio en el frontend y que las respuestas antiguas se descartan de verdad.

**Resultado.** **APROBADO** con un hallazgo medio (H1): si se cancelaba el formulario mientras se enviaba el alta, el cliente se creaba pero la lista no se refrescaba.

```text
Usa el subagente auditor. Audita la implementación de la spec 003 (dashboard de clientes, buscador y alta) en frontend/src/ y sus tests. Compárala criterio por criterio con ai-workspace/01-specs/003-frontend-clientes.md (R1 a R16 y CA1 a CA25) y con la skill convenciones-frontend y el ADR 005. Comprueba además: ninguna fórmula de tramos ni de IVA (CA24), sin any, tipos en src/types, llamadas HTTP solo en src/services, lógica en composables, estados de cargando, error y vacío, accesibilidad (labels asociados, foco, roles role="status" y role="alert"), que las respuestas antiguas se descartan de verdad, que no hay doble envío del alta, que ningún archivo de código pasa de 200 líneas, que no hay secretos ni .env reales y que los tests comprueban de verdad lo que dice cada criterio. No modifiques nada salvo guardar tu informe tal cual en ai-workspace/03-proceso/auditorias/005-frontend-clientes.md. Ejecuta type-check, lint y test:unit -- --run.
```

---

## 16. Implementación del simulador

**Fase:** Implementación guiada por specs

**Qué buscaba.** El trozo más grande del frontend: simulador con slider, conversión de divisa sin coma flotante (`BigInt`), espera de 300 ms, descarte de respuestas antiguas e historial. Orden de trabajo explícito, empezando por la función pura de conversión.

**Resultado.** 243 tests.

```text
Usa el subagente frontend-dev. Implementa la spec 004 (detalle del cliente, simulador e historial; Aprobada) en frontend/. Lee primero CLAUDE.md, la spec 004, la spec 002 (contrato de la API), la spec 003 (la vista de lista ya existe), el ADR 007 y las skills convenciones-frontend y reglas-negocio. Si tienes context7, consúltalo antes de usar una API de Vue o Vite que no recuerdes con seguridad.
Orden de trabajo: (1) la función pura convertAmount en src/utils/currency.ts, con aritmética de enteros (BigInt) sin float y sin dependencias nuevas, y sus tests (CA28, CA29, redondeo ROUND_HALF_UP); (2) el composable del tipo de cambio, con estado fuera de la vista de detalle para que se conserve al volver a la lista (R12), espera de 5 s, validación estricta de la respuesta de open.er-api.com (https://open.er-api.com/v6/latest/EUR, result "success", rates.USD y rates.GBP, tipo leído con String(n)), una sola petición y reintento; (3) usePricing (espera de 300 ms, cancelación y descarte de respuestas antiguas, usuarios inválidos, errores y Reintentar solo en red o 5xx), el composable de guardado y el del historial; (4) tipos en src/types/ y servicios en src/services/; (5) componentes y la vista de detalle que sustituye a CustomerDetailPlaceholder.vue, con el botón «Volver a clientes» (la lista se recarga al volver, spec 003 R5), la ficha, el slider y el campo numérico sincronizados, almacenamiento y llamadas a la API, selector de divisa, desglose, «Guardar simulación» y el historial con sus estados. Textos en español, diseño primero móvil, foco visible y contraste suficiente. Mantén el estilo visual ya usado en la lista de clientes.
Tests con Vitest y @vue/test-utils para todos los criterios marcados (Vitest) de la spec 004, CA1 a CA38 salvo CA37 y CA38 (para CA22 fija la zona horaria del entorno de pruebas). Ninguna dependencia nueva sin avisarme. No arranques servidores ni hagas commits. Comprueba con cd frontend && npm run type-check && npm run lint && npm run test:unit -- --run hasta que todo pase. Al terminar dime los archivos creados, el resultado, los criterios sin probar y cualquier decisión fuera de la spec.
```

---

## 17. Auditoría del frontend completo

**Fase:** Control de calidad

**Qué buscaba.** Auditar el simulador y comprobar que el hallazgo H1 de la auditoría anterior había quedado cerrado.

**Resultado.** **APROBADO**, sin hallazgos importantes.

```text
Usa el subagente auditor. Audita el frontend completo en frontend/src/: la spec 004 (detalle del cliente, simulador e historial) y, de la spec 003, la reorganización de la corrección H1 (el alta vive ahora en CustomersView; el informe ai-workspace/03-proceso/auditorias/005-frontend-clientes.md sigue diciendo H1 abierto: actualízalo en tu informe nuevo). Compara criterio por criterio con ai-workspace/01-specs/004-frontend-detalle-simulador.md (R1 a R19, CA1 a CA38) y con los ADR 005 y 007 y la skill convenciones-frontend. Comprueba especialmente: que no hay fórmulas de tramos ni IVA y que la única aritmética de dinero es convertAmount (CA37), sin float, sin parseFloat ni Number() sobre importes, sin response.text() ni reviver; la conversión «subtotal e IVA por separado y total como suma»; el descarte de respuestas antiguas y la cancelación de la espera de 300 ms; que «Guardar simulación» se desactiva en todos los casos de R9 y no hay doble envío; el tipo de cambio pedido una sola vez y conservado al volver a la lista; el timeout de 5 s y la validación estricta de la respuesta; que lo enviado a POST /simulations es solo customer_id, users, storage_gb y api_calls; archivos de más de 200 líneas; any; secretos; y que los tests comprueban de verdad lo que dice cada criterio. Ejecuta type-check, lint y test:unit -- --run. No modifiques nada salvo guardar tu informe tal cual en ai-workspace/03-proceso/auditorias/006-frontend-simulador.md.
```

---

## 18. Un requisito que ninguna spec recogía: atribución de la API de divisas

**Fase:** Control de calidad

**Qué buscaba.** Al revisar los términos de uso de `open.er-api.com` (a raíz de mi duda sobre cómo íbamos con la parte de divisas) se vio que exigen un enlace de atribución. Primero lo documenté (regla, criterio de aceptación y ADR) y después lo implementé (prompt siguiente): la spec va antes que el código también para los descubrimientos tardíos.

**Resultado.** Regla R20 y criterio CA39.

```text
Usa el subagente arquitecto. Documenta este requisito de los términos de uso de open.er-api.com, sin cambiar ninguna otra decisión ni Estado: dondequiera que se usen sus tipos de cambio, debe verse un enlace con el texto exacto «Rates By Exchange Rate API» que apunte a https://www.exchangerate-api.com (puede ser discreto). Fuente: https://www.exchangerate-api.com/docs/free. Añade a la spec 004 una regla (el siguiente R libre) y un criterio de aceptación (el siguiente CA libre, comprobable con Vitest: el enlace aparece en el simulador cuando se muestran importes convertidos o la divisa elegida no es EUR, o siempre que se use la API; elige la opción más simple: visible siempre en el simulador). Anótalo en el ADR 007, cerrando la nota de «términos de uso no revisados» con este resultado, y en «Cambios de Pablo» de la spec 004 como «Cuarta ronda, 2026-11-15, posterior a la aprobación, por decisión de Pablo a raíz de la auditoría 006». Edita solo la spec 004 y el ADR 007.
```

---

## 19. Implementación de la atribución

**Fase:** Implementación guiada por specs

**Qué buscaba.** Implementar R20 y CA39 con su test.

**Resultado.** 248 tests.

```text
Usa el subagente frontend-dev. Implementa en frontend/ la regla R20 y el criterio CA39 de la spec 004 (ai-workspace/01-specs/004-frontend-detalle-simulador.md): el simulador muestra siempre, con cualquier divisa y con la API respondiendo o fallando, un enlace con el texto exacto «Rates By Exchange Rate API» que apunta a https://www.exchangerate-api.com (discreto, que encaje con el diseño, con rel="noopener noreferrer" y target="_blank"). Añade su test (CA39). Después ejecuta npm run format para corregir los avisos de Prettier en CustomerForm.vue y CustomersViewCreate.spec.ts. No cambies nada más ni añadas dependencias, y no hagas commits. Comprueba con cd frontend && npm run type-check && npm run lint && npm run test:unit -- --run y dime los archivos tocados y el resultado.
```

---

## 20. README

**Fase:** Entrega

**Qué buscaba.** Pedir un README exacto, leyendo el repositorio real y comprobando cada comando, sin arrancar servidores.

**Resultado.** Después lo verifiqué desde un clon limpio: 555 tests de backend y 248 de frontend pasando, y build sin errores.

```text
Crea el README.md en la raíz del proyecto, en español, leyendo el repositorio real para que todo lo que escribas sea exacto (backend/requirements.txt, backend/app/config.py y main.py, frontend/package.json y .env.example, CLAUDE.md, las specs y los ADR). No inventes comandos: comprueba cada uno en los archivos. No arranques servidores. Debe tener, en este orden:
1. Qué es SaaS-O-Matic (dos o tres frases) y qué hace: alta y búsqueda de clientes, simulador de precio mensual con tramos, IVA por país y divisas EUR, USD y GBP, e historial de simulaciones.
2. Stack (backend y frontend) con las versiones mínimas del ADR 001.
3. Estructura de carpetas (solo el primer nivel y las carpetas principales de backend/app y frontend/src, con una línea cada una).
4. Cómo ponerlo en marcha en Windows: requisitos (Python 3.12 o superior, Node de la versión de package.json), backend (crear el entorno virtual, instalar requirements.txt, arrancar uvicorn) y frontend (instalar, copiar .env.example a .env, arrancar), con las direcciones por defecto y dónde se guarda la base de datos SQLite. Menciona que en PowerShell hay que usar npm.cmd si los scripts están bloqueados.
5. Cómo ejecutar los tests y el lint de cada parte, con los comandos de CLAUDE.md.
6. Resumen de la API: un endpoint por línea con una frase (POST /customers, GET /customers?q=, GET /customers/{id}, POST /simulations/preview, POST /simulations, GET /customers/{id}/simulations), y que FastAPI documenta la API en /docs si es cierto en main.py.
7. Reglas de negocio en cinco líneas, remitiendo a la skill reglas-negocio y a los ADR en lugar de copiar tablas.
8. Cómo se ha construido con IA: enlace a ai-workspace/ (specs, ADR, auditorías, bitácora) y al CLAUDE.md, y el flujo spec, implementación, auditoría.
9. Limitaciones conocidas y decisiones de simplificación: lista corta (solo tipo general de IVA, cinco países, sin autenticación, sin paginación, SQLite, tipos de cambio de open.er-api.com con atribución).
Que quede claro y breve, sin relleno. No hagas commits. Al terminar dime qué comandos has usado y de dónde los has sacado.
```
