# Inventory — Stock, movimientos y conteos físicos

## Propósito

Gestionar cantidades de stock por variante×sucursal, su historial de movimientos, conteos físicos periódicos y sugerencias de reposición.

## Reglas de negocio

El stock **pertenece a la variante, no al producto** (`Inventory.productVariantId`, `@@unique([companyId, branchId, productVariantId])`). `Product` no tiene cantidad propia. Umbral de "stock bajo" por defecto: 5 unidades si `minStock` es null.

## Workflow

5 tabs: **Productos** (catálogo, no es stock en sí), **Stock** (cantidad por sucursal, edición inline de cantidad/mínimo/ubicación, lotes, impresión de etiquetas), **Historial** (`InventoryMovement` paginado), **Conteo** (sesión de conteo físico: crear → snapshot de `systemQty` → cargar `countedQty` por ítem → aplicar, sobrescribe `Inventory.quantity` y genera `MANUAL_ADJUST`), **Reposición** (sugerencias basadas en velocidad de venta de los últimos 30 días, con creación automática de OC en `DRAFT` agrupada por proveedor).

## UX / Frontend

`InventoryPage.tsx` (re-export de `pages/inventory/InventoryPage.tsx`). Filtros ricos en StockTab (sucursal, texto, categoría, marca, rango de precio, `lowStockOnly`, `hideZero` default `true`).

## Navegación

`/app/inventory`, ícono `IconPackage`, sin permiso requerido en el menú (visible para todos).

## Permisos

`inventory.router.ts` y `stock-counts.router.ts` **solo tienen `authMiddleware`** — pese a que `INVENTORY_WRITE` existe como `PermissionKey`, ningún endpoint lo verifica. Cualquier usuario autenticado (incluso SELLER sin el permiso) puede ajustar stock, hacer ajustes masivos, o aplicar/cancelar un conteo vía API.

## Componentes

`StockEditModal`, `BatchesModal` (modelo `Batch`), `LabelPrintModal`.

## Tablas / Modelo

`Inventory` (`branchId, productVariantId, quantity, minStock?, location?`), `InventoryMovement` (`type, quantityBefore, quantityAfter, userId?, referenceType?, referenceId?`), `InventoryMovementType` (8 valores: `SALE, SALE_RETURN, MANUAL_ADJUST, SET_QUANTITY, TRANSFER_IN, TRANSFER_OUT, DOCUMENT_OUT, PURCHASE_RECEIVE`), `StockCount`/`StockCountItem` (`systemQty`, `countedQty?`).

## Mejoras futuras

Agregar `requirePermission("INVENTORY_WRITE")` en ambos routers. Corregir la query con `ILIKE` (ver bug abajo). Completar `MOVEMENT_TYPE_LABELS` con los 3 valores faltantes. Hacer que las exportaciones de StockTab respeten los filtros activos.

## Problemas conocidos

1. **Bug de runtime confirmado**: `listPaginatedLowStockOnly` (activado al combinar `lowStockOnly=true` con búsqueda de texto) usa SQL crudo con el operador `ILIKE`, exclusivo de PostgreSQL — el datasource es MySQL, esta combinación de filtros rompe en producción.
2. Sin protección de permiso en ambos routers (Inventory y Stock Counts).
3. `MOVEMENT_TYPE_LABELS` no traduce `SALE_RETURN`, `DOCUMENT_OUT`, `PURCHASE_RECEIVE` — se muestran como string crudo del enum en el historial.
4. Exportación de Stock (CSV/Excel/PDF) ignora los filtros activos de pantalla, siempre trae todo el inventario de la empresa.

## Preguntas abiertas

Ninguna de diseño — el módulo está bien pensado (5 tabs cubren el ciclo completo de gestión de stock incluyendo reposición inteligente). Los pendientes son correcciones puntuales, no decisiones de producto.
