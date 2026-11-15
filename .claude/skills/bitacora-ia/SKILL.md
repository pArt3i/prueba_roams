---
name: bitacora-ia
description: Añade una entrada a la bitácora de trabajo con IA en ai-workspace/03-proceso/bitacora.md. Úsala cuando Pablo cierre una funcionalidad y escriba /bitacora-ia.
---
# Entrada de bitácora

La bitácora es evidencia de cómo trabaja Pablo con la IA. Tiene que ser verdad: no inventes correcciones.

1. Reúne los datos objetivos: `git diff --stat`, la spec de la funcionalidad y el último informe del auditor en `ai-workspace/03-proceso/auditorias/`.
2. Pregunta a Pablo, en un solo mensaje: qué pidió, qué le pareció mal o qué cambió él del resultado, y por qué.
3. Escribe la entrada con sus palabras, en primera persona. Puedes corregir ortografía, no el contenido.
4. Si Pablo no corrigió nada, escribe «Sin correcciones» y por qué aceptó el resultado. No rellenes con correcciones inventadas.
5. Añádela al final de `ai-workspace/03-proceso/bitacora.md` con la plantilla de abajo. No toques las entradas anteriores.

## Plantilla

```markdown
## NNN · Funcionalidad (AAAA-MM-DD)
- Spec: enlace a la spec en 01-specs
- Qué pedí: ...
- Qué propuso la IA: ...
- Qué detecté y corregí: ...
- Por qué: ...
- Resultado: tests y veredicto del auditor, con enlace al informe
```
