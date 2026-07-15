# Customers — Clientes

## Propósito

Maestro de clientes, usado por Sales/POS, Documents, AccountsReceivable y HeldSale.

## Reglas de negocio

Soft-delete (`isActive:false`), sin borrado físico posible por las FKs opcionales que apuntan a `Customer` desde `Sale`, `Document`, `AccountReceivable`, `HeldSale`. `taxType` con opciones fijas (CUIT/DNI/RUC/NIT/Otro).

## Workflow

Alta → uso en ventas/documentos/cuenta corriente → baja lógica. `GET /:id/sales` da el historial (últimas 50 ventas no canceladas) + `totalSpent`.

## UX / Frontend

`CustomersPage.tsx`: CRUD, búsqueda debounced (300ms), selección múltiple con borrado masivo, modal de historial de compras.

## Navegación

`/app/customers`, ícono `IconUserCircle`, requiere `CUSTOMERS_WRITE`.

## Permisos

`CUSTOMERS_WRITE` gatea el menú, no se aplica en el backend (router solo tiene `authMiddleware`).

## Tablas / Modelo

`Customer` (`name, taxId?, taxType?, address?, city?, email?, phone?, notes?, isActive`).

## Relaciones

`documents[]`, `sales[]`, `accountsReceivable[]`, `heldSales[]`.

## Mejoras futuras

Agregar `requirePermission("CUSTOMERS_WRITE")`. Migrar `CustomersPage.tsx` a `authFetch` (hoy usa `fetch()` crudo).

## Problemas conocidos

1. Sin protección de permiso en backend.
2. `CustomersPage.tsx` usa `fetch()` crudo con `const API = "/api"` en vez de `authFetch` — un 401/402 en esta pantalla no dispara los redirects automáticos que el resto de la app sí tiene.
3. `PUT /:id` no filtra por `isActive` — se puede reactivar/editar un cliente ya "eliminado" conociendo su id.

## Preguntas abiertas

Ninguna crítica — módulo simple y bien delimitado. La única duda de producto es si el borrado masivo debería requerir una confirmación más fuerte que la actual, dado que borra clientes que podrían tener historial de compras relevante para reportes.
