# ADR 007 · Divisas con open.er-api.com y respaldo en EUR
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
La skill [`reglas-negocio`](../../.claude/skills/reglas-negocio/SKILL.md) fija que los precios y la base de datos están siempre en EUR; que se puede mostrar en EUR, USD y GBP con un tipo de cambio de una API pública (importe en EUR × tipo, a 2 decimales); y que si la API falla o tarda se muestra en EUR con un aviso visible. Pablo ha elegido `open.er-api.com` como API. `convenciones-frontend` dice que el frontend pide el tipo una vez y lo guarda en memoria. Había que decidir quién la llama y dónde se convierte.

## Opciones consideradas
1. **El frontend llama a `open.er-api.com`, guarda los tipos en memoria y convierte para mostrar.**
   - Pros: es lo que describe `convenciones-frontend`; el backend sigue sin depender de red externa; los tests de backend no necesitan simular la API.
   - Contras: aritmética de dinero en el frontend (JavaScript sin `Decimal`), en tensión con «el frontend solo muestra»; el redondeo puede diferir del de Python.
2. **El backend llama a la API, guarda en caché y expone el importe convertido.**
   - Pros: todo el dinero se calcula con `Decimal` en un único sitio; coherente con el [ADR 002](002-calculo-precio-backend.md).
   - Contras: dependencia externa y caché en el backend; endpoint nuevo; contradice la ubicación que sugieren las convenciones del frontend.

## Decisión
Opción 1 (decisión de Pablo, 2026-11-15). La conversión se hace en el frontend y es solo presentación: el precio en EUR sigue calculándolo el backend (ADR 002). En concreto:
- Lo guardado y lo calculado por el backend sigue siendo siempre EUR. El historial se muestra en EUR y no se convierte.
- Divisas admitidas: EUR (por defecto), USD y GBP.
- API y formato esperado (decisión de Pablo): `GET https://open.er-api.com/v6/latest/EUR`; la respuesta trae `result` con el valor `"success"` y los tipos en `rates.USD` y `rates.GBP` (unidades de cada divisa por 1 EUR). Una sola petición devuelve USD y GBP. Este formato debe verificarse con una llamada real al implementar; no se ha comprobado desde aquí.
- El tipo se pide una sola vez, la primera vez que se elige USD o GBP, y se guarda en memoria mientras no se recargue la página, también al volver a la lista y abrir otro cliente (spec 004, R12). Un fallo no se guarda.
- Tiempo de espera: si la petición no responde en 5 segundos o falla, se muestran los importes en EUR con un aviso visible y la pantalla no se rompe.
- Respuesta inválida (decisión de Pablo, 2026-11-15): cuenta como fallo de la API si `result` no es `"success"` o si `rates.USD` o `rates.GBP` es inválido (ausente, no numérico, menor o igual que 0, o con «e» en su texto, ver «Lectura del tipo»). Basta con que uno de los dos tipos sea inválido para que toda la respuesta sea un fallo, aunque el tipo de la divisa elegida sea válido; no se guarda nada (spec 004, R13).
- Reintento: el aviso lleva un botón «Reintentar» que vuelve a pedir el tipo. No hay reintento automático.
- Convertir por partes y sumar: subtotal e IVA se convierten por separado (importe en EUR × tipo, a 2 decimales con ROUND_HALF_UP) y el total mostrado es subtotal convertido + IVA convertido. El total no se convierte aparte, así el desglose siempre cuadra. Puede diferir en 0,01 de (total en EUR × tipo); es lo esperado.
- Aritmética: sin coma flotante en los importes. Se usan enteros en céntimos (por ejemplo con `BigInt`) o una librería decimal. Una librería nueva es una dependencia nueva y requiere avisar a Pablo antes de añadirla (`CLAUDE.md`). La función es `convertAmount`, en `src/utils/currency.ts` (spec 004, R15).
- Lectura del tipo (decisión de Pablo, 2026-11-15): `JSON.parse` entrega `rates.USD` y `rates.GBP` como `number`, y el texto decimal que usa la conversión es `String(n)` de ese número, sin multiplicar nunca en coma flotante. Por ejemplo, `1.0829` da `"1.0829"` y `1.005` da `"1.005"`. Si el texto resultante contiene «e» (notación científica, por ejemplo `1e-7`), el tipo se trata como inválido. Se prueba con tests que incluyen 1.0829 y 1.005 (spec 004, R15, CA34 y CA35).
- Formato (decisión de Pablo): los importes de la API siguen siendo texto con dos decimales (`"470.00"`, [ADR 003](003-iva-por-pais.md) y [ADR 002](002-calculo-precio-backend.md)); en pantalla se formatean con `Intl.NumberFormat` en `es-ES`. USD y GBP se tratan igual que EUR, sin números de coma flotante.

