# ROADMAP

Consolidado desde `MEJORAS-FUTURAS.md` (histórico) más los hallazgos de la ronda de documentación completa y de las pruebas end-to-end de los 20 módulos hechas en el navegador real (2026-07-15). Prioridad asignada por impacto real, no por preferencia estética.

## Pendiente — P0: Compras no mueve stock ni contabilidad si se crea a mano

**Confirmado end-to-end el 2026-07-15**, probando el módulo en el navegador con datos reales: el formulario "Nueva orden" de Compras arma cada ítem solo con `description`/`quantity`/`unitPrice` — **nunca asigna `variantId`** (no hay buscador de producto, es texto libre real). `PurchaseOrderService.receive()` ignora en silencio cualquier ítem sin `variantId`. Resultado: una OC creada por ese formulario, al "recibirse", devuelve `200 OK`, la UI no muestra ningún error, pero **no actualiza inventario ni genera asiento contable** — se verificó creando una OC de $1.000 y recibiéndola dos veces: `received` quedó en `0` en la base, sin `InventoryMovement` ni `JournalEntry`.

La única vía que sí liga `variantId` correctamente es "Sugerencias de reposición" (Inventario → Reposición → crear OC). Fix sugerido: agregar un buscador de producto real al formulario de "Nueva orden" (mismo componente que ya existe en el POS), y que `receive()` avise si un ítem se salteó por falta de `variantId` en vez de fallar en silencio. Ver `modules/Purchases.md`.

## ✅ Completado 2026-07-15 — P0: Seguridad (server-authoritative real)

`requirePermission(key)` agregado en todos los routers que solo tenían `authMiddleware` o `requireRole` genérico: Productos/Atributos, Inventario/Conteos, Clientes, Proveedores, Compras (incluye `/analytics/reorder-suggestions/create-po`), Documentos, Traspasos (`requireRole` → `requirePermission("TRANSFERS_APPROVE")`), Reportes (`requireRole` → `requirePermission("REPORTS_VIEW")`).

Usuarios/Sucursales fue el caso no trivial: `USERS_MANAGE`/`SETTINGS_MANAGE` no estaban en los defaults de MANAGER pese a que `requireRole(["OWNER","MANAGER"])` ya le daba acceso. Se agregaron ambos permisos a `ROLE_DEFAULTS.MANAGER` (backend y espejo en `AuthContext.tsx`) antes de exigirlos, para no revocar el acceso de golpe. También se corrigió `canManageUsers`/`canManageBranches` en `AuthContext.tsx` para derivar de `hasPermission()` en vez de estar hardcodeado al rol.

Verificado en el navegador: Reportes, Sucursales y Usuarios siguen accesibles para OWNER tras el cambio; el modal de permisos de un SELLER muestra correctamente los nuevos gates.

## ✅ Completado 2026-07-15 — P1: Bugs de integridad de datos/contable

- **Doble asiento contable en recepción parcial de OC**: corregido y **verificado end-to-end** (creando una OC de $1.000 con variante real, recibida en dos tandas de 4 y 6 unidades vía script directo al service): generó dos asientos de $400 y $600, total $1.000 — no $2.000 como el bug original.
- **`ILIKE` en query MySQL** (`inventory.service.ts`): cambiado a `LIKE`. Verificado en el navegador: `search=a&lowStockOnly=true` combinados devuelven `200 OK` (antes rompía con error de sintaxis SQL).
- **Límite de sucursales no libera cupo al eliminar**: `checkBranchLimit`/`getPlanUsage` ahora filtran `isActive: true`. Verificado en `/app/plan`: "Sucursales 3/5" refleja el conteo correcto.
- **`ARStatus.OVERDUE` inalcanzable**: cron diario (`markOverdue`, 00:30) marca `OVERDUE` toda AR vencida con saldo pendiente. **Verificado con script**: una AR con `dueDate` pasada pasó de `PENDING` a `OVERDUE` correctamente.
- **Falta de asiento contable al cobrar una cuenta por cobrar**: `AutoJournalService.onARPayment` (Debe Caja/Banco, Haber Deudores por Ventas). **Verificado con script**: pago de $200 generó el asiento exacto (Caja debe 200 / Deudores haber 200) y la AR pasó a `PARTIAL`. Nota: `JournalSource` no tiene un valor dedicado para esto — se reusó `SALE` con `reference: "AR-PAY-<id>"` para evitar una migración extra; evaluar agregar `RECEIVABLE_PAYMENT` si se necesita reportar por separado.

## ✅ Completado 2026-07-15 — P3 original: permiso dedicado para Cuentas por Cobrar

