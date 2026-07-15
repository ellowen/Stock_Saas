# Accounting — Contabilidad

## Propósito

Plan de cuentas estilo FACPCE, libro diario (partida doble) y libro IVA, con asientos automáticos generados por otras operaciones del sistema.

## Reglas de negocio

Contabilidad es **opt-in por empresa** (`Company.accountingEnabled`) — si está apagado, el resto de la app funciona igual, solo no se generan asientos. `Account` tipado por `AccountType` (`ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE`). `JournalEntry`/`JournalLine` implementan partida doble real (débito = crédito por asiento).

## Workflow

`AutoJournalService` genera asientos automáticos en 4 puntos: `onSaleCreated` (venta), `onPurchaseReceived` (recepción de OC, ahora por el monto recibido en cada llamada, no el total de la orden — fix 2026-07-15), `onPayrollPaid` (pago de sueldo), `onARPayment` (cobro de cuenta por cobrar, agregado 2026-07-15: reversa "Deudores por Ventas" contra Caja/Banco).

## UX / Frontend

Vista de plan de cuentas, libro diario (con filtro por período), libro IVA, reportes contables (`accounting-reports.router.ts`).

## Navegación

`/app/accounting`, ícono `IconBook`, requiere `ACCOUNTING_VIEW`.

## Permisos

`journal.router.ts`/`accounting-reports.router.ts` usan `requirePermission("ACCOUNTING_VIEW")` correctamente — uno de los módulos con enforcement de backend real. `ACCOUNTING_WRITE` (crear asientos manuales) es `false` por default incluso para MANAGER — solo OWNER por defecto.

## Tablas / Modelo

`Account`, `JournalEntry` (`source: JournalSource`, `status: JournalStatus`), `JournalLine`.

## Relaciones

Alimentado automáticamente por Sales, Purchases, Payroll y AccountsReceivable. `onARPayment` reusa `sourceType: "SALE"` (el enum `JournalSource` no tiene un valor dedicado a cobros de cuenta corriente — agregar uno requeriría migración de schema).

## Mejoras futuras

Confirmar si `taxAmount` se propaga correctamente a los asientos de venta (se confirmó que en Purchases no se propaga — verificar si Sales tiene el mismo problema). Evaluar agregar `RECEIVABLE_PAYMENT` a `JournalSource` si se necesita reportar cobros de cta. cte. separados de ventas.

## Problemas conocidos

Ninguno pendiente de los dos huecos de integridad contable encontrados en la documentación inicial (doble asiento en OC, falta de reversa al cobrar AR) — ambos resueltos 2026-07-15, ver `modules/Purchases.md` y `modules/AccountsReceivable.md`.

## Preguntas abiertas

¿El motor de asientos automáticos debería cubrir también devoluciones de venta (`SaleReturn`) y cancelaciones? No se confirmó en esta ronda si existe ese caso — a verificar antes de asumir cobertura completa del ciclo contable.
