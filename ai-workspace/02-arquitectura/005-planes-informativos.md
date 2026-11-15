# ADR 005 · Planes informativos
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
La skill [`reglas-negocio`](../../.claude/skills/reglas-negocio/SKILL.md) define tres planes (`starter`, `business`, `enterprise`) y dice que son informativos y no cambian el precio. Falta decidir qué papel tienen en el modelo de datos.

## Opciones consideradas
1. **Plan como campo informativo de la simulación, validado contra la lista de tres valores.**
   - Pros: refleja lo que el comercial presenta al cliente; no toca el precio; el historial muestra qué plan se simuló.
   - Contras: el plan no afecta al importe, algo que puede confundir en la interfaz.
2. **Plan como atributo del cliente.**
   - Pros: un cliente tiene un plan contratado; se valida en un solo sitio (el alta de clientes).
   - Contras: la skill no dice a qué entidad pertenece el plan; no permite comparar planes en simulaciones distintas.
3. **Plan que modifica tramos o precios.**
   - Pros: modelo más realista.
   - Contras: contradice la skill; no hay datos de precios por plan.

## Decisión
Decidido: opción 2 (decisión de Pablo). El plan es un atributo del cliente ([spec 001](../01-specs/001-clientes.md), R11): obligatorio y restringido a `starter`, `business` o `enterprise` (cualquier otro devuelve 422). Es informativo y nunca entra en el cálculo. Las simulaciones no tienen plan: `POST /simulations` no lo acepta (si llega, se ignora como cualquier campo desconocido) y ni su respuesta ni el historial lo devuelven.

Textos en español para la interfaz (decisión de Pablo, 2026-11-15). La API sigue usando el valor en minúsculas; el frontend lo traduce al mostrarlo:

| Valor de la API | Texto en la interfaz |
| --- | --- |
| `starter` | Starter |
| `business` | Business |
| `enterprise` | Enterprise |

## Consecuencias
- Mejora: precio independiente del plan, con tests simples; el plan se valida solo en el alta de clientes.
- Se complica: no se pueden comparar planes en simulaciones distintas de un mismo cliente, y el historial no dice qué plan tenía el cliente al simular. La interfaz debe indicar que el plan es informativo para no sugerir un descuento que no existe.
- Cambiar los planes (nombres o cantidad) exige tocar la skill, la validación del cliente y la tabla de textos de esta decisión.

## Preguntas abiertas
- ~~¿El plan es obligatorio en la simulación o tiene un valor por defecto?~~ Sin objeto: la simulación no tiene plan; en el cliente es obligatorio (spec 001).
- ~~¿El plan pertenece a la simulación o al cliente?~~ Resuelta por Pablo: al cliente.
- ~~Textos visibles en español de cada plan (`starter`, `business`, `enterprise`).~~ Resuelta por Pablo: Starter, Business y Enterprise (tabla de la Decisión).
