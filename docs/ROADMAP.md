# ROADMAP

Consolidado desde `MEJORAS-FUTURAS.md` (histórico) más los hallazgos de la ronda de documentación completa y de las pruebas end-to-end de los 20 módulos hechas en el navegador real (2026-07-15). Prioridad asignada por impacto real, no por preferencia estética.

## ✅ Completado 2026-07-15 — Compras no movía stock ni contabilidad si se creaba a mano

**Confirmado end-to-end** probando el módulo en el navegador con datos reales: el formulario "Nueva orden" armaba cada ítem solo con `description`/`quantity`/`unitPrice` — **nunca asignaba `variantId`** (no había buscador de producto, era texto libre real). `PurchaseOrderService.receive()` ignora en silencio cualquier ítem sin `variantId`. Resultado: una OC creada por ese formulario, al "recibirse", devolvía `200 OK`, la UI no mostraba ningún error, pero **no actualizaba inventario ni generaba asiento contable** — se verificó creando una OC de $1.000 y recibiéndola dos veces: `received` quedó en `0` en la base, sin `InventoryMovement` ni `JournalEntry`.

**Fix**: se agregó un buscador de producto real al campo de descripción de cada ítem (debounced, mismo patrón que `CustomerSearchInput` del POS), que liga `variantId` de verdad y avisa visualmente si un ítem quedó sin vincular. De paso se encontró y corrigió un bug de API: `GET /products?search=X` ignora el filtro `search` si no se manda también `page` (cae a la rama sin filtrar). **Re-verificado end-to-end tras el fix**: OC de $400 (8 unidades) vinculada a una variante real, recibida, generó correctamente el movimiento de inventario (stock 55→63) y el asiento contable ($400/$400). Ver `modules/Purchases.md`.

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

## ✅ Completado 2026-07-15 — P2: labels, export filtrado, authFetch, color único

Ver commit correspondiente: `MOVEMENT_TYPE_LABELS` completo, exportar Stock respeta filtros (`lowStockOnly` aplicado client-side), `CustomersPage`/`AuditPage` migradas a `authFetch`, y el color de acento unificado a `indigo-*` (se eliminó el token `primary-*` de `tailwind.config.cjs`, usado en ~17 archivos incluyendo componentes compartidos). Ver `DESIGN_SYSTEM.md`.

## ✅ Completado 2026-07-15 — P2: impuesto en compras, recepción fraccionaria, status restringido

Los tres tocaban `purchase-order.service.ts`, se hicieron juntos:

- **`taxAmount` nunca se pasaba al asiento de compra**: no era solo un bug de wiring — `PurchaseOrderItem` no tenía ningún campo de impuesto en el schema (a diferencia de `DocumentItem`, que sí). Se agregó `taxConfigId`/`taxAmount` (migración `20260715172844_add_purchase_order_item_tax`), se agregó un selector de impuesto al formulario "Nueva orden" (oculto si la empresa no tiene ningún `TaxConfig` cargado — no existe pantalla para crear uno, es un hueco de UX que queda pendiente), y `create()`/`receive()` calculan el impuesto real. **Verificado end-to-end**: OC de $1.000 + IVA 21% ($210) = $1.210, recibida parcialmente (4.5 de 10 unidades), generó un asiento con 3 líneas balanceadas (Mercaderías $450, IVA CF $94.5, Proveedores $544.5).
- **Truncamiento de decimales en la recepción**: `receive()` ya no usa `Math.floor()` — acepta cantidades fraccionarias en `PurchaseOrderItem.received`. Se descubrió en el camino que `Inventory.quantity`/`InventoryMovement` son `Int` (no `Decimal`) — todo el ledger de stock de la app, no solo Compras, no soporta unidades fraccionarias — así que el stock real redondea al entero más cercano aunque `received` guarde el valor exacto. Cambiar eso sería una migración mucho más grande (toca Sales/Transfers/StockCounts), no se hizo.
- **`PUT /purchase-orders/:id` permitía forzar `status` a `RECEIVED`**: ahora solo acepta `DRAFT`/`SENT`/`CANCELLED` por esa vía.

