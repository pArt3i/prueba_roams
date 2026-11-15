# ADR 003 · Tabla de IVA por país y simplificaciones
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
El precio lleva IVA según el país del cliente. La skill [`reglas-negocio`](../../.claude/skills/reglas-negocio/SKILL.md) marca el IVA como propuesta que necesita ADR, y los tipos están en [`iva.md`](../../.claude/skills/reglas-negocio/iva.md) (ES, PT, FR, DE, IT). Este ADR no repite la tabla para no duplicarla.

Fuentes de los tipos, aportadas por Pablo:
- [Comisión Europea, tipos de IVA](https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/vat-rates_en): marco legal y acceso a la base de datos TEDB. La página no lista las cifras.
- [Eurofiscalis, tipos de IVA en la UE](https://www.eurofiscalis.com/en/vat-rates-in-ue/): fuente secundaria que confirma ES 21 %, PT 23 %, FR 20 %, DE 19 % e IT 22 %, tipos vigentes a 28 de septiembre de 2026.

## Opciones consideradas
1. **Tabla fija en el código (una constante en `app/services/`), con los países de `iva.md`.**
   - Pros: sencilla, probada con tests, sin migraciones; un país nuevo es un cambio de código revisado.
   - Contras: cambiar un tipo exige desplegar.
2. **Tabla en base de datos, editable.**
   - Pros: se puede cambiar sin desplegar.
   - Contras: añade pantallas o scripts de mantenimiento y riesgo de datos inconsistentes; no hay requisito de editarla.
3. **Consultar un servicio externo de tipos de IVA.**
   - Pros: siempre al día.
   - Contras: dependencia externa para un dato que cambia pocas veces; no hay un servicio concreto elegido.

## Decisión
Decidido: opción 1. Se aplica el IVA del país del cliente. El código de país se acepta sin distinguir mayúsculas: `es` se acepta y se guarda `ES`. Un país fuera de la tabla devuelve 422 (decisión ya tomada); ese 422 se aplica tras normalizar a mayúsculas, es decir, `es` es válido y `xx` no. Un país con algún carácter no ASCII (`eſ`, con `ſ` U+017F, o `ıt`, con `ı` U+0131) nunca se convierte en un código de la tabla, aunque en mayúsculas lo pareciera (`ES` e `IT`): queda fuera y da 422 «País no admitido.» (ver spec 001, R1, y spec 002, R4).

Alcance de países (decisión de Pablo): la tabla se queda en ES, PT, FR, DE e IT. `AT`, `NL`, `BE` y cualquier otro país quedan fuera; ampliarla es un cambio de código y de `iva.md`.

Cada simulación guarda, en el momento de calcular, el tipo de IVA aplicado y el subtotal, el IVA y el total en céntimos (decisión de Pablo). El historial no cambia aunque la tabla de tipos cambie después, y nada se recalcula al leer.

Formato (decisión de Pablo):
- Importes: en la API, texto con dos decimales (p. ej. `"470.00"`); internamente, céntimos enteros.
- Tipo de IVA: texto (p. ej. `"0.21"` para el 21 %), nunca `float`; se guarda y se devuelve así. `iva.md` lo escribe en porcentaje; la conversión es solo de presentación.

Simplificaciones asumidas (las de `iva.md`): solo tipo general; sin tipos reducidos, exenciones ni inversión del sujeto pasivo en ventas B2B dentro de la UE.

## Consecuencias
- Mejora: cálculo determinista y fácil de probar; los tipos de `iva.md` tienen ya una fuente enlazada.
- Mejora: el historial es estable frente a cambios futuros de tipos.
- Mejora: texto decimal en el tipo y en los importes de la API evita pasar por `float` en ningún punto.
- Se complica: ampliar países o cambiar tipos requiere cambio de código y de la tabla de la skill, y volver a contrastar con las fuentes.
- Se complica: cada fila de simulación necesita columnas para el tipo de IVA (texto) y para subtotal, IVA y total en céntimos (entero); la spec 002 debe reflejarlo, y hay que convertir céntimos a texto con dos decimales al devolverlos.
- La fuente que da las cifras es secundaria; la oficial (TEDB) es la que haría fe si hubiera discrepancia.
- Observación para los tests: con subtotales en euros enteros y tipos en porcentajes enteros, el IVA siempre sale exacto a 2 decimales. El `ROUND_HALF_UP` de la skill no se ejercita con los tipos actuales, solo con la conversión de divisa. Conviene un test unitario del redondeo con un valor forzado.

## Preguntas abiertas
- ~~Formato y snapshot del IVA guardado: alinear la [spec 002](../01-specs/002-precio-y-simulaciones.md) y el [ADR 002](002-calculo-precio-backend.md).~~ Resuelta: la spec 002 y el ADR 002 ya están alineados (tipo en texto decimal, importes en céntimos y devueltos con dos decimales, snapshot de país, tipo, subtotal, IVA y total).
- Se cerraron antes el formato del tipo de IVA y de los importes, y el alcance de países (AT, NL y BE fuera). No queda ninguna pregunta abierta.
