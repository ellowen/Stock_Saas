# Purchases — Órdenes de compra

## Propósito

Gestionar el ciclo de compra a proveedores: crear una orden, recibirla (total o parcialmente) y que la recepción actualice inventario y, si corresponde, dispare un asiento contable.

## Reglas de negocio

- Numeración correlativa por `companyId` (no por sucursal).
- Toda OC nace en `DRAFT`.
- La recepción **trunca decimales** (`Math.floor`) pese a que el schema soporta `Decimal(10,3)` — no se puede recibir una cantidad fraccionaria.
- Cancelar una OC `PARTIALLY_RECEIVED` no revierte el stock ya recibido.
- El total se calcula una sola vez al crear y nunca se recalcula al recibir.

## Workflow real

`DRAFT → (recepción total o parcial) → PARTIALLY_RECEIVED | RECEIVED`, o `→ CANCELLED` en cualquier momento salvo si ya está `RECEIVED`.

`SENT` existe en el enum (`PurchaseOrderStatus`) y en los filtros de UI, pero **ningún flujo lo alcanza** — es un estado fantasma.

## UX / Frontend

`PurchaseOrdersPage.tsx`: tabs Lista/Nueva, autosave de borrador en `localStorage` (`oc_draft`), modal de recepción parcial (input por ítem con `max`=pendiente), modal de impresión propio con `window.print()` (no reusa `DocumentTemplate`/`usePrintDocument` del módulo Documents — inconsistencia a resolver si se unifica impresión).

**Resuelto 2026-07-15**: el formulario "Nueva orden" ahora tiene un buscador de producto real (debounced, igual patrón que `CustomerSearchInput` del POS) sobre el campo de descripción de cada ítem — buscar por nombre y elegir una variante liga `variantId` de verdad, con aviso visual (borde verde + SKU en la descripción) cuando está vinculado, y una advertencia ("no vinculado a un producto — no va a sumar stock ni generar asiento al recibir") cuando el usuario deja el ítem como texto libre a propósito. Antes de este fix, el formulario **nunca** asignaba `variantId` — no había ningún buscador, era texto libre real — y `receive()` ignora en silencio cualquier ítem sin `variantId`, así que una OC creada así, al "recibirse", devolvía `200 OK` sin mover stock ni generar asiento, sin ningún aviso. Verificado end-to-end tras el fix: creé una OC de $400 (8 unidades) vinculada a una variante real, la recibí, y se generó correctamente el `InventoryMovement` (stock 55→63) y el `JournalEntry` ($400 Mercaderías / $400 Proveedores).

Bug de API encontrado al implementar el fix: `GET /products?search=X&pageSize=N` **ignora el filtro `search` si no se manda también `page`** — `products.controller.ts` solo usa `listProductsPaginated` (que sí filtra) cuando `query.page !== undefined`; sin `page`, cae a `listProducts()` (sin filtros, todo el catálogo). El único caller nuevo (este buscador) ya manda `page=1` explícito; `useProducts.ts` (Inventario) también lo hacía ya. Vale la pena documentar esto como comportamiento de la API — cualquier consumidor nuevo de `/products` con `search` debe recordar mandar `page`.

## Navegación

`/app/purchases`, ícono `IconClipboardList`, requiere `PURCHASES_MANAGE` para verse en el menú.

## Permisos

`PURCHASES_MANAGE` gatea el menú y, desde el 2026-07-15, también el backend (`requirePermission("PURCHASES_MANAGE")` en crear/editar/recibir/cancelar, incluye también el endpoint de creación de OC desde sugerencias de reposición en Reports). Ver `SECURITY.md`.

## Componentes

Página única sin subcomponentes compartidos documentados aparte — modal de recepción y modal de impresión son internos de `PurchaseOrdersPage.tsx`.

## Tablas / Modelo

`PurchaseOrder` (`companyId, branchId, supplierId, userId, number, status, date, expectedAt?, notes?, total`) + `PurchaseOrderItem` (`orderId, variantId?, description, quantity, unitPrice, received`). `@@unique([companyId, number])`.

## Relaciones

`Supplier.purchaseOrders` (1-N). Al recibir, crea `InventoryMovement` tipo `PURCHASE_RECEIVE` y, si `accountingEnabled`, un asiento vía `AutoJournalService.onPurchaseReceived`.

## Mejoras futuras

Permitir recepción fraccionaria, implementar o eliminar `SENT`, unificar impresión con el sistema de Documents. Evaluar si vale la pena avisar server-side (no solo en el frontend) cuando `receive()` se llama con ítems sin `variantId`, para que ningún consumidor futuro de la API (integraciones, scripts) caiga en el mismo silencio.

## Problemas conocidos (confirmados en código)

1. ~~**Doble contabilización**~~ — **resuelto 2026-07-15**: `PurchaseOrderService.receive()` ahora calcula `receivedAmount` (suma real de lo recibido en esa llamada) y el router lo pasa a `onPurchaseReceived` en vez de `order.total`. Verificado end-to-end: una OC de $1.000 recibida en dos tandas (4+6 unidades) generó dos asientos de $400 y $600 — total $1.000, no $2.000.
2. ~~**El formulario "Nueva orden" nunca liga `variantId`**~~ — **resuelto 2026-07-15** (ver arriba). Era el hallazgo más importante de la ronda de pruebas: el módulo, usado de la forma más obvia, no cumplía su función principal.
3. `taxAmount` nunca se pasa al asiento — la línea de IVA Crédito Fiscal en `auto-journal.service.ts` sigue siendo código muerto en la práctica (sin resolver).
4. `PUT /:id` permite forzar `status` a `RECEIVED` sin pasar por `/receive`, sin tocar inventario ni disparar el asiento — puede dejar una OC "recibida" sin stock real (sin resolver).
5. ~~Sin permisos de backend~~ — **resuelto 2026-07-15** (ver arriba).
6. Truncamiento de decimales en la recepción (sin resolver).

## Preguntas abiertas

¿Vale la pena que `PUT /:id` permita cambiar `status` libremente, o debería restringirse solo a transiciones válidas? ¿Se implementa `SENT` como paso real (ej. "orden enviada al proveedor, esperando confirmación") o se elimina del enum?
