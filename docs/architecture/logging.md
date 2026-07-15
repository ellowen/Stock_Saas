# Logging

No se confirmó un logging estructurado centralizado (tipo Winston/Pino) en esta ronda — a verificar. Errores de backend no capturados por un handler específico probablemente caen en `console.error` (ej. el fire-and-forget de `autoJournal.onPurchaseReceived(...).catch(console.error)` en `purchase-orders.router.ts`, ver `architecture/backend.md`), lo cual en producción significa que un fallo silencioso de contabilidad no llega a ningún sistema de alertas — solo al log crudo del proceso.

## Frontend

No hay Sentry ni logging de errores de cliente hacia un backend propio — errores de fetch/render solo visibles en la consola del navegador del usuario final. Ver `ERROR_HANDLING.md`.

## Recomendación

Antes de producción, decidir un mínimo de logging estructurado + alerta para errores de operaciones de dinero (ventas, pagos, asientos contables) — hoy un fallo ahí pasa desapercibido salvo que alguien revise logs manualmente.
