# ADR 004 · Almacenamiento y llamadas a la API: se guardan, no afectan al precio
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
Cada simulación recoge, además de usuarios y país, el almacenamiento en GB y las llamadas a la API. La skill [`reglas-negocio`](../../.claude/skills/reglas-negocio/SKILL.md) dice que son enteros mayores o iguales que 0, que se guardan con la simulación y que no cambian el precio. Yo ya había decidido que se persisten sin afectar al precio; este ADR lo registra.

## Opciones consideradas
1. **Guardarlos como columnas enteras de la simulación (`storage_gb`, `api_calls`), sin intervenir en el cálculo.**
   - Pros: cumple lo decidido; el historial es completo; no toca la fórmula.
   - Contras: el comercial puede esperar que cambien el precio; la interfaz debe dejar claro que son informativos.
2. **Hacerlos parte del precio (tarifa por GB o por llamada).**
   - Pros: modelo más realista.
   - Contras: no hay tarifa definida en `reglas-negocio`; inventarla va contra `CLAUDE.md`.
3. **No guardarlos.**
   - Pros: modelo más pequeño.
   - Contras: contradice la decisión tomada.

## Decisión
Decidido: opción 1. Los dos campos son enteros >= 0, se guardan en la simulación y se devuelven en el historial. Ni el cálculo ni `POST /simulations/preview` los usan para el importe (`preview` ni siquiera los recibe).

Cotas y obligatoriedad (decisión mía, [spec 002](../01-specs/002-precio-y-simulaciones.md)): `storage_gb` entre 0 y 1 000 000 y `api_calls` entre 0 y 1 000 000 000; los usuarios, entre 1 y 10 000. Los dos campos son obligatorios en `POST /simulations` y no tienen valor por defecto: ausentes, 422. Solo se aceptan enteros JSON (se rechazan `"10"`, `10.0`, `true` y `null`). Con estas cotas todo cabe en el entero de SQLite.

## Consecuencias
- Mejora: la fórmula de precio queda estable; el historial conserva el contexto de cada simulación.
- Se complica: hay que testear que variar estos campos no altera subtotal, IVA ni total, y sus cotas (máximo válido y máximo más uno).
- Si el negocio añade una tarifa por uso, será un ADR nuevo y un cambio de la skill.

## Preguntas abiertas
- ~~Cotas superiores de `storage_gb`, `api_calls` y usuarios.~~ Resuelta por mí: 1 000 000, 1 000 000 000 y 10 000.
- ~~¿Obligatorios en `POST /simulations` o 0 por defecto?~~ Resuelta por mí: obligatorios, sin valor por defecto.
- ~~¿Las llamadas a la API son por mes?~~ Cerrada: sin unidad definida en la skill; informativo, no afecta a nada.
