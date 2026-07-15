# API — Detalle de arquitectura

Ver `API_GUIDELINES.md` para convenciones. Este documento agrega el mapa real de módulos montados en `app.ts`.

## Rutas montadas (confirmado)

`/products`, `/inventory`, `/stock-transfers`, `/stock-counts`, `/attributes`, `/analytics`, `/customers`, `/suppliers`, `/purchase-orders`, `/documents`, `/accounts-receivable`, `/branches`, `/users`, `/permissions`, `/billing`, `/audit-logs`, `/employees`, `/payrolls`, `/journal`, `/accounting-reports`, `/promotions`, `/sales`, `/protected`, `/auth`, `/push`, `/health`.

## Middleware global vs. por-ruta

`checkSubscription` se aplica globalmente excepto a una lista explícita de prefijos (`/auth`, `/billing`, `/push`, `/protected`, `/health`) — ver `modules/Subscription.md`. El resto de los middlewares (`requireRole`, `requirePermission`, límites de plan) se aplican por ruta individual, no globalmente, lo cual es correcto en diseño pero es también la razón de que la cobertura sea despareja (algunos routers los tienen, otros no — ver `SECURITY.md`).

## Un patrón de proxy en desarrollo, no en producción

`frontend/vite.config.ts` proxea cada ruta de API explícitamente a `server.proxy` en dev. En producción, esto depende de que el reverse proxy real replique el mismo mapeo — confirmado como riesgo puntual en `AuditPage.tsx` (usa un path relativo que coincide con el proxy de dev "por casualidad", ver `modules/Audit.md`).

## Sin versionado ni spec formal

No hay `/v1/` ni OpenAPI/Swagger generado. Este set de documentos (`docs/modules/*.md` + `API_GUIDELINES.md`) es hoy la única referencia de contrato de API.
