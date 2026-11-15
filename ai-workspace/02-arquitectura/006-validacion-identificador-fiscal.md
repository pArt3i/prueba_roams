# ADR 006 · Validación del identificador fiscal (NIF, NIE y CIF)
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
El alta de clientes pide un identificador fiscal. Los algoritmos de DNI, NIE y CIF, la normalización y los casos de prueba están en la skill [`validacion-nif`](../../.claude/skills/validacion-nif/SKILL.md) y en [`casos.md`](../../.claude/skills/validacion-nif/casos.md). Este ADR no los repite: decide cuándo se aplican. La skill indica que solo se validan algoritmos para país ES y que para el resto basta comprobar que no esté vacío y tenga un «formato razonable», pendiente de este ADR.

## Opciones consideradas
1. **Validación completa solo para ES; para otros países, obligatorio y con formato genérico.**
   - Pros: sigue la skill; no inventa algoritmos de países cuya regla no tenemos.
   - Contras: un identificador extranjero erróneo pasa si cumple el formato genérico.
2. **Validar los cinco países de la tabla de IVA con sus propios algoritmos.**
   - Pros: datos más fiables.
   - Contras: no hay reglas ni casos de prueba para PT, FR, DE e IT; supone inventarlas.
3. **Sin validación, solo obligatorio.**
   - Pros: trivial.
   - Contras: pierde el valor del alta controlada y la detección fiable de duplicados.

## Decisión
Decidido: opción 1.
- Se normaliza siempre antes de validar y se guarda el valor normalizado (según la skill). La normalización se aplica también a los países no ES.
- Separadores (decisión de Pablo): al normalizar se eliminan los guiones, los puntos y cualquier espacio Unicode, no solo U+0020 (U+00A0, por ejemplo, es un separador). Lo mismo vale para `q` en la búsqueda ([spec 001](../01-specs/001-clientes.md), R7).
- País ES: DNI, NIE o CIF según la skill y sus casos.
- Otros países: formato genérico. Primero se mira el valor ya sin separadores y antes de pasar a mayúsculas: si contiene cualquier carácter no ASCII, 422 «Identificador fiscal no válido.» (decisión de Pablo). Así `ß`, `ı` o `ﬁ` no llegan a convertirse en ASCII al pasar a mayúsculas (`SS`, `I`, `FI`). Después, en mayúsculas, entre 5 y 20 caracteres y solo A–Z y 0–9; vacío, más corto, más largo o con cualquier otro carácter (símbolos, `Ñ`, acentos) devuelve 422.
- La unicidad es solo por identificador normalizado, sin país ([ADR 008](008-duplicados-409.md)).
- Se implementa como servicio puro en `app/services/`, sin FastAPI ni base de datos (ver `convenciones-backend`).
- Un identificador inválido devuelve 422; un duplicado, 409 ([ADR 008](008-duplicados-409.md)).
- En el alta, `tax_id` se valida el último, porque su regla depende del país ([spec 001](../01-specs/001-clientes.md), R15).

## Consecuencias
- Mejora: reglas en un solo sitio (la skill) y servicio fácil de probar con la tabla de `casos.md`.
- Mejora: al guardar solo ASCII, la unicidad y la búsqueda por identificador no dependen de tildes ni de variantes Unicode. Por eso la búsqueda por identificador solo se aplica si `q`, sin separadores, es ASCII; si no, se busca solo por nombre (spec 001, R7).
- Se complica: para países distintos de ES la validación es débil, y un identificador extranjero con letras no ASCII se rechaza aunque sea legítimo en su país.
- La comprobación de no ASCII se hace tras quitar los separadores y antes de pasar a mayúsculas. Un test debe cubrir `ß`, `ı` y `ﬁ`, y otro un identificador con U+00A0 entre caracteres ASCII (válido) y con U+00A0 junto a un carácter no ASCII (inválido).
- No se contemplan los NIF especiales que empiezan por K, L o M (la skill los excluye).

## Preguntas abiertas
- ~~La skill `validacion-nif` dice «quitar espacios» sin precisar y `casos.md` no tiene un caso con U+00A0.~~ Resuelta: la skill ya está alineada con los separadores y `casos.md` incluye el caso con U+00A0. No queda ninguna pregunta abierta.
