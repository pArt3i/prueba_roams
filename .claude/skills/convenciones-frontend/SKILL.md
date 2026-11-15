---
name: convenciones-frontend
description: Convenciones del frontend de SaaS-O-Matic (Vue 3 con script setup, TypeScript, estados de carga y error, slider con espera, divisas y diseño responsive). Úsala siempre que escribas o revises código Vue o TypeScript en frontend/.
---
# Convenciones del frontend

## Estructura

- `src/components/`: componentes pequeños y reutilizables.
- `src/composables/`: lógica reutilizable con `ref` y `computed` (por ejemplo `useCustomers.ts`, `usePricing.ts`).
- `src/services/`: llamadas HTTP al backend y a la API de divisas, sin lógica de interfaz.
- `src/views/`: pantallas.
- `src/types/`: interfaces TypeScript que reflejan los schemas del backend.

## Reglas

- Vue 3 con `<script setup lang="ts">` y Composition API. Sin `any`.
- No hay router ni Pinia instalados. El estado compartido va en composables. No añadas librerías sin avisar a Pablo.
- Toda pantalla que carga datos cubre cuatro estados: cargando, error, vacío y con datos.
- La URL del backend sale de `import.meta.env.VITE_API_URL`, con valor por defecto `http://localhost:8000`.
- El precio lo calcula el backend (ver `reglas-negocio`). El frontend solo lo muestra y no duplica la fórmula.
- Máximo 200 líneas por archivo. Textos de interfaz en español.

## Slider de usuarios

- Espera de 300 ms tras el último movimiento antes de pedir el cálculo.
- Una respuesta lenta no debe pisar a una más reciente: cancela la petición anterior con `AbortController` o ignora las respuestas antiguas.
- Muestra un indicador de carga sin que el importe anterior desaparezca.
- Label asociado y `aria-label` en el slider.

## Divisas

- Pide el tipo de cambio una vez y guárdalo en memoria.
- Si la API falla o tarda, muestra el importe en EUR con un aviso visible. La pantalla nunca se rompe.
- Formatea con `Intl.NumberFormat`.

## Diseño

- Primero móvil. Comprueba 375 px de ancho y escritorio. Tarjetas con CSS grid.
- Contraste suficiente y foco visible en los elementos interactivos.
- Si el plugin `frontend-design` está instalado, aplícalo para que la interfaz no parezca genérica.

## Tests

- Vitest y `@vue/test-utils`. Se prueban los composables y los componentes con lógica.
- Ejecuta con `npm run test:unit -- --run` (una pasada, sin modo watch).
