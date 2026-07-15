# Sales — Historial y gestión de ventas

## Propósito

Historial de ventas confirmadas (más allá del flujo de cobro en sí, que es `modules/POS.md`): consulta, anulación, devoluciones.

## Reglas de negocio

`SaleStatus`: `COMPLETED/CANCELLED/REFUNDED/PENDING`. Anular una venta requiere `SALES_VOID`. Ver historial completo de todos los cajeros requiere `SALES_HISTORY` — sin ese permiso, un usuario presumiblemente solo vería sus propias ventas (a confirmar el comportamiento exacto del filtro cuando falta el permiso).

## Workflow

Venta completada desde el POS → aparece en historial → opcionalmente anulada (revierte lo necesario) o devuelta parcialmente (`SaleReturn`/`SaleReturnItem`, repone stock de los ítems devueltos).

## UX / Frontend

Vista de historial con filtros (fecha, cajero, método de pago, status) — comparte página/módulo con POS en la navegación (`/app/sales` es la ruta única para vender y consultar historial, organizados por tabs o vista según el permiso del usuario).

## Navegación

`/app/sales`, ícono `IconShoppingCart`.

## Permisos

`SALES_VOID` (anular), `SALES_HISTORY` (ver historial completo) — ambos son defaults `true` para OWNER/MANAGER, `false` para SELLER.

## Tablas / Modelo

`Sale`, `SaleItem`, `SaleReturn`, `SaleReturnItem`. `PaymentMethod`: `CASH/CARD/MIXED/OTHER/CREDIT`.

## Relaciones

Ver `modules/POS.md` para el flujo de creación. `modules/AccountsReceivable.md` para el efecto de una venta `CREDIT`. `modules/Accounting.md` para el asiento automático que genera una venta si `accountingEnabled`.

## Mejoras futuras

No auditado en profundidad en esta ronda más allá de lo ya cubierto por el trabajo del rediseño del POS — si se retoma este módulo, verificar el comportamiento exacto de devoluciones parciales y su efecto contable/de inventario con el mismo nivel de detalle que se aplicó a Purchases/Documents en esta ronda.

## Problemas conocidos

No investigados a fondo en esta ronda específica (el foco estuvo en el flujo de cobro del POS, ya cubierto). Pendiente una pasada dedicada a Sales-como-historial (anulación, devoluciones) con el mismo rigor aplicado a los demás módulos.

## Preguntas abiertas

¿El flujo de devolución (`SaleReturn`) dispara algún asiento contable de reversa, similar al hueco encontrado en `modules/AccountsReceivable.md` para el cobro de cuentas por cobrar? Requiere verificación antes de asumir que sí o que no.
