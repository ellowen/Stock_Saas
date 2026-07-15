# NAVIGATION — Menú y rutas

Fuente de verdad: `frontend/src/layout/AppLayout.tsx` (array `navItems`) y `frontend/src/App.tsx` (rutas React Router).

## Menú lateral (orden real, no alfabético)

| # | Ítem (label es/en) | Ruta | Ícono | Permiso requerido |
|---|---|---|---|---|
| 1 | Inicio / Home | `/app/dashboard` | `IconHome` | ninguno (todos) |
| 2 | Inventario / Inventory | `/app/inventory` | `IconPackage` | ninguno |
| 3 | Promociones / Promotions | `/app/promotions` | `IconTag` | `PRODUCTS_WRITE` |
| 4 | Ventas / Sales | `/app/sales` | `IconShoppingCart` | ninguno |
| 5 | Traspasos / Transfers | `/app/transfers` | `IconTransfer` | `TRANSFERS_APPROVE` |
| 6 | Documentos / Documents | `/app/documents` | `IconDocument` | `DOCUMENTS_WRITE` |
| 7 | Clientes / Customers | `/app/customers` | `IconUserCircle` | `CUSTOMERS_WRITE` |
| 8 | Proveedores / Suppliers | `/app/suppliers` | `IconTruck` | `SUPPLIERS_WRITE` |
| 9 | Compras / Purchases | `/app/purchases` | `IconClipboardList` | `PURCHASES_MANAGE` |
| 10 | Cta. corriente / Accounts | `/app/accounts` | `IconCurrency` | `SALES_HISTORY` |
| 11 | Empleados / Employees | `/app/employees` | `IconBriefcase` | `EMPLOYEES_VIEW` |
| 12 | Sueldos / Payroll | `/app/payroll` | `IconCash` | `EMPLOYEES_VIEW` |
| 13 | Contabilidad / Accounting | `/app/accounting` | `IconBook` | `ACCOUNTING_VIEW` |
| 14 | Reportes / Reports | `/app/reports` | `IconChart` | `REPORTS_VIEW` |
| 15 | Sucursales / Branches | `/app/branches` | `IconBuilding` | `SETTINGS_MANAGE` |
| 16 | Usuarios / Users | `/app/users` | `IconUsers` | `USERS_MANAGE` |
| 17 | Plan | `/app/plan` | `IconCurrency` | `SETTINGS_MANAGE` |
| 18 | Auditoría / Audit | `/app/audit` | `IconShield` | `AUDIT_VIEW` |

Notas sobre esta tabla:
- **Un permiso ausente = el ítem no está en el menú**, no aparece deshabilitado. Un `SELLER` sin overrides ve en la práctica solo: Inicio, Inventario, Ventas, Clientes, Documentos.
- **Ventas y Documentos usan permisos distintos** (`SALES_HISTORY`/ninguno vs `DOCUMENTS_WRITE`) aunque comparten cliente/producto — son módulos separados intencionalmente.
- **Plan e ícono repetido**: `IconCurrency` se usa tanto para "Cta. corriente" como para "Plan" — mismo ícono, dos conceptos distintos (ver "Problemas conocidos" abajo).

## Rutas que NO están en el menú lateral (acceso directo o por otro camino)

| Ruta | Página | Cómo se llega |
|---|---|---|
| `/app/settings` | SettingsPage | Ícono aparte en el header/avatar, no en el sidebar principal |
| `/app` | redirect a `/app/dashboard` | — |

## Rutas públicas (fuera de `/app`, sin auth)

| Ruta | Página |
|---|---|
| `/` | LandingPage |
| `/login` | LoginPage |
| `/register` | RegisterPage (alta en 3 pasos: empresa → cuenta → confirmación) |
| `/forgot-password` | ForgotPasswordPage |
| `/reset-password` | ResetPasswordPage (con token por query string) |
| `*` | redirect a `/` |

## Cómo se decide qué mostrar (mecánica real)

`AppLayout.tsx` filtra `navItems` con `hasPermission(item.permission)` de `AuthContext` antes de mapearlos a `<NavLink>`. `AuthContext` carga los permisos efectivos del usuario en `loadPermissions()`:
- Si `role === "OWNER"` → todos los permisos, sin llamar a la API.
- Si no, llama a `GET /permissions/users/:id` y usa `effective` de cada permiso devuelto.
- Si la llamada falla, cae a un fallback local `ROLE_DEFAULT_PERMISSIONS` (solo los defaults del rol, sin overrides) — un usuario con overrides especiales vería temporalmente menos/más de lo que le corresponde si esa llamada falla. Ver `PERMISSIONS.md`.

## Problemas conocidos / a revisar

- **Ícono compartido** entre "Cta. corriente" y "Plan" (`IconCurrency` en ambos) — visualmente ambiguo en el sidebar colapsado (solo íconos). Sugerido: ícono dedicado para Plan (ej. una tarjeta o un check de suscripción).
- **Settings no está en el sidebar principal** — para un usuario nuevo no es obvio dónde configurar la empresa o el checkbox de asientos automáticos (ver `modules/Settings.md`). Vale la pena evaluar si merece un ítem propio o si el patrón actual (acceso aparte) es intencional y solo falta un indicador visual más claro.
- **No hay breadcrumbs** dentro de un módulo con tabs (ej. Inventario → Stock → Historial) — la navegación por tabs vive dentro de la página, invisible para el sidebar.
