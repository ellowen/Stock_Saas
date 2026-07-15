# CHANGELOG

Generado a partir de `git log` real del repo. Formato: fecha aproximada por orden de commits (no siempre hay fecha exacta en el mensaje), agrupado por hito, más reciente primero.

## 2026-07-11 — Rediseño funcional del POS + documentación inicial

- `docs`: sincronización de documentación con el roadmap del POS completado.
- `feat`: motor de promociones automáticas (2x1, % por categoría, cupones) — `PromotionService`.
- `feat`: mobile-first real en el POS (no solo achicar el layout desktop).
- `feat`: recibo de venta por email y WhatsApp.
- `feat`: panel de pago inline reemplazando el modal flotante (`PaymentPanel`).
- `feat`: hold / resume sale (pausar una venta y retomarla, persistido server-side).
- `feat`: price override, carga inicial en paralelo (branch+inventory) y ranking de resultados de búsqueda en el POS.
- `feat`: permisos `SALES_DISCOUNT`/`SALES_PRICE_OVERRIDE` + fix de matching exacto del lector de código de barras.

## Antes del rediseño del POS

- `feat`: CORS configurable por variable de entorno (preparación para deploy).
- `fix`: favicon propio de GIRO (reemplaza el logo default de Vite).
- `docs`: cierre de verificación end-to-end de Fase 5 (Empleados/Sueldos/Contabilidad).
- `fix`: bugs encontrados durante la verificación de Fase 5.
- `chore`: actualización de dependencias — 0 vulnerabilidades en `npm audit`.
- `feat`: vista mobile en cards + selección múltiple en Clientes y Proveedores.
- `feat`: hover actions, sorting y skeletons de carga en tablas.
- `feat`: dashboard con tendencias (variación % vs. día anterior) y sorting en tablas.
- `feat`: Stripe + MercadoPago + límites por plan (Fase 7 — billing).
- `feat`: tests (Jest/Vitest), audit log, resumen de ventas por email, notificaciones push.
- `feat`: Fase 1 y Fase 2 — base genérica del proyecto, UI nueva, documentos imprimibles.

## Cómo mantener este archivo

Agregar una entrada por hito (no por commit individual) cuando se cierra un conjunto de trabajo relacionado — el criterio ya usado en el historial real del repo es "un grupo de `feat`/`fix` que resuelve una funcionalidad completa", no cada commit suelto.
