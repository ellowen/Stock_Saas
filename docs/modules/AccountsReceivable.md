# AccountsReceivable — Cuenta corriente de clientes

## Propósito

Registrar y cobrar deuda de clientes originada en ventas a crédito, y reportar antigüedad de saldos (aging).

## Reglas de negocio

Una venta con `paymentMethod: CREDIT` + `customerId` genera automáticamente un `AccountReceivable` por el total. Sin `customerId`, no se genera ningún registro (venta fiada sin trazabilidad — hueco real). Un pago no puede exceder el saldo (`PAYMENT_EXCEEDS_BALANCE`).

## Workflow

`PENDING → PARTIAL → PAID` según pagos acumulados. `OVERDUE` se marca vía cron diario (`AccountsReceivableService.markOverdue`, corre 00:30) sobre toda AR con `dueDate` vencido y saldo pendiente — antes de esto (resuelto 2026-07-15) el status nunca se persistía y el aging se calculaba solo al vuelo.

## UX / Frontend

`AccountsPage.tsx`, dos tabs: "Cuentas corrientes" (filtro por status, cobro inline, historial de pagos) y "Aging" (buckets de vencimiento con color por antigüedad). No hay UI para crear una cuenta manualmente (el backend lo soporta, la pantalla no lo expone). El selector de método de pago al cobrar solo ofrece `CASH|CARD|OTHER` (no `MIXED` ni `CREDIT`, aunque el enum completo lo permitiría).

## Navegación

`/app/accounts`, ícono `IconCurrency` (compartido con Plan — ver `NAVIGATION.md`), requiere `SALES_HISTORY`.

## Permisos

`ACCOUNTS_RECEIVABLE_MANAGE` (agregado 2026-07-15, migración `add_accounts_receivable_permission`), aplicado con `requirePermission` en `POST /` (crear AR manual) y `POST /:id/pay` (cobrar). Default `true` en los 3 roles incluido SELLER — preserva el acceso libre que ya existía, pero ahora es revocable por usuario. La lectura (`GET /`, `/summary`, `/aging`) sigue sin gate propio, sólo `authMiddleware`, igual que el resto de los listados de la app.

## Componentes

Tabla de AR con historial de pagos inline, formulario de cobro, tabla de aging con buckets `current/d30/d60/d90/d91plus`.

## Tablas / Modelo

`AccountReceivable` (`customerId, saleId?, amount, paid, dueDate?, status, notes?`) + `ARPayment` (`receivableId, amount, method, notes?`).

## Relaciones

`Sale → AccountReceivable` (creación automática en venta a crédito). `Customer.accountsReceivable` (1-N). Un pago dispara `AutoJournalService.onARPayment` (Debe Caja/Banco, Haber Deudores por Ventas) si `accountingEnabled` — ver `modules/Accounting.md`.

## Mejoras futuras

UI para crear AR manual (backend ya lo soporta). Completar el selector de método de pago con `MIXED`. Decidir si una venta CREDIT sin cliente debería bloquearse en el POS en vez de quedar sin trazabilidad. Evaluar si conviene diferenciar permisos de "crear cuenta" vs. "cobrar" (hoy `ACCOUNTS_RECEIVABLE_MANAGE` cubre ambos con una sola clave, igual que `PURCHASES_MANAGE`).

## Problemas conocidos

1. ~~`ARStatus.OVERDUE` inalcanzable en base de datos~~ — **resuelto 2026-07-15**: cron diario marca `OVERDUE` toda AR vencida con saldo pendiente; el filtro "Vencida" ahora sí trae resultados.
2. ~~Cobrar una AR no genera ningún asiento contable~~ — **resuelto 2026-07-15**: `onARPayment` reversa "Deudores por Ventas" contra Caja/Banco al confirmar el pago.
3. ~~Sin permiso de backend dedicado~~ — **resuelto 2026-07-15**: `ACCOUNTS_RECEIVABLE_MANAGE`.
4. Venta CREDIT sin cliente no genera ningún registro de deuda — sin resolver, es una decisión de producto (¿bloquear la combinación en el POS o permitirla intencionalmente?).
5. Cálculo de deuda total duplicado (frontend suma manualmente, backend tiene `GET /summary` que la página ni siquiera consume).

## Preguntas abiertas

¿Vale la pena agregar un valor `RECEIVABLE_PAYMENT` al enum `JournalSource` para poder reportar cobros de cuenta corriente separados de ventas? Hoy `onARPayment` reusa `sourceType: "SALE"` para evitar una migración de schema — funciona para el balance contable pero mezcla ambos orígenes en cualquier reporte que filtre por `sourceType`.
