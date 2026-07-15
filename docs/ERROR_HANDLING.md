# ERROR_HANDLING — Cómo se propagan y muestran los errores

## Backend → HTTP

Patrón por capa: el `service` lanza errores con un `code` reconocible (ej. `INSUFFICIENT_STOCK`, `PAYMENT_EXCEEDS_BALANCE`, `PLAN_LIMIT_REACHED`), el `controller` los atrapa y mapea a un status HTTP + payload `{ code, message, ...detalle }`. Los `middleware` (`checkSubscription`, `checkBranchLimit`, etc.) devuelven directamente `402` con `{code: "SUBSCRIPTION_EXPIRED"}` o `{code:"PLAN_LIMIT_REACHED", resource, limit, current, message}` sin pasar por el controller.

Códigos de status usados con intención (no genéricos):
- `400` — validación Zod fallida o regla de negocio simple (ej. "no se puede eliminar al único OWNER").
- `402` — límite de plan o suscripción vencida (`checkSubscription`, `checkBranchLimit`/`checkUserLimit`/`checkProductLimit`/`checkSaleLimit`).
- `403` — falta de permiso/rol.
- `404` — entidad no encontrada dentro del tenant.
- `409` — conflicto de unicidad (ej. código de sucursal duplicado).

## Frontend → usuario

`frontend/src/lib/api.ts` expone `authFetch()`, un wrapper sobre `fetch` que:
1. Agrega el header `Authorization: Bearer <token>`.
2. Si la respuesta es `401`, intenta refrescar el token una vez y reintenta; si falla, redirige a `/login`.
3. Si la respuesta es `402` con `code: "SUBSCRIPTION_EXPIRED"`, redirige a `/app/plan`.
4. Si es `402` con `code: "PLAN_LIMIT_REACHED"`, **no** hace nada automático — cada pantalla debe leer `data.message` y mostrarlo (típicamente vía `ToastContext`).

**Problema real encontrado**: no todas las páginas usan `authFetch`. `CustomersPage.tsx` y `AuditPage.tsx` usan `fetch()` crudo con paths relativos (`/api/customers`, `/audit-logs`). Consecuencia: en esas dos pantallas, un 401 (sesión expirada) o un 402 `SUBSCRIPTION_EXPIRED` **no dispara el redirect automático** — el usuario ve un fetch fallido silencioso o un estado de carga colgado, en vez de ser llevado a `/login` o `/app/plan` como en el resto de la app. Es una inconsistencia puntual, fácil de corregir migrando esas dos pantallas al wrapper estándar.

## Qué falta (no hay hoy)

- No hay un error boundary de React global documentado/confirmado — un throw no capturado en un componente puede tirar abajo toda la pantalla sin un fallback amigable. A confirmar/agregar.
- No hay un logging centralizado de errores de frontend (Sentry o similar) — los errores de fetch solo se ven en la consola del navegador del usuario, no llegan a nadie del equipo.
- El código de error humano (`message`) viene mezclado en español desde el backend directamente (no hay capa de i18n de errores de servidor) — coherente con que la app es español-first, pero significa que si se agrega inglés (`i18n/locales/en.json` ya existe para la UI), los mensajes de error de la API seguirían en español.
