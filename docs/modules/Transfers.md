# Transfers — Traspasos de stock entre sucursales

## Propósito

Mover stock de una sucursal a otra dentro de la misma empresa.

## Reglas de negocio

`createDraft` valida sucursales y variantes, pero **no valida stock disponible en origen** en ese paso (se valida recién al completar). No valida que el usuario pertenezca a la sucursal de origen/destino.

## Workflow real (distinto de lo que el nombre del enum sugiere)

`PENDING → COMPLETED` directo, en una sola operación (`complete()`), sin pasar nunca por `IN_TRANSIT`. Al completar: valida stock suficiente (`INSUFFICIENT_STOCK` si no alcanza), descuenta en origen, incrementa/crea `Inventory` en destino, genera un par `TRANSFER_OUT`/`TRANSFER_IN` de `InventoryMovement`.

**Resuelto 2026-07-15 — cancelación real**: `PENDING → CANCELLED` ahora es un endpoint real (`POST /:id/cancel`), no solo movía a `COMPLETED` antes. Solo se puede cancelar un traspaso `PENDING` (no toca inventario porque `PENDING` nunca lo tocó — todo el movimiento de stock ocurre recién en `complete()`). El botón "Cancelar" aparece en la tabla solo para filas `PENDING`.

`IN_TRANSIT` sigue sin usarse — implementarlo requeriría un paso intermedio real (crear en origen → "en tránsito" → destino confirma recepción), que es una decisión de flujo de negocio, no un fix mecánico (ver preguntas abiertas).

## UX / Frontend

`TransfersPage.tsx`: tabla ordenable con columna de acciones (botón "Cancelar" para `PENDING`), modal de creación (selects de sucursal + filas manuales de variante+cantidad, sin buscador de producto), sección aparte de "completar por ID" (input numérico + botón). Traduce `PENDING`/`COMPLETED`/`CANCELLED`.

## Navegación

`/app/transfers`, ícono `IconTransfer`, requiere `TRANSFERS_APPROVE`.

## Permisos

Los 4 endpoints (`GET`, `POST` crear, `POST /complete`, `POST /:id/cancel`) usan `requirePermission("TRANSFERS_APPROVE")` desde el 2026-07-15 (antes usaban `requireRole(["OWNER","MANAGER"])`, ignorando cualquier override — ver `SECURITY.md`).

## Tablas / Modelo

`StockTransfer` (`fromBranchId, toBranchId, status, createdByUserId, approvedByUserId?`) + `StockTransferItem` (`productVariantId, quantity`).

## Mejoras futuras

Decidir si implementar `IN_TRANSIT` como paso real o eliminarlo del enum si el flujo de negocio real siempre fue de un solo paso (ver preguntas abiertas). Agregar buscador de producto al modal de creación en vez de carga manual de `productVariantId`. Validar que quien completa/cancela un traspaso pertenezca a alguna de las sucursales involucradas.

## Problemas conocidos

1. `IN_TRANSIT` inalcanzable — deuda de enum vs. implementación real (`CANCELLED` se resolvió el 2026-07-15).
2. ~~Sin cancelación de traspasos pendientes~~ — **resuelto 2026-07-15**.
3. ~~Permiso granular `TRANSFERS_APPROVE` inerte~~ — **resuelto 2026-07-15** (ver `SECURITY.md`).
4. Sin validación de que quien completa/cancela el traspaso pertenezca a la sucursal de origen o destino — cualquier OWNER/MANAGER de la empresa puede operar cualquier par de sucursales.

## Preguntas abiertas

¿El negocio realmente necesita el paso intermedio "en tránsito" (útil si el traslado físico tarda y alguien debe confirmar recepción en destino), o el flujo de un solo paso actual ya refleja cómo se usa en la práctica? Si es lo segundo, simplificar el enum (eliminar `IN_TRANSIT`) es más honesto que dejar un estado muerto.
