# Users — Usuarios y permisos

## Propósito

Gestionar cuentas de usuario de la empresa (rol, sucursal asignada) y sus permisos granulares individuales.

## Reglas de negocio

No se puede eliminar al único `OWNER` activo. Un usuario con `branchId: null` tiene acceso a todas las sucursales. Auditado: `CREATE`/`UPDATE`/`DELETE` de User sí quedan en `AuditLog` (de los pocos eventos que realmente se auditan hoy, ver `modules/Audit.md`).

## Workflow

Alta (con `checkUserLimit` de plan) → asignar rol + sucursal → opcionalmente abrir el modal "Permisos" para otorgar/revocar capacidades puntuales sin cambiar el rol → baja lógica.

## UX / Frontend

`UsersPage.tsx` incluye el modal de gestión de permisos (no es una página separada): checkboxes agrupados por `PERMISSION_GROUPS`, badge "override" en lo que difiere del default del rol, botones "Guardar permisos" y "Resetear al rol". No disponible para editar el propio OWNER (sin botón "Permisos" en su fila).

## Navegación

`/app/users`, ícono `IconUsers`, requiere `USERS_MANAGE`.

## Permisos

CRUD de usuarios protegido por `requireRole(["OWNER","MANAGER"])`, no por `requirePermission("USERS_MANAGE")`. Gestión de permisos (`PUT/DELETE /permissions/users/:id`) requiere **solo OWNER**, y bloquea explícitamente modificar permisos de otro OWNER.

## Tablas / Modelo

`User` (`role, branchId?, isActive`) + `UserPermission` (override por usuario y `PermissionKey`, `granted: boolean`).

## Mejoras futuras

Ver `SECURITY.md` — este es el módulo donde se encontró la inconsistencia más seria del sistema de permisos (ver abajo). Alinear el gate de acceso del frontend (`canManageUsers`) para que respete `hasPermission("USERS_MANAGE")` en vez de rol hardcodeado, y hacer lo mismo en el backend con `requirePermission`.

## Problemas conocidos

**Revocar `USERS_MANAGE`/`SETTINGS_MANAGE` a un MANAGER no tiene ningún efecto real**: el ítem de menú se oculta (respeta el permiso), pero tanto la página (`AuthContext.tsx`: `canManageUsers = role === "OWNER" || role === "MANAGER"`, hardcodeado) como el backend (`requireRole`, no `requirePermission`) ignoran el override. Un MANAGER con el permiso revocado que navega directo a `/app/users` por URL entra igual y puede operar la API sin restricción. Esto contradice el propósito mismo de tener un sistema de overrides granular — hoy Users/Branches son, en la práctica, "todo MANAGER puede", sin excepción posible.

También: de los 20 `PermissionKey` que la UI de checkboxes expone, solo un subconjunto (Empleados, Contabilidad parcial, `PRODUCTS_WRITE` en promociones) se aplica realmente en el backend — ver el detalle completo en `SECURITY.md`.

## Preguntas abiertas

¿El sistema de permisos granulares debería cubrir Users/Branches también, o son intencionalmente "solo rol" porque gestionar usuarios/sucursales es una capacidad que no debería delegarse parcialmente? Si es lo segundo, vale la pena sacar `USERS_MANAGE`/`SETTINGS_MANAGE` de la lista de permisos que el modal permite tocar, para no sugerir un control que no existe.
