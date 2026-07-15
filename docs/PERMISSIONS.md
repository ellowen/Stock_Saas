# PERMISSIONS — Roles y permisos granulares

Fuente de verdad en código: `backend/src/application/permissions/permission.service.ts` (lógica), `backend/prisma/schema.prisma` (enum `PermissionKey`, modelo `UserPermission`), `frontend/src/contexts/AuthContext.tsx` (espejo cliente-side).

## Modelo mental

Hay **3 roles fijos** y un **sistema de overrides por usuario** encima. No hay 4 tiers fijos tipo "Cashier/Supervisor/Manager/Admin" — eso se logra combinando rol + overrides.

```
Permiso efectivo de un usuario =
  ROLE_DEFAULTS[su rol]
  + permisos que tiene un UserPermission con granted=true (agrega)
  − permisos que tiene un UserPermission con granted=false (revoca)

OWNER siempre tiene todo, ignora overrides (PermissionService.hasPermission early-return).
```

## Roles (`UserRole`)

| Rol | Uso típico |
|---|---|
| `OWNER` | Dueño de la empresa. Bypassa todo chequeo de permiso. |
| `MANAGER` | Encargado de sucursal/negocio. Casi todo excepto gestión de usuarios/empresa. |
| `SELLER` | Cajero. Permisos mínimos por defecto: vender, ver clientes, generar documentos. |

## Todos los permisos (`PermissionKey`, 20 claves)

| Clave | Qué habilita | OWNER default | MANAGER default | SELLER default |
|---|---|:-:|:-:|:-:|
| `PRODUCTS_WRITE` | Crear/editar productos | ✅ | ✅ | ❌ |
| `PRODUCTS_DELETE` | Eliminar productos | ✅ | ✅ | ❌ |
| `INVENTORY_WRITE` | Ajustar cantidades de stock | ✅ | ✅ | ❌ |
| `SALES_VOID` | Anular ventas | ✅ | ✅ | ❌ |
| `SALES_HISTORY` | Ver historial de ventas (todas, no solo propias) | ✅ | ✅ | ✅ |
| `SALES_DISCOUNT` | Aplicar descuentos manuales en el POS (por línea o global) | ✅ | ✅ | ❌ |
| `SALES_PRICE_OVERRIDE` | Reemplazar el precio de una línea en el POS | ✅ | ✅ | ❌ |
| `TRANSFERS_APPROVE` | Aprobar traspasos de stock entre sucursales | ✅ | ✅ | ❌ |
| `EMPLOYEES_VIEW` | Ver empleados y sueldos | ✅ | ✅ | ❌ |
| `EMPLOYEES_WRITE` | Gestionar empleados y sueldos | ✅ | ❌ | ❌ |
| `ACCOUNTING_VIEW` | Ver contabilidad | ✅ | ✅ | ❌ |
| `ACCOUNTING_WRITE` | Crear asientos contables | ✅ | ❌ | ❌ |
| `REPORTS_VIEW` | Ver reportes | ✅ | ✅ | ❌ |
| `USERS_MANAGE` | Gestionar usuarios | ✅ | ❌ | ❌ |
| `SETTINGS_MANAGE` | Configurar la empresa | ✅ | ❌ | ❌ |
| `AUDIT_VIEW` | Ver el log de auditoría | ✅ | ❌ | ❌ |
| `CUSTOMERS_WRITE` | Crear/editar clientes | ✅ | ✅ | ✅ |
| `SUPPLIERS_WRITE` | Crear/editar proveedores | ✅ | ✅ | ❌ |
| `DOCUMENTS_WRITE` | Crear/editar documentos (facturas/remitos) | ✅ | ✅ | ✅ |
| `PURCHASES_MANAGE` | Gestionar órdenes de compra | ✅ | ✅ | ❌ |

`SALES_DISCOUNT` y `SALES_PRICE_OVERRIDE` se agregaron el 2026-07-11 (rediseño del POS) — antes cualquier `SELLER` podía aplicar descuentos y no existía price override como feature.

## Dónde se aplica

**Backend (autoritativo, siempre)**:
- Middleware `requirePermission(key)` en el router, para acciones que siempre requieren el permiso (crear producto, crear promoción, etc.).
- Chequeo inline dentro del controller cuando el permiso solo aplica *condicionalmente* según el contenido del request — ej. `sales.controller.ts` solo exige `SALES_DISCOUNT` si el body trae `discount > 0` en algún ítem, y `SALES_PRICE_OVERRIDE` solo si trae `unitPriceOverride`. Una venta sin descuentos no necesita ningún permiso especial.

**Frontend (solo UX, nunca la única barrera)**:
- `AuthContext.hasPermission(key)` — hook disponible en toda la app vía `useAuth()`.
- `AppLayout.tsx` filtra el menú lateral: cada `navItem` puede declarar `permission?: string`; si el usuario no lo tiene, el ítem no se renderiza (no es "deshabilitado", directamente no existe en el DOM).
- Dentro de una pantalla, un permiso ausente típicamente oculta el control (ej. el input de descuento en el POS no se muestra) en vez de deshabilitarlo — más simple, pero significa que a veces el usuario no entiende *por qué* no ve una opción. Ver `ux/permissions-ux.md` (pendiente) para el patrón recomendado (deshabilitado + tooltip explicando qué falta, usado ya en `PaymentPanel` para "cuenta corriente sin cliente seleccionado").

## Cómo se otorgan/revocan permisos individuales

`PermissionService.setPermissions(userId, role, grants[])` reemplaza todos los overrides de un usuario de una sola vez: compara `grants` contra los defaults del rol y solo persiste las *diferencias* (no guarda filas redundantes para lo que ya es default). Endpoint: `GET/PUT /permissions/users/:id` (confirmar exact verb en `permissions.router.ts` al escribir `modules/Users.md`).

## Extender el sistema

Agregar un permiso nuevo:
1. Migración Prisma: agregar el valor al enum `PermissionKey` (aditivo, no rompe nada existente).
2. `permission.service.ts`: agregar a `ALL_PERMISSIONS`, `ROLE_DEFAULTS` (decidir qué rol lo tiene por defecto), `PERMISSION_LABELS`, y a un grupo en `PERMISSION_GROUPS`.
3. `frontend/src/contexts/AuthContext.tsx`: espejar en `ROLE_DEFAULT_PERMISSIONS` (fallback usado antes de que responda la API — debe coincidir con el backend o el usuario ve un parpadeo de permisos incorrectos al cargar).
4. Aplicar el gate donde corresponda (frontend: ocultar control; backend: `requirePermission` o chequeo inline).

Ejemplo real de este flujo completo: commit que agregó `SALES_DISCOUNT`/`SALES_PRICE_OVERRIDE` (2026-07-11).
