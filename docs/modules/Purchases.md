# Purchases — Órdenes de compra

## Propósito

Gestionar el ciclo de compra a proveedores: crear una orden, recibirla (total o parcialmente) y que la recepción actualice inventario y, si corresponde, dispare un asiento contable.

## Reglas de negocio

- Numeración correlativa por `companyId` (no por sucursal).
- Toda OC nace en `DRAFT`.
- Cancelar una OC `PARTIALLY_RECEIVED` no revierte el stock ya recibido.
- El total se calcula una sola vez al crear (incluye impuesto, ver abajo) y no se recalcula si se edita después — solo `/receive` mueve dinero real hacia la contabilidad.
- Cada ítem puede tener un `taxConfigId` opcional (2026-07-15) — si no se elige, el ítem no lleva impuesto, igual que antes.
- La cantidad recibida puede ser fraccionaria (`Decimal(10,3)` en `PurchaseOrderItem.received`), pero el stock real (`Inventory.quantity`, `Int`) redondea al entero más cercano — el sistema de inventario completo (no solo Compras) no soporta unidades fraccionarias en el ledger, así que `received` puede quedar en "4.5" mientras el stock sumó "5" unidades. Es una limitación real del ledger, no un bug de este módulo.

## Workflow real

`DRAFT → (recepción total o parcial) → PARTIALLY_RECEIVED | RECEIVED`, o `→ CANCELLED` en cualquier momento salvo si ya está `RECEIVED`. `PUT /:id` (2026-07-15) ya no permite forzar `status` a `RECEIVED`/`PARTIALLY_RECEIVED` directamente — esos dos solo se alcanzan a través de `/receive`.

`SENT` existe en el enum (`PurchaseOrderStatus`) y en los filtros de UI, pero **ningún flujo lo alcanza** — sigue siendo un estado fantasma (no resuelto, ver preguntas abiertas).

## UX / Frontend

`PurchaseOrdersPage.tsx`: tabs Lista/Nueva, autosave de borrador en `localStorage` (`oc_draft`), modal de recepción parcial (input por ítem con `max`=pendiente), modal de impresión propio con `window.print()` (no reusa `DocumentTemplate`/`usePrintDocument` del módulo Documents — inconsistencia sin resolver).

**Resuelto 2026-07-15 — buscador de producto real**: el formulario "Nueva orden" tiene un buscador de producto (debounced, igual patrón que `CustomerSearchInput` del POS) sobre el campo de descripción de cada ítem — buscar por nombre y elegir una variante liga `variantId` de verdad, con aviso visual (borde verde + SKU) cuando está vinculado y una advertencia cuando no. Antes de este fix, el formulario **nunca** asignaba `variantId` (texto libre real, sin buscador), y `receive()` ignora en silencio cualquier ítem sin `variantId` — una OC creada así, al "recibirse", devolvía `200 OK` sin mover stock ni generar asiento, sin ningún aviso.

**Resuelto 2026-07-15 — selector de impuesto por ítem**: cada fila de ítem tiene un select de impuesto (poblado desde `GET /tax-configs`), oculto si la empresa no tiene ninguno cargado. El total del formulario muestra Subtotal/Impuestos/Total cuando hay algún ítem con impuesto. **Nota importante**: no existe ninguna pantalla para crear/editar `TaxConfig` — el CRUD backend existe (`/tax-configs`) pero ninguna parte de Configuración lo expone. Hoy, la única forma de cargar un impuesto es vía API directa o script — es el mismo hueco que ya tenía Documents (su tipo `taxConfigId` tampoco se expone en su formulario). Vale la pena una pantalla de "Impuestos" en Configuración que sirva a los dos módulos.

Bug de API encontrado al implementar el buscador de producto: `GET /products?search=X&pageSize=N` **ignora el filtro `search` si no se manda también `page`** — cae a la rama sin filtrar. El buscador nuevo ya manda `page=1` explícito.

## Navegación

`/app/purchases`, ícono `IconClipboardList`, requiere `PURCHASES_MANAGE` para verse en el menú.

