# SECURITY — Estado real de la seguridad de acceso

Este documento es el más importante del set: durante la investigación de todos los módulos (ver `docs/modules/`) apareció el mismo patrón una y otra vez. Se documenta acá de forma centralizada porque es un problema transversal, no de un módulo aislado.

## Hallazgo principal: los permisos granulares eran cosméticos en la mayoría del backend — ✅ cerrado 2026-07-15

El sistema de permisos (`PermissionKey`, 20 valores, ver `PERMISSIONS.md`) está bien diseñado: roles + overrides por usuario, con una UI de gestión completa (`UsersPage.tsx` → modal de permisos). El problema detectado al documentar cada módulo era la **cobertura de enforcement en el backend** — resuelto agregando `requirePermission(key)` en cada router que le faltaba, usando el mismo patrón ya correcto de `employees.router.ts`/`promotions.router.ts`:

### Corregidos en esta ronda (antes solo `authMiddleware` o `requireRole` genérico)
- Productos/Atributos: `PRODUCTS_WRITE`/`PRODUCTS_DELETE`
- Inventario y conteos de stock: `INVENTORY_WRITE`
- Clientes: `CUSTOMERS_WRITE` · Proveedores: `SUPPLIERS_WRITE`
- Compras: `PURCHASES_MANAGE` (incluye también el endpoint de creación de OC desde sugerencias de reposición en Reports)
- Documentos: `DOCUMENTS_WRITE`
- Traspasos: `requireRole` → `requirePermission("TRANSFERS_APPROVE")`
- Reportes: `requireRole` → `requirePermission("REPORTS_VIEW")`
- Usuarios/Sucursales: `requireRole` → `requirePermission("USERS_MANAGE"/"SETTINGS_MANAGE")` — este caso no fue mecánico: esos dos permisos no estaban en los defaults de MANAGER pese a que `requireRole(["OWNER","MANAGER"])` ya le daba acceso. Se agregaron a `ROLE_DEFAULTS.MANAGER` (backend y su espejo `AuthContext.tsx`) antes de exigir el permiso, para no revocarle el acceso a todo MANAGER existente de golpe.

### Ya estaban bien protegidos (sin cambios)
Empleados/Sueldos (`EMPLOYEES_VIEW`/`EMPLOYEES_WRITE`), Contabilidad (`ACCOUNTING_VIEW`), Promociones (`PRODUCTS_WRITE`), Ventas (`SALES_DISCOUNT`/`SALES_PRICE_OVERRIDE` inline en el controller).

### Cuentas por cobrar — ✅ cerrado 2026-07-15 (P3)
No tenía ninguna clave de permiso definida en el sistema — a diferencia de los módulos de arriba, no había nada que reusar. Se agregó `ACCOUNTS_RECEIVABLE_MANAGE` vía migración de schema (`20260715120206_add_accounts_receivable_permission`), default `true` en los 3 roles para preservar el acceso que ya existía, aplicado en `POST /` y `POST /:id/pay`.

**Impacto de lo corregido**: antes, un `SELLER` autenticado sin overrides podía llamar directamente `POST /inventory/adjust`, `DELETE /customers/:id`, `POST /purchase-orders/:id/receive` o `POST /documents` vía API sin que el servidor lo bloqueara — la única barrera era que el frontend no mostraba el botón. Ahora el servidor rechaza esas llamadas con 403 si el permiso no está presente, cumpliendo el principio que el propio proyecto declara (`PROJECT.md`: "los permisos son server-authoritative... nunca es solo cosmético").

## Multi-tenancy: aislamiento por código, no por base de datos

No hay Row Level Security en MySQL. Cada modelo tiene `companyId`, y cada query en `application/*` debe incluirlo en su `where`. **No hay un mecanismo automático que lo garantice** (ej. un middleware de Prisma que inyecte `companyId` en todo query) — depende de que cada desarrollador lo recuerde en cada service nuevo. Un `findMany` sin `companyId` filtraría entre tenants. Riesgo real a vigilar en cada PR nuevo, no encontrado como bug activo en esta ronda de investigación pero es la clase de bug más peligrosa posible en un SaaS multi-tenant.

## Autenticación

JWT access token (15 min) + refresh token (7 días). Reset de contraseña vía token de un solo uso (`PasswordResetToken`) + email (Nodemailer). No se investigó en esta ronda si el refresh token rota en cada uso o es reusable hasta expirar — pendiente de confirmar antes de escribir `architecture/authentication.md` en detalle.

## Otros hallazgos de seguridad de esta ronda

- **Webhooks de billing** (`POST /billing/webhook/stripe`, `/webhook/mp`) son rutas públicas por necesidad (así funcionan los webhooks), pero Stripe **sí verifica firma** (confirmado, usa el secret de webhook); no se confirmó en esta ronda si el webhook de MercadoPago hace verificación equivalente — a confirmar.
- `SettingsPage.tsx`, tab Company: los inputs de datos de empresa no tienen `disabled` para no-OWNER (solo el botón Guardar está gateado) — no es una falla de seguridad real (el PUT exige `role==="OWNER"` en el backend), pero es una inconsistencia de UX que puede confundir a un MANAGER pensando que guardó cambios que en realidad el backend rechazó.
