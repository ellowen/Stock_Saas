# SECURITY — Estado real de la seguridad de acceso

Este documento es el más importante del set: durante la investigación de todos los módulos (ver `docs/modules/`) apareció el mismo patrón una y otra vez. Se documenta acá de forma centralizada porque es un problema transversal, no de un módulo aislado.

## Hallazgo principal: los permisos granulares son cosméticos en la mayoría del backend

El sistema de permisos (`PermissionKey`, 20 valores, ver `PERMISSIONS.md`) está bien diseñado: roles + overrides por usuario, con una UI de gestión completa (`UsersPage.tsx` → modal de permisos). El problema es la **cobertura de enforcement en el backend**, verificado leyendo cada router:

### Correctamente protegidos con `requirePermission(key)` (autoritativo, server-side)
- Empleados/Sueldos: `EMPLOYEES_VIEW`/`EMPLOYEES_WRITE` (`employees.router.ts`, `payrolls.router.ts`)
- Contabilidad: `ACCOUNTING_VIEW` (`journal.router.ts`, `accounting-reports.router.ts`)
- Promociones: `PRODUCTS_WRITE` (`promotions.router.ts`)
- Ventas: `SALES_DISCOUNT`/`SALES_PRICE_OVERRIDE` chequeados **inline** en el controller, condicionados al contenido del request (correcto, ver `PERMISSIONS.md`)

### Protegidos solo por rol (`requireRole`), no por el permiso granular que la UI expone
- Usuarios, Sucursales: `requireRole(["OWNER","MANAGER"])`, ignoran cualquier override de `USERS_MANAGE`/`SETTINGS_MANAGE`
- Traspasos: `requireRole(["OWNER","MANAGER"])`, ignora `TRANSFERS_APPROVE` — un SELLER con el permiso concedido no puede operar; un MANAGER con el permiso revocado igual puede
- Reportes: `requireRole(["OWNER","MANAGER"])`, ignora `REPORTS_VIEW`

### Sin ninguna protección más allá de estar logueado (`authMiddleware` solo)
Productos (`PRODUCTS_WRITE`/`PRODUCTS_DELETE`), Inventario y conteos de stock (`INVENTORY_WRITE`), Clientes (`CUSTOMERS_WRITE`), Proveedores (`SUPPLIERS_WRITE`), Compras (`PURCHASES_MANAGE`), Documentos (`DOCUMENTS_WRITE`), Atributos/perfiles de industria, Cuentas por cobrar (ni siquiera tiene `PermissionKey` propio).

**Impacto concreto**: hoy, un usuario `SELLER` autenticado — sin ningún override — puede llamar directamente `POST /inventory/adjust`, `DELETE /customers/:id`, `POST /purchase-orders/:id/receive` o `POST /documents` vía API (curl, Postman, devtools), sin que el servidor lo bloquee. La única barrera es que el frontend no muestra el botón. Esto no es un problema teórico: es la definición exacta de "seguridad solo del lado del cliente", que este mismo proyecto declara como principio a evitar (`PROJECT.md`: "los permisos son server-authoritative... nunca es solo cosmético" — hoy ese principio **no se cumple** para la mayoría de los módulos).

**Prioridad de remediación sugerida** (no implementado, solo documentado — el mega-brief pide documentar antes de tocar código): agregar `requirePermission(key)` en cada router listado arriba, usando exactamente el mismo patrón que ya existe y funciona en `employees.router.ts`/`promotions.router.ts`. Es mecánico, bajo riesgo, y cierra la brecha real más grande del sistema.

## Multi-tenancy: aislamiento por código, no por base de datos

No hay Row Level Security en MySQL. Cada modelo tiene `companyId`, y cada query en `application/*` debe incluirlo en su `where`. **No hay un mecanismo automático que lo garantice** (ej. un middleware de Prisma que inyecte `companyId` en todo query) — depende de que cada desarrollador lo recuerde en cada service nuevo. Un `findMany` sin `companyId` filtraría entre tenants. Riesgo real a vigilar en cada PR nuevo, no encontrado como bug activo en esta ronda de investigación pero es la clase de bug más peligrosa posible en un SaaS multi-tenant.

## Autenticación

JWT access token (15 min) + refresh token (7 días). Reset de contraseña vía token de un solo uso (`PasswordResetToken`) + email (Nodemailer). No se investigó en esta ronda si el refresh token rota en cada uso o es reusable hasta expirar — pendiente de confirmar antes de escribir `architecture/authentication.md` en detalle.

## Otros hallazgos de seguridad de esta ronda

- **Webhooks de billing** (`POST /billing/webhook/stripe`, `/webhook/mp`) son rutas públicas por necesidad (así funcionan los webhooks), pero Stripe **sí verifica firma** (confirmado, usa el secret de webhook); no se confirmó en esta ronda si el webhook de MercadoPago hace verificación equivalente — a confirmar.
- `SettingsPage.tsx`, tab Company: los inputs de datos de empresa no tienen `disabled` para no-OWNER (solo el botón Guardar está gateado) — no es una falla de seguridad real (el PUT exige `role==="OWNER"` en el backend), pero es una inconsistencia de UX que puede confundir a un MANAGER pensando que guardó cambios que en realidad el backend rechazó.
