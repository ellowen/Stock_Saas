# Transfers — Traspasos de stock entre sucursales

## Propósito

Mover stock de una sucursal a otra dentro de la misma empresa.

## Reglas de negocio

`createDraft` valida sucursales y variantes, pero **no valida stock disponible en origen** en ese paso (se valida recién al completar). No valida que el usuario pertenezca a la sucursal de origen/destino.

## Workflow real (distinto de lo que el nombre del enum sugiere)

`PENDING → COMPLETED` directo, en una sola operación (`complete()`), sin pasar nunca por `IN_TRANSIT`. **`IN_TRANSIT` y `CANCELLED` existen en el enum pero no los usa ningún código** — no hay endpoint de cancelación de un traspaso `PENDING`. Al completar: valida stock suficiente (`INSUFFICIENT_STOCK` si no alcanza), descuenta en origen, incrementa/crea `Inventory` en destino, genera un par `TRANSFER_OUT`/`TRANSFER_IN` de `InventoryMovement`.

## UX / Frontend

`TransfersPage.tsx`: tabla ordenable, modal de creación (selects de sucursal + filas manuales de variante+cantidad, sin buscador de producto), sección aparte de "completar por ID" (input numérico + botón). Solo traduce label para `PENDING`/`COMPLETED`; cualquier otro status se muestra crudo (nunca ocurre en la práctica).

## Navegación

`/app/transfers`, ícono `IconTransfer`, requiere `TRANSFERS_APPROVE`.

## Permisos

Los 3 endpoints (`GET`, `POST` crear, `POST /complete`) usan `requireRole(["OWNER","MANAGER"])`, **no** `requirePermission("TRANSFERS_APPROVE")`. Consecuencia doble: un SELLER con el permiso concedido igual no puede operar (bloqueado por rol), y un MANAGER con el permiso revocado igual puede operar (el rol alcanza). El permiso granular es, en este módulo, completamente inerte.

## Tablas / Modelo

`StockTransfer` (`fromBranchId, toBranchId, status, createdByUserId, approvedByUserId?`) + `StockTransferItem` (`productVariantId, quantity`).

## Mejoras futuras

Cambiar a `requirePermission("TRANSFERS_APPROVE")`. Decidir si implementar `IN_TRANSIT` como paso real (crear en origen, "en tránsito" hasta que destino confirma recepción) o eliminarlo del enum si el flujo de negocio real siempre fue de un solo paso. Agregar endpoint de cancelación para un traspaso `PENDING` que ya no se va a completar. Agregar buscador de producto al modal de creación en vez de carga manual de `productVariantId`.

## Problemas conocidos

1. `IN_TRANSIT`/`CANCELLED` inalcanzables — deuda de enum vs. implementación real.
2. Sin cancelación de traspasos pendientes.
3. Permiso granular `TRANSFERS_APPROVE` completamente inerte (gate real es de rol).
4. Sin validación de que quien completa el traspaso pertenezca a la sucursal destino — cualquier OWNER/MANAGER de la empresa puede completar un traspaso de cualquier par de sucursales.

## Preguntas abiertas

¿El negocio realmente necesita el paso intermedio "en tránsito" (útil si el traslado físico tarda y alguien debe confirmar recepción en destino), o el flujo de un solo paso actual ya refleja cómo se usa en la práctica? Si es lo segundo, simplificar el enum es más honesto que dejar estados muertos.
