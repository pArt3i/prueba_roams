# ADR 002 · El precio se calcula solo en el backend
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
El simulador muestra el precio mientras el comercial mueve un slider de usuarios. Las reglas (tramos, IVA, redondeo) están en la skill [`reglas-negocio`](../../.claude/skills/reglas-negocio/SKILL.md). `CLAUDE.md` recoge que el precio lo calcula solo el backend y que el frontend solo convierte la divisa para mostrarlo ([ADR 007](007-divisas.md)). Hace falta decidir cómo obtiene el frontend un precio sin duplicar la fórmula ni guardar nada.

## Opciones consideradas
1. **Endpoint de cálculo sin efectos, `POST /simulations/preview`, que el frontend llama mientras se mueve el slider.**
   - Pros: una sola implementación de la fórmula y del redondeo (con `Decimal`); el frontend no puede divergir; se prueba solo en el backend.
   - Contras: una petición de red por cada valor del slider (se mitiga con espera de 300 ms y cancelación, ver `convenciones-frontend`); sin red no hay precio.
2. **Fórmula duplicada en el frontend para respuesta inmediata y el backend recalcula al guardar.**
   - Pros: respuesta instantánea y sin carga de red.
   - Contras: dos implementaciones que pueden diferir; contradice `CLAUDE.md`; JavaScript no tiene `Decimal` nativo y se arriesgan errores de coma flotante.
3. **Guardar cada simulación al mover el slider y leer el precio de la respuesta.**
   - Pros: un solo endpoint.
   - Contras: llena el historial de simulaciones que el comercial no ha pedido.

## Decisión
Decidido: opción 1.
- `POST /simulations/preview` calcula y devuelve subtotal, IVA y total en EUR. No escribe en la base de datos. Recibe solo `users` y `country` (decisión mía); los demás campos se ignoran.
- `POST /simulations` guarda una simulación y recalcula el precio en el servidor. Nunca acepta importes enviados por el cliente. El país sale del cliente.
- El frontend no contiene la fórmula de tramos ni la de IVA. Los detalles de contrato están en la spec 002.
- Formato (decisión mía, [ADR 003](003-iva-por-pais.md)): en el JSON los importes van como texto con dos decimales (`"470.00"`), nunca como número; el tipo de IVA, como texto decimal (`"0.21"`); `created_at`, en ISO 8601 UTC con `Z`. En la base de datos los importes se guardan en céntimos enteros.
- Snapshot (decisión mía): cada simulación guarda país, tipo de IVA, subtotal, IVA y total en el momento de crearse. El historial devuelve lo guardado y nunca recalcula.

## Consecuencias
- Mejora: fuente única de verdad del precio; tests de la regla solo en backend.
- Mejora: el texto decimal evita pasar por `float` en ningún punto.
- Mejora: el historial no cambia si cambia después la tabla de IVA.
- Se complica: el slider depende de la red; hay que gestionar espera, cancelación y estados de carga y error (spec 004).
- Pendiente: la conversión de divisa es aritmética sobre dinero y su ubicación se decide en el [ADR 007](007-divisas.md).

## Preguntas abiertas
- ~~Formato de los importes en el JSON.~~ Resuelta por mí: texto con dos decimales (`"470.00"`), guardado en céntimos (ADR 003).
- ~~¿`preview` debe aceptar también `storage_gb`, `api_calls` y `plan`?~~ Resuelta por mí: solo `users` y `country` (spec 002).
- ~~¿`preview` recibe el `country` directamente o un `customer_id`?~~ Resuelta por mí: recibe `country` (spec 002).
