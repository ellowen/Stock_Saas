# Authorization

Ver `PERMISSIONS.md` para el modelo completo y `SECURITY.md` para la brecha real de enforcement — este documento no repite ese contenido, apunta a él porque es, sin dudas, el documento de arquitectura más importante del set completo.

## Resumen de una línea

3 roles fijos (`OWNER`/`MANAGER`/`SELLER`) + overrides individuales por `PermissionKey` (20 valores) — bien diseñado, parcialmente aplicado: solo Employees/Payroll/Accounting/Promotions/Sales(inline) verifican el permiso granular real en el backend; el resto usa `requireRole` genérico o no verifica nada más allá de estar logueado.

## Regla de oro para cualquier endpoint nuevo

Si el endpoint corresponde a un `PermissionKey` ya existente en el sistema, usar `requirePermission(key)` en el router — nunca asumir que ocultar el botón en el frontend es suficiente. Ver el patrón correcto ya implementado en `employees.router.ts`.
