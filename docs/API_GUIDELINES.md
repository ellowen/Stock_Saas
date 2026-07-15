# API_GUIDELINES

## Convenciones REST reales del proyecto

- Recursos en plural, kebab/snake según el nombre (`/purchase-orders`, `/accounts-receivable`, `/stock-transfers`, `/stock-counts`).
- Acciones que no son CRUD puro van como sub-ruta con verbo (`POST /:id/receive`, `POST /:id/cancel`, `POST /:id/convert-to-invoice`, `POST /:id/pay`) — no se modela todo como PATCH genérico.
- Filtros de listado como query params (`?status=&supplierId=&from=&to=`), nunca como body en un GET.
- Paginación: `page`/`pageSize` como query params donde existe (no todos los listados están paginados — ej. `GET /purchase-orders` no confirmado con paginación real vs. `GET /products` que sí la tiene explícita).

## Formato de error

```json
{ "code": "INSUFFICIENT_STOCK", "message": "Texto legible en español", "...detalle opcional": "..." }
```
El `code` es lo que el frontend debería inspeccionar para decidir comportamiento (redirect, bloqueo de UI); el `message` es para mostrar directo al usuario. Ver `ERROR_HANDLING.md`.

## Status codes con significado fijo en este proyecto

`400` validación/regla simple · `401` no autenticado o token vencido · `402` límite de plan o suscripción vencida · `403` falta de rol/permiso · `404` no encontrado en el tenant · `409` conflicto de unicidad.

## Autenticación

Header `Authorization: Bearer <access_token>`. Refresh vía `POST /auth/refresh` con el refresh token (rotación no confirmada en esta ronda — a verificar antes de asumir).

## Qué falta documentar/estandarizar (no existe hoy)

- No hay una spec OpenAPI/Swagger generada — este documento y los de `modules/` son la única referencia de contrato de API por ahora.
- No hay versionado de API (`/v1/...`) — un cambio breaking en un endpoint impactaría al frontend directamente sin período de convivencia.
- No hay rate limiting confirmado en los endpoints investigados — a verificar si existe algún middleware global no visto en esta ronda.
