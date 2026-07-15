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

**Hallazgo grave confirmado end-to-end (2026-07-15)**: el formulario "Nueva orden" arma cada ítem solo con `description`/`quantity`/`unitPrice` en texto libre — **nunca asigna `variantId`** (no hay buscador de producto, es texto libre real, no una apariencia de texto libre). El método `receive()` del service ignora silenciosamente cualquier ítem sin `variantId` (`if (!item || !item.variantId) continue;`), así que **una OC creada por este formulario, al "recibirse", no actualiza inventario ni dispara el asiento contable — pese a que la API devuelve 200 OK y la UI no muestra ningún error**. Verificado creando una OC de $1.000 con un ítem sin variante, recibiéndola dos veces (parcial + resto) vía la UI real: `received` quedó en `0` en la base y no se generó ningún `InventoryMovement` ni `JournalEntry`. La única vía que sí liga `variantId` correctamente es el flujo de "Sugerencias de reposición" (Inventario → Reposición → crear OC), que arma los ítems con el `variantId` real de cada producto sugerido.

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

**Prioridad alta**: agregar un buscador/selector de producto real al formulario "Nueva orden" (igual al que ya existe en el POS) que setee `variantId` — hoy es la única forma de que una OC manual llegue a mover stock o contabilidad al recibirse. Además: permitir recepción fraccionaria, implementar o eliminar `SENT`, unificar impresión con el sistema de Documents. Evaluar si `receive()` debería devolver un warning/error (o al menos un aviso en la UI) cuando un ítem se salteó por falta de `variantId`, en vez de fallar en silencio.

## Problemas conocidos (confirmados en código)

1. ~~**Doble contabilización**~~ — **resuelto 2026-07-15**: `PurchaseOrderService.receive()` ahora calcula `receivedAmount` (suma real de lo recibido en esa llamada) y el router lo pasa a `onPurchaseReceived` en vez de `order.total`. Verificado end-to-end: una OC de $1.000 recibida en dos tandas (4+6 unidades) generó dos asientos de $400 y $600 — total $1.000, no $2.000.
2. **El formulario "Nueva orden" nunca liga `variantId`** — confirmado end-to-end (ver arriba). Recibir una OC creada así no mueve stock ni genera asiento, sin ningún aviso al usuario. Es el hallazgo más importante de esta ronda de pruebas: el módulo de Compras, usado de la forma más obvia (crear una orden a mano), no cumple su función principal.
3. `taxAmount` nunca se pasa al asiento — la línea de IVA Crédito Fiscal en `auto-journal.service.ts` sigue siendo código muerto en la práctica (sin resolver).
4. `PUT /:id` permite forzar `status` a `RECEIVED` sin pasar por `/receive`, sin tocar inventario ni disparar el asiento — puede dejar una OC "recibida" sin stock real (sin resolver).
5. ~~Sin permisos de backend~~ — **resuelto 2026-07-15** (ver arriba).
6. Truncamiento de decimales en la recepción (sin resolver).

## Preguntas abiertas

¿Vale la pena que `PUT /:id` permita cambiar `status` libremente, o debería restringirse solo a transiciones válidas? ¿Se implementa `SENT` como paso real (ej. "orden enviada al proveedor, esperando confirmación") o se elimina del enum?
