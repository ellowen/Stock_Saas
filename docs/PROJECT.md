# PROJECT — Qué es GIRO

## Qué es

GIRO es un SaaS de gestión para tiendas de indumentaria: multi-sucursal, multi-usuario, con inventario por variante (talle/color), punto de venta, compras, cuenta corriente, traspasos entre sucursales, RRHH (empleados y liquidación de sueldos con reglas argentinas) y contabilidad (plan de cuentas FACPCE, libro diario, libro IVA). Todo dentro de una sola aplicación web.

No es un producto genérico "para cualquier rubro" — el modelo de datos asume variantes de producto (talle × color) como unidad de stock, lo cual lo diferencia de un ERP genérico y lo acerca a lo que necesita específicamente una tienda de ropa o calzado.

## Modelo de negocio

**Multi-tenant por `companyId`.** Cada empresa (tienda o cadena) es un tenant aislado: usuarios, sucursales, productos, ventas, todo queda scoped a su `companyId`. Un usuario pertenece a una sola empresa.

**Planes** (`CompanyPlan`: `FREE`, `PRO`, `ENTERPRISE`), con límites verificados en middleware (`checkSaleLimit`, `checkSubscription`) y cobro vía Stripe o MercadoPago (ver [`modules/Subscription.md`](./modules/Subscription.md)).

**Trial**: cada empresa nueva tiene `trialEndsAt`; al vencer sin plan pago, `checkSubscription` corta el acceso (ver [`architecture/authorization.md`](./architecture/authorization.md)).

## Usuarios objetivo

El sistema de roles reales es `OWNER` / `MANAGER` / `SELLER` (no un esquema de 4 niveles fijo) más un sistema de **permisos individuales por usuario** que puede otorgar o revocar cualquier capacidad puntual sin cambiar el rol — ver [`PERMISSIONS.md`](./PERMISSIONS.md). Los roles de negocio que la app cubre en la práctica:

| Rol de negocio | Rol técnico típico | Qué necesita ver primero |
|---|---|---|
| Dueño de tienda | `OWNER` | Todo: reportes, contabilidad, plan, usuarios |
| Encargado/Manager de sucursal | `MANAGER` (o `SELLER` + overrides) | Ventas, inventario, traspasos, reportes de su sucursal |
| Cajero | `SELLER` (permisos por defecto) | Buscar/cobrar rápido, sin descuentos ni ver historial completo |
| Empleado de depósito | `SELLER` + `INVENTORY_WRITE` | Inventario, traspasos, conteos de stock |
| Contador/RRHH | override con `ACCOUNTING_VIEW`/`EMPLOYEES_VIEW` | Sueldos y contabilidad, sin necesitar acceso al POS |

No existe hoy un rol "Warehouse Employee" o "HR" dedicado como tipo — se logran vía overrides de permisos sobre `SELLER`/`MANAGER`. Esto es una decisión de diseño válida (menos tipos, más composición), documentada en [`PERMISSIONS.md`](./PERMISSIONS.md).

## Estado actual (2026-07-11)

Todos los módulos listados en `NAVIGATION.md` están implementados y en uso, no son mockups. Las etapas históricas del proyecto (ver `MEJORAS-FUTURAS.md` y `PROMPT-FASE5.md`) ya cerraron: MVP de inventario/POS, Stripe+MercadoPago, empleados/sueldos/contabilidad (Fase 5), y un rediseño funcional del POS (permisos de descuento, price override, hold/resume sale, panel de pago inline, mobile-first, recibo por email/WhatsApp, motor de promociones).

Lo que falta y es una decisión de negocio, no técnica: el deploy a producción (elegir hosting, crear cuentas, setear variables reales — ver `HOSTING-RECOMENDACIONES.md`).

## Principios de producto que ya están validados en el código

Estos no son aspiracionales — ya se aplican y deberían mantenerse al agregar funcionalidad nueva:

1. **El cálculo de dinero nunca confía en el cliente.** Descuentos, promociones automáticas y cupones se recalculan siempre server-side al confirmar una venta, sin importar lo que el frontend haya mostrado como preview. Ver `modules/POS.md` y `business/Promotions.md`.
2. **Los permisos son server-authoritative.** El frontend oculta botones según `hasPermission()`, pero el backend además rechaza la operación (403) si el permiso no está — nunca es solo cosmético.
3. **El motor de promociones es agnóstico de producto.** `PromotionService.computeAutoDiscounts` no hardcodea ningún producto/categoría — opera sobre el modelo `Promotion` genérico (scope `ALL`/`PRODUCT`/`CATEGORY`), así que agregar una promoción nueva es un registro de datos, no un cambio de código.
