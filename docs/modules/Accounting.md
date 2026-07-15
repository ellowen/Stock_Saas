# Accounting — Contabilidad

## Propósito

Plan de cuentas estilo FACPCE, libro diario (partida doble) y libro IVA, con asientos automáticos generados por otras operaciones del sistema.

## Reglas de negocio

Contabilidad es **opt-in por empresa** (`Company.accountingEnabled`) — si está apagado, el resto de la app funciona igual, solo no se generan asientos. `Account` tipado por `AccountType` (`ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE`). `JournalEntry`/`JournalLine` implementan partida doble real (débito = crédito por asiento).

## Workflow

`AutoJournalService` genera asientos automáticos en 3 puntos confirmados: `onSaleCreated` (venta), `onPurchaseReceived` (recepción de OC), `onPayrollPaid` (pago de sueldo). **No existe** un `onARPayment` — cobrar una cuenta por cobrar no genera reversa contable (hueco documentado en `modules/AccountsReceivable.md`).

## UX / Frontend

Vista de plan de cuentas, libro diario (con filtro por período), libro IVA, reportes contables (`accounting-reports.router.ts`).

## Navegación

`/app/accounting`, ícono `IconBook`, requiere `ACCOUNTING_VIEW`.

## Permisos

`journal.router.ts`/`accounting-reports.router.ts` usan `requirePermission("ACCOUNTING_VIEW")` correctamente — uno de los módulos con enforcement de backend real. `ACCOUNTING_WRITE` (crear asientos manuales) es `false` por default incluso para MANAGER — solo OWNER por defecto.

## Tablas / Modelo

`Account`, `JournalEntry` (`source: JournalSource`, `status: JournalStatus`), `JournalLine`.

## Relaciones

Alimentado automáticamente por Sales, Purchases y Payroll. Ver el bug de doble contabilización en recepciones parciales de OC (`modules/Purchases.md`) y el hueco de AccountsReceivable.

## Mejoras futuras

Implementar `onARPayment`. Corregir el bug de doble asiento en recepción parcial de compras (pasar el monto de la entrega, no el total de la orden). Confirmar si `taxAmount` se propaga correctamente a los asientos de venta (se confirmó que en Purchases no se propaga — verificar si Sales tiene el mismo problema).

## Problemas conocidos

Ver el detalle completo en `modules/Purchases.md` (doble asiento) y `modules/AccountsReceivable.md` (falta de reversa al cobrar). Ambos son huecos reales de integridad contable si `accountingEnabled` está activo, no solo detalles cosméticos.

## Preguntas abiertas

¿El motor de asientos automáticos debería cubrir también devoluciones de venta (`SaleReturn`) y cancelaciones? No se confirmó en esta ronda si existe ese caso — a verificar antes de asumir cobertura completa del ciclo contable.
