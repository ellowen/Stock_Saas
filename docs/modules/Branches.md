# Branches — Sucursales

## Propósito

Definir las sucursales de una empresa; toda operación de inventario/venta/empleados queda scoped a una sucursal.

## Reglas de negocio

CRUD limitado: **solo Create/List/Delete, no hay edición** (sin endpoint `PUT`/`PATCH`, sin modal de edición en el frontend). Soft-delete (`isActive:false`). `@@unique([companyId, code])` — el código de sucursal debe ser único, y como el unique no distingue `isActive`, **una sucursal "eliminada" bloquea reusar su código** para una nueva.

## Workflow

Alta (con `checkBranchLimit` de plan) → uso operativo → baja lógica, sin ninguna validación de qué pasa con las referencias existentes (inventario, ventas, empleados, usuarios asignados quedan apuntando a un `branchId` de una sucursal inactiva, sin cascada ni reasignación).

## UX / Frontend

`BranchesPage.tsx`: tabla ordenable, modal de creación, `ConfirmModal` de borrado. Gate de acceso: `role === "OWNER" || role === "MANAGER"` hardcodeado (no usa el permiso granular `SETTINGS_MANAGE` que sí gatea el ítem de menú — ver inconsistencia abajo).

## Navegación

`/app/branches`, ícono `IconBuilding`, requiere `SETTINGS_MANAGE` para verse en el menú.

## Permisos

Backend usa `requireRole(["OWNER","MANAGER"])`, no `requirePermission("SETTINGS_MANAGE")` — un MANAGER al que se le revoque `SETTINGS_MANAGE` vía override sigue pudiendo gestionar sucursales, tanto por la página (gate hardcodeado a rol) como por la API.

## Tablas / Modelo

`Branch` (`name, code, address?, city?, state?, country?, zipCode?, phone?, isActive`). Relaciones extensas: `inventory[]`, `inventoryMovements[]`, `sales[]`, `stockFrom/stockTo`, `User[]`, `documents[]`, `purchaseOrders[]`, `stockCounts[]`, `batches[]`, `employees[]`, `heldSales[]`.

## Mejoras futuras

Agregar endpoint de edición. Corregir `checkBranchLimit` para contar solo `isActive:true` (ver bug abajo). Alinear el gate del frontend a `hasPermission("SETTINGS_MANAGE")` en vez de rol hardcodeado, o documentar explícitamente que Branches es intencionalmente solo-rol (no granular) y quitar `SETTINGS_MANAGE` de la lista de permisos revocables si así fuera.

## Problemas conocidos

1. **Bug de negocio real**: `checkBranchLimit` cuenta *todas* las branches (sin filtrar `isActive`) — una empresa FREE (límite 1) que crea y luego "elimina" una sucursal queda bloqueada para siempre para crear una nueva, porque el conteo nunca baja. Comparar con `checkUserLimit`, que sí filtra correctamente.
2. Código de sucursal eliminada bloquea reutilización del mismo código.
3. Eliminar una sucursal no verifica ni advierte sobre inventario/ventas/empleados/usuarios que quedan huérfanos de una sucursal inactiva.
4. Sin endpoint de edición — cualquier corrección de datos requiere borrar y recrear (lo cual, dado el bug del límite, puede ni siquiera ser posible en plan FREE).

## Preguntas abiertas

¿Falta un endpoint de edición por decisión de producto (sucursales "no deberían" cambiar de datos) o es simplemente incompleto? Dado que ya se encontró el bug de límite, es probable que edición simplemente no se haya priorizado aún.