## ✅ Completado 2026-07-15 — P2: cancelación real de traspasos + DocumentService.update()

- **`StockTransferStatus.CANCELLED` inalcanzable**: se agregó `POST /stock-transfers/:id/cancel` (solo para `PENDING`, no toca inventario porque `PENDING` nunca lo tocó). Botón "Cancelar" agregado a `TransfersPage.tsx` para filas `PENDING`. **Verificado en el navegador**: canceló el traspaso #1 (`Pending` → `Cancelado`), botón desaparece correctamente después. `PurchaseOrderStatus.SENT` y `StockTransferStatus.IN_TRANSIT` quedan sin resolver — ver `modules/Transfers.md` y `modules/Purchases.md`, son decisiones de flujo de negocio, no bugs mecánicos.
- **`DocumentService.update()` código muerto**: exigía `status==="DRAFT"` pero `create()` nunca deja un documento en `DRAFT` — inalcanzable. Se relajó a bloquear solo `CANCELLED` (los campos que edita — `notes`/`dueDate`/`customerId` — no afectan totales ni stock). **Verificado con script**: crear + editar un documento `ISSUED` funciona. Sigue sin existir ningún botón en `DocumentsPage.tsx` que llame a este endpoint — el fix corrige el código, no agrega la UI (nadie la pidió).

## ✅ Completado 2026-07-15 — P2: persistencia de size/color/atributos flexibles de variante

`size`/`color` pasaron a opcionales en Zod y `ProductService` ahora los persiste de verdad (antes la validación los exigía pero el service nunca los escribía a la base). `VariantManager.tsx`/`ProductFormModal.tsx` se reescribieron para manejar `attributes` como array real (`{attributeId, value}[]`) en vez del blob JSON metido en el campo `size` que nunca llegaba a la base. Se encontró y corrigió además un segundo bug: `updateProductController` omitía `attributes` al armar el payload hacia el service (sí lo pasaba en creación, no en edición) — el `PATCH` devolvía `200 OK` pero no guardaba el atributo. **Verificado end-to-end en el navegador + query directa a la base** los 4 casos (crear/editar × legacy/flexible). Ver `modules/Products.md` para el detalle y una nota de UX encontrada en vivo (el modo legacy/flexible es una decisión a nivel empresa, no por producto).

## P2 — Consistencia de producto / UX (sin resolver)

- No existe ninguna pantalla para administrar `TaxConfig` (crear/editar tasas de impuesto) — el CRUD backend existe pero ni Documents ni Purchases (ambos con selector de impuesto en la UI) tienen forma de cargar uno sin ir directo a la API.
- `PurchaseOrderStatus.SENT` sigue sin ningún flujo que lo alcance.
- `StockTransferStatus.IN_TRANSIT` sigue sin usarse (requeriría un paso intermedio real en el flujo de traspasos).

## P4 — Deuda de producto/negocio a decidir (no técnica)

- Deploy a producción: elegir hosting (Railway vs Render+Vercel), pendiente de decisión del usuario.
- Evaluar si vincular `Sale.documentId` a un flujo real ("una venta genera su comprobante automáticamente") es una prioridad de producto.
- Evaluar si conviene mover `AuditLog` a cubrir más entidades (hoy solo Login/Sale/User pese a que el modelo y la UI de filtros ya contemplan Product/Transfer/Employee/Payroll/Document).

## Cómo se prioriza en este roadmap

Todo lo marcado "P0"/"P1" y ya resuelto lo era por la misma razón: no features faltantes, sino comportamiento que contradice lo que el sistema declara hacer (permisos que no se exigen, plata mal contabilizada, un módulo que no mueve stock pese a que existe para eso). P2 es consistencia que mejora mantenibilidad pero no rompe nada hoy. P4 requiere una decisión de negocio antes de tener sentido técnico. **Con el fix de Compras, no queda ningún item P0/P1 abierto** — todo lo pendiente en este documento es P2 (consistencia) o P4 (decisión de negocio).
