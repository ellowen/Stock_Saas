# Backend — Detalle de arquitectura

Ver `ARCHITECTURE.md` para el diagrama general. Este documento agrega el detalle de las excepciones reales al patrón.

## Patrón `router → controller → service`

- **Router**: rutas + middleware (`authMiddleware`, `requireRole`, `requirePermission`). Ver `SECURITY.md` para la brecha real entre routers que aplican `requirePermission` correctamente (Employees, Payroll, Accounting, Promotions) y los que no (la mayoría).
- **Controller**: validación Zod + mapeo de errores a HTTP. **Excepciones confirmadas**: Customers y Branches no tienen un `controller.ts` separado — la lógica vive directo en el router. Es una simplificación válida para CRUDs chicos, no un error, pero rompe la uniformidad del patrón.
- **Service**: única capa que toca Prisma. Siempre filtra por `companyId` (ver `architecture/database.md` para el riesgo de que esto no está garantizado estructuralmente).

## `application/<feature>/` — dónde vive cada cosa

Una carpeta por dominio de negocio, no por tipo técnico. Ejemplo: `application/promotions/promotion.service.ts` tiene tanto el cálculo de descuentos automáticos como la aplicación de cupones — no están separados en dos services distintos pese a ser dos responsabilidades algo distintas.

## Middlewares reales (`infrastructure/http/middleware/`)

`authMiddleware` (JWT), `requirePermission(key)`, `requireRole(roles[])`, `checkSubscription` (global, ver `modules/Subscription.md`), `checkBranchLimit`/`checkUserLimit`/`checkProductLimit`/`checkSaleLimit` (límites de plan, aplicados puntualmente en el endpoint de creación correspondiente, no de forma centralizada).

## Excepción notable: lógica en el router

`purchase-orders.router.ts` dispara `autoJournal.onPurchaseReceived(...)` directamente desde el router (fire-and-forget con `.catch(console.error)`), no desde el controller/service. Es la única instancia confirmada de lógica de negocio viviendo en la capa de router — vale la pena moverla al service si se refactoriza ese módulo, tanto por consistencia como porque ahí está el bug de doble contabilización (`modules/Purchases.md`).

## Cron (`infrastructure/cron/jobs.ts`)

Único uso confirmado: resumen de ventas diario/semanal por email (`node-cron`). No hay ningún job de mantenimiento de datos (ej. marcar `AccountReceivable` como `OVERDUE`, ver `modules/AccountsReceivable.md`).