## Consecuencias
- Mejora: el cálculo del precio no depende de la API de divisas; la conversión falla de forma aislada y deja el EUR.
- Se complica: hay aritmética de dinero en el frontend. Se limita a una función de conversión pura (`convertAmount`), con tests de redondeo y de «total = suma» (spec 004).
- Tensión con `CLAUDE.md` («el frontend solo muestra el precio»): se resuelve entendiendo la conversión como presentación de un precio ya calculado. La revisión «sin fórmulas de tramos ni IVA» (spec 003, R14 y CA24; spec 004, R18 y CA37) debe permitir esa función y nada más. `CLAUDE.md` ya se ajustó.
- Lectura del tipo con `String(n)`: es simple y no añade dependencias. Para tipos con pocas cifras decimales devuelve el mismo texto que el JSON de la API, pero no recupera cifras que el `number` ya haya perdido (más allá de unas 15 a 17 cifras significativas). Un número menor que 0,000001 o a partir de 1e21 sale en notación científica y se rechaza como inválido; no afecta a tipos reales de USD o GBP. Los tests con tipos reales de la API siguen siendo necesarios al implementar.
- Opciones descartadas por Pablo para leer el tipo:
  - `response.text()` con extracción del texto de `rates.USD` y `rates.GBP` (por ejemplo con una expresión regular) antes o en vez de `JSON.parse`: parseo manual y frágil, y duplica la lectura y la validación de la respuesta.
  - Un `reviver` de `JSON.parse` que reciba el texto original del número: depende de un soporte del navegador que no se ha comprobado y puede variar entre navegadores.
- Los términos de uso de `open.er-api.com` (límites, atribución) no se han revisado.

## Preguntas abiertas
- ~~Dónde se convierte.~~ Resuelta por Pablo: en el frontend (opción 1).
- ~~Tiempo máximo de espera.~~ Resuelta por Pablo: 5 segundos.
- ~~¿Se convierten por separado subtotal, IVA y total?~~ Resuelta por Pablo: subtotal e IVA por separado; el total es la suma de ambos convertidos.
- ~~¿Se reintenta la consulta tras un fallo?~~ Resuelta por Pablo: sí, con un botón «Reintentar» (sin reintento automático).
- ~~URL exacta del endpoint y formato de respuesta de `open.er-api.com`.~~ Resuelta por Pablo: `https://open.er-api.com/v6/latest/EUR`, tipos en `rates.USD` y `rates.GBP`, con `result` `"success"`. Queda por verificar con una llamada real al implementar.
- ~~Qué hacer si solo uno de los dos tipos es inválido o si `result` no es `"success"`.~~ Resuelta por Pablo (2026-11-15): toda la respuesta cuenta como fallo y no se guarda nada.
- ~~Cómo leer el tipo sin pasar por coma flotante.~~ Resuelta por Pablo (2026-11-15): `String(n)` del número leído, con tests; si el texto contiene «e», el tipo es inválido; se descartan `response.text()` y `reviver`.
