# Suppliers — Proveedores

## Propósito

Mantener el maestro de proveedores usado por Compras (`Purchase Orders`).

## Reglas de negocio

CRUD simple con soft-delete (`isActive:false`, el mensaje de la API dice literalmente "Proveedor desactivado" aunque la UI diga "eliminar"). Sin `taxType` (a diferencia de `Customer`, que sí lo tiene) — asimetría entre ambos modelos "gemelos", a evaluar si es intencional.

## Workflow

Alta → uso en OC → baja lógica si ya no se usa (nunca se borra físicamente porque `PurchaseOrder.supplierId` no tiene cascade).

## UX / Frontend

`SuppliersPage.tsx`: CRUD con modal, búsqueda debounced (300ms), tabla ordenable + vista mobile en cards.

## Navegación

`/app/suppliers`, ícono `IconTruck`, requiere `SUPPLIERS_WRITE`.

## Permisos

`SUPPLIERS_WRITE` gatea el menú, **no se aplica en el backend** — mismo patrón que Purchases. Ver `SECURITY.md`.

## Tablas / Modelo

`Supplier` (`name, taxId?, address?, city?, email?, phone?, notes?, isActive`) — relación 1-N con `PurchaseOrder`.

## Mejoras futuras

Agregar `requirePermission("SUPPLIERS_WRITE")` en el router. Exponer `GET /:id` (existe el método en el service pero no está enrutado). Evaluar si agregar `taxType` para simetría con `Customer`.

## Problemas conocidos

Sin protección de permiso en backend. Búsqueda usa `contains` sin especificar explícitamente case-insensitive (a confirmar comportamiento real según collation de MySQL).

## Preguntas abiertas

¿Por qué `Supplier` no tiene `taxType` si `Customer` sí? ¿Es una omisión o una decisión de que el tipo de documento fiscal del proveedor no es relevante para el negocio?
