# ROADMAP

Consolidado desde `MEJORAS-FUTURAS.md` (histórico) más los hallazgos nuevos de esta ronda de documentación completa (todos los módulos, `docs/modules/`). Prioridad asignada por impacto real encontrado en código, no por preferencia estética.

## P0 — Seguridad (server-authoritative real) — ✅ COMPLETADO 2026-07-15

`requirePermission(key)` agregado en todos los routers que solo tenían `authMiddleware` o `requireRole` genérico: Productos/Atributos (`PRODUCTS_WRITE`/`PRODUCTS_DELETE`), Inventario/Conteos (`INVENTORY_WRITE`), Clientes (`CUSTOMERS_WRITE`), Proveedores (`SUPPLIERS_WRITE`), Compras (`PURCHASES_MANAGE`, incluye también `/analytics/reorder-suggestions/create-po`), Documentos (`DOCUMENTS_WRITE`), Traspasos (`requireRole` → `requirePermission("TRANSFERS_APPROVE")`), Reportes (`requireRole` → `requirePermission("REPORTS_VIEW")`).

Usuarios/Sucursales fue el caso no trivial: `USERS_MANAGE`/`SETTINGS_MANAGE` no estaban en los defaults de MANAGER pese a que `requireRole(["OWNER","MANAGER"])` ya le daba acceso. Agregar `requirePermission` directamente habría revocado el acceso a todo MANAGER de golpe. Se agregaron ambos permisos a `ROLE_DEFAULTS.MANAGER` (backend `permission.service.ts` y su espejo en `AuthContext.tsx`) para preservar el comportamiento actual, y recién ahí se reemplazó `requireRole` por `requirePermission` — ahora revocar el permiso a un MANAGER específico sí tiene efecto real (antes no lo tenía, ver hallazgo en `modules/Users.md`). También se corrigió `canManageUsers`/`canManageBranches` en `AuthContext.tsx`, que estaban hardcodeados a `role === "OWNER" || "MANAGER"` en vez de derivar de `hasPermission()`.

## P1 — Bugs de integridad de datos/contable — ✅ COMPLETADO 2026-07-15

- **Doble asiento contable en recepción parcial de OC**: corregido. `PurchaseOrderService.receive()` ahora calcula y devuelve `receivedAmount` (suma de `qty × unitPrice` de los ítems recibidos en esa llamada específica), y el router pasa ese monto a `onPurchaseReceived` en vez de `order.total`.
- **`ILIKE` en query MySQL** (`inventory.service.ts`): cambiado a `LIKE` (case-insensitive por default en las collations típicas de MySQL, equivalente en la práctica).
- **Límite de sucursales no libera cupo al eliminar**: `checkBranchLimit` y `getPlanUsage` ahora filtran `isActive: true`, igual que `checkUserLimit`.
- **`ARStatus.OVERDUE` inalcanzable** — ✅ resuelto 2026-07-15: nuevo cron diario (`accounts-receivable.service.ts#markOverdue`, corre 00:30) marca `OVERDUE` toda AR con `dueDate` vencido y saldo pendiente (`PENDING`/`PARTIAL`). El filtro "Vencida" de Cuentas corrientes ahora sí trae resultados.
- **Falta de asiento contable al cobrar una cuenta por cobrar** — ✅ resuelto 2026-07-15: `AutoJournalService.onARPayment` (Debe Caja/Banco, Haber Deudores por Ventas) se dispara al confirmar un pago (`addARPaymentController`). Nota de implementación: `JournalSource` no tiene un valor dedicado para cobros de cuenta corriente — se reusó `SALE` con `reference: "AR-PAY-<id>"` para no requerir una migración de schema; si se necesita reportar cobros de cta. cte. por separado de ventas, ahí sí vale la pena agregar un valor `RECEIVABLE_PAYMENT` al enum.

## P3 — Deuda pendiente identificada en esta ronda

- `accounts-receivable.router.ts` no tiene ningún `PermissionKey` propio ni `requirePermission` — a diferencia de los módulos corregidos en el P0 anterior, este no tenía una clave de permiso definida para reusar (agregarla requiere migración de schema: nuevo valor de `PermissionKey`). Evaluar si conviene agregar `ACCOUNTS_RECEIVABLE_MANAGE` en una futura migración.

## P2 — Consistencia de producto / UX

- Unificar el sistema de color de acento (`indigo-*` vs `primary-*`, ver `DESIGN_SYSTEM.md`).
- `size`/`color` de variante: Zod los exige pero el service nunca los persiste; el modal de UI con atributos flexibles activados no completa `ProductVariantAttribute` correctamente (solo la importación CSV lo hace bien) — ver `modules/Products.md`.
- Exportaciones de Inventario deberían respetar los filtros activos de pantalla.
- Migrar `CustomersPage.tsx`/`AuditPage.tsx` a `authFetch` (hoy usan `fetch()` crudo, sin manejo de sesión expirada).
- Completar labels faltantes de `InventoryMovementType` (`SALE_RETURN`, `DOCUMENT_OUT`, `PURCHASE_RECEIVE`).
- Estados de enum inalcanzables a limpiar o implementar: `PurchaseOrderStatus.SENT`, `StockTransferStatus.IN_TRANSIT`/`CANCELLED` (sin flujo ni endpoint de cancelación de traspaso).
- `DocumentService.update()` es código muerto (guard `status==="DRAFT"` nunca se cumple porque `create()` fuerza `ISSUED`) — decidir si se habilita edición real de borradores o se elimina el endpoint.

## P3 — Deuda de producto/negocio a decidir (no técnica)

- Deploy a producción: elegir hosting (Railway vs Render+Vercel), pendiente de decisión del usuario — no se avanza sin esa decisión.
- Evaluar si vincular `Sale.documentId` a un flujo real ("una venta genera su comprobante automáticamente") es una prioridad de producto.
- Evaluar si conviene mover `AuditLog` a cubrir más entidades (hoy solo Login/Sale/User pese a que el modelo y la UI de filtros ya contemplan Product/Transfer/Employee/Payroll/Document).

## Cómo se prioriza en este roadmap

P0 es lo único que representa una brecha entre lo que el proyecto declara como principio (`PROJECT.md`: "los permisos son server-authoritative") y lo que el código realmente hace — se prioriza primero porque no es una feature faltante, es una promesa de arquitectura incumplida. P1 son bugs con impacto de datos reales (plata mal contabilizada, límites de plan rotos). P2 es consistencia que mejora mantenibilidad pero no rompe nada hoy. P3 requiere una decisión de negocio antes de tener sentido técnico.
