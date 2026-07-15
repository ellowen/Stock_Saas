# Promotions — Motor de promociones y cupones

## Propósito

Definir promociones automáticas (2x1, % off) y cupones opcionales, aplicados al armar una venta en el POS.

## Reglas de negocio

`Promotion` (`type: PERCENT_OFF | BUY_X_GET_Y_FREE`, `scope: ALL | PRODUCT | CATEGORY`). Si tiene `couponCode`, **no se aplica automáticamente** — el cajero debe tipearlo. El motor es agnóstico de producto/categoría específico: opera sobre el modelo genérico, agregar una promoción nueva es un registro de datos, no un cambio de código.

## Workflow

`PromotionService.computeAutoDiscounts()` corre server-side al confirmar una venta, evaluando todas las promociones activas sin cupón contra el carrito. `applyCoupon()` valida y aplica un cupón específico si el cajero lo ingresa. El frontend solo muestra un **preview** debounced (`POST /promotions/preview`) — nunca es la fuente de verdad del monto final.

## UX / Frontend

Gestión de promociones en `PromotionsPage.tsx` (crear/editar/activar-desactivar). En el POS, el descuento aplicado se refleja en el carrito una vez calculado por el preview, y se recalcula de nuevo al confirmar.

## Navegación

`/app/promotions`, ícono `IconTag`, requiere `PRODUCTS_WRITE` (reusa el mismo permiso de gestión de catálogo, no tiene uno dedicado propio).

## Permisos

`promotions.router.ts` **sí usa `requirePermission("PRODUCTS_WRITE")` correctamente** — es uno de los pocos módulos, junto con Employees/Payroll/Accounting, donde el enforcement de backend está bien aplicado. Contrasta con `products.router.ts`, que usa el mismo permiso pero no lo verifica en absoluto (ver `modules/Products.md`).

## Tablas / Modelo

`Promotion` (`type, scope, couponCode?`, vigencia, y relación a producto/categoría según `scope`).

## Relaciones

Consumida por `Sale` al confirmar (server-side). Ver `modules/POS.md`.

## Mejoras futuras

Evaluar si compartir `PRODUCTS_WRITE` con Products es intencional (ambos son "gestión de catálogo") o si Promotions merece su propio `PermissionKey` para poder delegarse independientemente (ej. un encargado de marketing que gestiona promos sin poder editar productos).

## Problemas conocidos

Ninguno encontrado en esta ronda — es, junto con POS, uno de los módulos mejor cubiertos del sistema (enforcement correcto, cálculo server-authoritative).

## Preguntas abiertas

¿Vale la pena separar el permiso de Promotions del de Products, dado que son responsabilidades de negocio distintas aunque hoy comparten `PRODUCTS_WRITE`?