`accounts-receivable.router.ts` no tenía ningún `PermissionKey` propio. Se agregó `ACCOUNTS_RECEIVABLE_MANAGE` (migración `20260715120206_add_accounts_receivable_permission`), aplicado en `POST /` y `POST /:id/pay`, default `true` en los 3 roles para preservar el acceso libre que ya existía. **Verificado en el navegador**: aparece correctamente en el modal de permisos de un usuario SELLER, agrupado en "Clientes / Documentos", marcado como default de rol.

## ✅ Completado 2026-07-15 — POS: layout de escritorio + carrito visible al cobrar

Rediseño de `POSTab.tsx` (Opción A del comparativo de layouts): panel derecho fijo (400px, carrito + pago, siempre visible) + columna izquierda flexible (búsqueda/contexto), en vez del contenedor único con `max-w-2xl` que dejaba la mitad de la pantalla vacía en desktop. El carrito ya no desaparece al abrir "Cobrar". Mobile sin cambios (sigue apilado en una columna). Verificado con geometría real del DOM en 1440px y 390px.

## ✅ Completado 2026-07-15 — 5 páginas con el mismo problema de ancho que el POS

`CustomersPage`, `DocumentsPage`, `PromotionsPage`, `PurchaseOrdersPage`, `SuppliersPage` tenían su contenedor raíz con `max-w-5xl`/`max-w-6xl mx-auto` (además de un `p-6` redundante, ya que `AppLayout` pone `p-4 sm:p-6` alrededor de `<Outlet />`) — la tabla completa quedaba centrada y angosta en pantallas anchas. Se quitó el cap en las 5, siguiendo el mismo patrón ya correcto de Inventario/Sucursales/Usuarios (`className="space-y-6"`, sin padding ni max-width propios).

## ✅ Completado 2026-07-15 — Bug de React en Auditoría

`AuditPage.tsx` usaba un fragment `<>...</>` sin `key` dentro de un `.map()` (el `key` estaba puesto en el `<tr>` hijo, no en el fragment en sí) — generaba un warning de React en cada carga de la pantalla. Cambiado a `<Fragment key={log.id}>`. Encontrado durante la prueba en vivo de todos los módulos, no en la lectura de código original.

## P2 — Consistencia de producto / UX (sin resolver)

- Unificar el sistema de color de acento (`indigo-*` vs `primary-*`, ver `DESIGN_SYSTEM.md`).
- `size`/`color` de variante: Zod los exige pero el service nunca los persiste; el modal de UI con atributos flexibles activados no completa `ProductVariantAttribute` correctamente (solo la importación CSV lo hace bien) — ver `modules/Products.md`.
- Exportaciones de Inventario deberían respetar los filtros activos de pantalla.
- Migrar `CustomersPage.tsx`/`AuditPage.tsx` a `authFetch` (hoy usan `fetch()` crudo, sin manejo de sesión expirada).
- Completar labels faltantes de `InventoryMovementType` (`SALE_RETURN`, `DOCUMENT_OUT`, `PURCHASE_RECEIVE`).
- Estados de enum inalcanzables a limpiar o implementar: `PurchaseOrderStatus.SENT`, `StockTransferStatus.IN_TRANSIT`/`CANCELLED` (sin flujo ni endpoint de cancelación de traspaso).
- `DocumentService.update()` es código muerto (guard `status==="DRAFT"` nunca se cumple porque `create()` fuerza `ISSUED`) — decidir si se habilita edición real de borradores o se elimina el endpoint.
- `taxAmount` nunca se pasa al asiento de compra — la línea de IVA Crédito Fiscal en `auto-journal.service.ts` es código muerto en la práctica.
- `PUT /purchase-orders/:id` permite forzar `status` a `RECEIVED` sin pasar por `/receive`, sin tocar inventario ni disparar el asiento.
- Truncamiento de decimales en la recepción de OC (`Math.floor`), pese a que el schema soporta cantidades fraccionarias.

## P4 — Deuda de producto/negocio a decidir (no técnica)

- Deploy a producción: elegir hosting (Railway vs Render+Vercel), pendiente de decisión del usuario.
- Evaluar si vincular `Sale.documentId` a un flujo real ("una venta genera su comprobante automáticamente") es una prioridad de producto.
- Evaluar si conviene mover `AuditLog` a cubrir más entidades (hoy solo Login/Sale/User pese a que el modelo y la UI de filtros ya contemplan Product/Transfer/Employee/Payroll/Document).

## Cómo se prioriza en este roadmap

El item de Compras (arriba) es P0 porque, igual que la brecha de permisos, es una promesa de arquitectura incumplida: el módulo existe específicamente para mover stock y contabilidad, y su flujo más obvio no lo hace, en silencio. La brecha de permisos y los bugs de integridad ya resueltos eran P0/P1 por la misma razón (no features faltantes, comportamiento que contradice lo que el sistema declara hacer). P2 es consistencia que mejora mantenibilidad pero no rompe nada hoy. P4 requiere una decisión de negocio antes de tener sentido técnico.
