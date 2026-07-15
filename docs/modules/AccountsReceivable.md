# AccountsReceivable — Cuenta corriente de clientes

## Propósito

Registrar y cobrar deuda de clientes originada en ventas a crédito, y reportar antigüedad de saldos (aging).

## Reglas de negocio

Una venta con `paymentMethod: CREDIT` + `customerId` genera automáticamente un `AccountReceivable` por el total. Sin `customerId`, no se genera ningún registro (venta fiada sin trazabilidad — hueco real). Un pago no puede exceder el saldo (`PAYMENT_EXCEEDS_BALANCE`).

## Workflow

`PENDING → PARTIAL → PAID` según pagos acumulados. `OVERDUE` **nunca se persiste** — el aging se calcula al vuelo comparando `dueDate` contra hoy, sin ningún cron que actualice el `status` en base de datos.

## UX / Frontend

`AccountsPage.tsx`, dos tabs: "Cuentas corrientes" (filtro por status, cobro inline, historial de pagos) y "Aging" (buckets de vencimiento con color por antigüedad). No hay UI para crear una cuenta manualmente (el backend lo soporta, la pantalla no lo expone). El selector de método de pago al cobrar solo ofrece `CASH|CARD|OTHER` (no `MIXED` ni `CREDIT`, aunque el enum completo lo permitiría).

## Navegación

`/app/accounts`, ícono `IconCurrency` (compartido con Plan — ver `NAVIGATION.md`), requiere `SALES_HISTORY`.

## Permisos

**No existe un `PermissionKey` dedicado para este módulo** — ni siquiera figura en el sistema de permisos granular. Solo protegido por estar autenticado.

## Componentes

Tabla de AR con historial de pagos inline, formulario de cobro, tabla de aging con buckets `current/d30/d60/d90/d91plus`.

## Tablas / Modelo

`AccountReceivable` (`customerId, saleId?, amount, paid, dueDate?, status, notes?`) + `ARPayment` (`receivableId, amount, method, notes?`).

## Relaciones

`Sale → AccountReceivable` (creación automática en venta a crédito). `Customer.accountsReceivable` (1-N).

## Mejoras futuras

Agregar `PermissionKey` dedicado. Agregar `onARPayment` a `AutoJournalService` para reversar contablemente "Deudores por Ventas" cuando el cliente paga. Job que marque `OVERDUE` real (o eliminar el status persistido y dejar todo como cálculo dinámico, siendo honesto con lo que el dato realmente representa). UI para crear AR manual. Completar el selector de método de pago con `MIXED`.

## Problemas conocidos

1. `ARStatus.OVERDUE` inalcanzable en base de datos — el filtro "Vencida" en la vista de Cuentas corrientes nunca trae resultados.
2. Cobrar una AR no genera ningún asiento contable — hueco contable si `accountingEnabled` está activo (se debitó Deudores al vender, nunca se revierte al cobrar).
3. Venta CREDIT sin cliente no genera ningún registro de deuda.
4. Sin permiso de backend dedicado ni general — el módulo entero es de acceso libre para cualquier autenticado.
5. Cálculo de deuda total duplicado (frontend suma manualmente, backend tiene `GET /summary` que la página ni siquiera consume).

## Preguntas abiertas

¿`OVERDUE` debería ser un status real perseguido por un cron, o el modelo debería directamente no tener ese campo y calcular todo dinámicamente (como ya hace `/aging`)? Mantener un campo que nunca refleja la realidad es peor que no tenerlo.