## Permisos

`PURCHASES_MANAGE` gatea el menú y, desde el 2026-07-15, también el backend (`requirePermission("PURCHASES_MANAGE")` en crear/editar/recibir/cancelar, incluye también el endpoint de creación de OC desde sugerencias de reposición en Reports). Ver `SECURITY.md`.

## Componentes

Página única sin subcomponentes compartidos documentados aparte — modal de recepción y modal de impresión son internos de `PurchaseOrdersPage.tsx`.

## Tablas / Modelo

`PurchaseOrder` (`companyId, branchId, supplierId, userId, number, status, date, expectedAt?, notes?, total`) + `PurchaseOrderItem` (`orderId, variantId?, description, quantity, unitPrice, received, taxConfigId?, taxAmount`). `@@unique([companyId, number])`. Migración `20260715172844_add_purchase_order_item_tax` agregó `taxConfigId`/`taxAmount`.

## Relaciones

`Supplier.purchaseOrders` (1-N). `PurchaseOrderItem.taxConfig` → `TaxConfig` (mismo modelo que usa `DocumentItem`). Al recibir, crea `InventoryMovement` tipo `PURCHASE_RECEIVE` y, si `accountingEnabled`, un asiento vía `AutoJournalService.onPurchaseReceived` con 2 o 3 líneas (Mercaderías + Proveedores, más IVA Crédito Fiscal si el ítem tenía impuesto).

## Mejoras futuras

Implementar o eliminar `SENT`. Unificar impresión con el sistema de Documents. Pantalla de administración de `TaxConfig` en Configuración (hoy no existe para ningún módulo). Evaluar si vale la pena avisar server-side (no solo con el aviso visual del frontend) cuando `receive()` recibe ítems sin `variantId`, para que un consumidor futuro de la API (integraciones, scripts) no caiga en el mismo silencio que tenía la UI antes del fix.

## Problemas conocidos (confirmados en código)

1. ~~**Doble contabilización**~~ — **resuelto 2026-07-15**: `receive()` calcula `receivedAmount` real (lo recibido en esa llamada) en vez de usar `order.total`. Verificado: OC de $1.000 recibida en 2 tandas (4+6) generó $400 + $600, no $2.000.
2. ~~**El formulario "Nueva orden" nunca liga `variantId`**~~ — **resuelto 2026-07-15** (ver arriba).
3. ~~**`taxAmount` nunca se pasa al asiento**~~ — **resuelto 2026-07-15**: `PurchaseOrderItem` ahora tiene `taxConfigId`/`taxAmount`, `create()` y `receive()` calculan el impuesto real, y el asiento incluye la línea de IVA Crédito Fiscal cuando corresponde. Verificado: OC con IVA 21% ($1.000 + $210), recibida parcialmente (4.5 de 10), generó un asiento con 3 líneas balanceadas: Mercaderías $450, IVA CF $94.5, Proveedores $544.5.
4. ~~**`PUT /:id` permitía forzar `status` a `RECEIVED`**~~ — **resuelto 2026-07-15**: ahora solo acepta `DRAFT`/`SENT`/`CANCELLED` por esa vía; `RECEIVED`/`PARTIALLY_RECEIVED` solo se alcanzan vía `/receive`.
5. ~~Sin permisos de backend~~ — **resuelto 2026-07-15**.
6. ~~Truncamiento de decimales en la recepción~~ — **resuelto 2026-07-15**: `receive()` ya no usa `Math.floor()`, acepta cantidades fraccionarias en `PurchaseOrderItem.received`. El stock real sigue redondeando a entero (ver "Reglas de negocio" — limitación del ledger, no de este fix).

## Preguntas abiertas

¿Se implementa `SENT` como paso real (ej. "orden enviada al proveedor, esperando confirmación") o se elimina del enum? ¿Vale la pena una migración más grande para que `Inventory.quantity`/`InventoryMovement` soporten `Decimal` en vez de `Int`, si el negocio real necesita unidades fraccionarias (poco probable para indumentaria, más probable si se vende por metro/peso)?
