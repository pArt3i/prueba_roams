---
name: validacion-nif
description: Algoritmos de validación de DNI, NIE y CIF españoles con casos de prueba. Úsala al implementar o probar el alta de clientes de España o cualquier validación de identificador fiscal.
---
# Validación de identificadores fiscales españoles

Se aplica solo si el país del cliente es ES. Para otros países solo se comprueba que el identificador no esté vacío y tenga un formato razonable (propuesta, ver ADR).
Los casos de prueba están en `casos.md`, en esta misma carpeta.

## Normalización (siempre antes de validar)

Quitar espacios, guiones y puntos, y pasar a mayúsculas. Guardar el valor normalizado. Dos clientes con el mismo identificador normalizado son duplicados.

## DNI

Formato `^\d{8}[A-Z]$`. La letra correcta es `"TRWAGMYFPDXBNJZSQVHLCKE"[número % 23]`.

## NIE

Formato `^[XYZ]\d{7}[A-Z]$`. Se sustituye la primera letra (X por 0, Y por 1, Z por 2), se forma un número de 8 dígitos y se aplica el mismo cálculo que en el DNI.

## CIF

Formato `^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$`: letra de tipo, 7 dígitos y carácter de control.

1. Sean d1 a d7 los 7 dígitos.
2. A = d2 + d4 + d6.
3. B = suma de las cifras de 2×d1, 2×d3, 2×d5 y 2×d7 (si el doble tiene dos cifras, se suman sus cifras).
4. Dígito de control = (10 − ((A + B) mod 10)) mod 10.
5. Letra de control equivalente = `"JABCDEFGHI"[dígito]`.
6. El último carácter debe ser: el dígito si el tipo es A, B, E o H; la letra si el tipo es N, P, Q, R, S o W; cualquiera de los dos si el tipo es C, D, F, G, J, U o V.

No se contemplan los NIF especiales que empiezan por K, L o M.
