---
name: adr
description: Redacta una decisión de arquitectura (ADR) de SaaS-O-Matic en ai-workspace/02-arquitectura con la plantilla del proyecto. Úsala cuando Pablo pida un ADR con /adr seguido del tema, o para cerrar una decisión pendiente.
---
# Redactar un ADR

El tema es lo que Pablo escribió después del nombre de la skill.

1. Lee `CLAUDE.md`, `reglas-negocio` y los ADR existentes para no contradecirlos.
2. Elige el siguiente número libre y crea `ai-workspace/02-arquitectura/NNN-tema-en-minusculas.md`.
3. Rellena la plantilla. Un ADR cabe en una pantalla: sin relleno.
4. Presenta las opciones con sus pros y contras. La decisión la toma Pablo: escribe tu recomendación en «Decisión» como propuesta y deja `Estado: Propuesta`. Solo Pablo lo pasa a `Aceptada`.
5. No inventes datos externos. Si un dato necesita fuente (tipos de IVA, por ejemplo), pide a Pablo que la aporte y enlázala.

## Plantilla

```markdown
# ADR NNN · Título
Estado: Propuesta
Fecha: AAAA-MM-DD

## Contexto
Qué problema hay y qué lo condiciona.

## Opciones consideradas
1. Opción A: pros y contras.
2. Opción B: pros y contras.

## Decisión
La opción elegida y la razón en una o dos frases.

## Consecuencias
Qué mejora, qué se complica y qué queda pendiente.
```
