# Casos de prueba de identificadores fiscales

Todos son para clientes de España y se normalizan antes de validar.

| Identificador | ¿Válido? | Motivo |
| --- | --- | --- |
| 12345678Z | Sí | DNI correcto |
| 00000000T | Sí | DNI correcto, número 0 |
| 12345678z | Sí | Minúscula, se normaliza |
| 12.345.678-Z | Sí | Puntos y guion, se normalizan |
| 1234[U+00A0]5678Z | Sí | `[U+00A0]` representa el carácter real U+00A0 (espacio no separable), no el texto: el test debe construirlo. Es un espacio en blanco y se quita al normalizar |
| X1234567L | Sí | NIE con X |
| Y1234567X | Sí | NIE con Y |
| Z1234567R | Sí | NIE con Z |
| A58818501 | Sí | CIF tipo A, control dígito 1 |
| B12345674 | Sí | CIF tipo B, control dígito 4 |
| P2812345C | Sí | CIF tipo P, control letra C |
| C12345674 | Sí | CIF tipo C acepta dígito |
| C1234567D | Sí | CIF tipo C acepta letra |
| 12345678A | No | Letra de DNI incorrecta, debía ser Z |
| 1234567Z | No | Solo 7 dígitos |
| 123456789 | No | Sin letra |
| X1234567A | No | Letra de NIE incorrecta, debía ser L |
| B12345675 | No | Dígito de control de CIF incorrecto |
| B1234567D | No | El tipo B exige dígito, no letra |
| P28123453 | No | El tipo P exige letra, no dígito |
| I12345674 | No | La letra de tipo I no existe |
| ABCDEFGHI | No | Formato inválido |
| ١٢٣٤٥٦٧٨Z | No | Dígitos árabe-índicos (Unicode, no ASCII) en lugar de 12345678; el formato exige `[0-9]` |
| P1111111ı | No | La última letra es `ı` (U+0131, i sin punto), no ASCII: el test debe construirla. En mayúsculas sería `P1111111I`, un CIF válido, pero se rechaza antes de pasar a mayúsculas |
| (vacío) | No | Obligatorio para clientes de España |
