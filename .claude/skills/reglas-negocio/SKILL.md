---
name: reglas-negocio
description: Reglas de precios de SaaS-O-Matic (tramos acumulativos por usuario, IVA por país, planes, divisas y redondeo). Úsala siempre que se calcule, valide, documente o pruebe un precio, una simulación o una factura.
---
# Reglas de negocio de SaaS-O-Matic

Fuente única de verdad. Si una spec o el código la contradicen, gana esta skill, salvo que Pablo la cambie.
Lo marcado **(propuesta)** no viene en el enunciado de la prueba: es una decisión de Pablo y necesita su ADR.

## Tramos acumulativos (precio por usuario y mes, sin IVA)

| Usuarios | Precio por usuario |
| --- | --- |
| 1 a 10 | 10 € |
| 11 a 50 | 8 € |
| 51 o más | 5 € |

Cada usuario paga el precio de su propio tramo, no todos al precio del último.

Subtotal = 10 × min(n, 10) + 8 × max(0, min(n, 50) − 10) + 5 × max(0, n − 50)

## Ejemplos resueltos (sin IVA)

| Usuarios | Subtotal |
| --- | --- |
| 1 | 10 € |
| 10 | 100 € |
| 11 | 108 € |
| 50 | 420 € |
| 51 | 425 € |
| 60 | 470 € |
| 100 | 670 € |

## IVA (propuesta)

Tipos por país en `iva.md`. IVA = subtotal × tipo del país, redondeado a 2 decimales con ROUND_HALF_UP. Total = subtotal + IVA.

| Usuarios | País | Subtotal | IVA | Total |
| --- | --- | --- | --- | --- |
| 60 | ES (21 %) | 470,00 € | 98,70 € | 568,70 € |
| 11 | DE (19 %) | 108,00 € | 20,52 € | 128,52 € |
| 10 | PT (23 %) | 100,00 € | 23,00 € | 123,00 € |

## Entradas y validaciones (propuesta)

- Usuarios: entero mayor o igual que 1. Si no, error 422.
- Almacenamiento (GB) y llamadas a la API: enteros mayores o iguales que 0. Se guardan con la simulación pero no cambian el precio.
- País fuera de la tabla de `iva.md`: error 422.
- Plan: `starter`, `business` o `enterprise`. Es informativo y no cambia el precio.

## Divisas (propuesta)

- Los precios y lo guardado en base de datos están siempre en EUR.
- Se puede mostrar en EUR, USD y GBP con un tipo de cambio de una API pública. Importe convertido = importe en EUR × tipo, a 2 decimales.
- Si la API de tipos falla o tarda, se muestra en EUR con un aviso visible.

## Dinero

- Cálculo con `Decimal`, nunca `float`.
- Redondeo solo donde se indica arriba (IVA y conversión de divisa).
