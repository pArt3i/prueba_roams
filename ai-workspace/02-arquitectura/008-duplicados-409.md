# ADR 008 · Clientes duplicados: 409
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
No debe haber dos clientes con el mismo identificador fiscal. La skill [`validacion-nif`](../../.claude/skills/validacion-nif/SKILL.md) dice que dos clientes con el mismo identificador normalizado son duplicados. Yo ya había decidido que el duplicado devuelve 409. `convenciones-backend` reserva 409 para duplicados.

## Opciones consideradas
1. **Comprobar en el servicio antes de insertar y, además, restricción `UNIQUE` en la columna normalizada.**
   - Pros: mensaje claro en el caso normal; la base de datos garantiza la unicidad incluso con dos peticiones simultáneas.
   - Contras: dos mecanismos; hay que traducir `IntegrityError` a 409.
2. **Solo comprobación en el servicio.**
   - Pros: sencilla.
   - Contras: una carrera entre dos altas puede crear duplicados.
3. **Solo restricción `UNIQUE` y traducir el error de la base de datos.**
   - Pros: un único mecanismo robusto.
   - Contras: depende del mensaje de la base de datos para distinguir el error.

## Decisión
Decidido: opción 1. El duplicado se detecta por identificador fiscal normalizado (el mismo valor que se guarda, ver [ADR 006](006-validacion-identificador-fiscal.md)). `POST /customers` devuelve 409 con un mensaje en español y no crea nada. Dos formatos del mismo identificador (`12345678Z` y `12.345.678-z`) son el mismo cliente.
- La unicidad es global, sin país: el mismo identificador normalizado con países distintos es un duplicado, y la restricción `UNIQUE` va solo sobre esa columna.
- Solo `tax_id` genera 409; ni el nombre ni el email.
- El 409 no incluye el `id` del cliente existente. El cuerpo es `{"detail": "Ya existe un cliente con ese identificador fiscal."}`.
- En la carrera, el 409 se detecta por el error de la restricción `UNIQUE` de `tax_id` que lanza SQLite. Cualquier otro `IntegrityError` (otra restricción) no es un duplicado: es un error interno (500), no un 409.

## Consecuencias
- Mejora: los duplicados son imposibles, también con concurrencia.
- Se complica: el test debe cubrir duplicado exacto, duplicado con otro formato, duplicado entre países distintos y el caso de carrera (restricción `UNIQUE`).
- El orden de validación importa: primero 422 (formato) y después 409 (duplicado).
- La interfaz no puede abrir el cliente existente a partir del 409, porque no recibe su `id`.
- La detección del 409 depende de cómo informa SQLite del fallo del `UNIQUE` de `tax_id`. Si se cambia de base de datos (por ejemplo a PostgreSQL, ver [ADR 001](001-stack.md)), hay que adaptar esa detección.
