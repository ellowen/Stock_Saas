# Deployment

**No desplegado a producción todavía** — es una decisión de negocio pendiente del usuario (elegir hosting: Railway vs. Render+Vercel), no técnica. Ver `HOSTING-RECOMENDACIONES.md` (doc histórico ya existente en el repo) para las opciones evaluadas.

## Lo que sí está preparado para producción

- CORS configurable por variable de entorno (commit `d1058c7`).
- `NO_SSL=1` escape hatch en `vite.config.ts` solo para testing en entornos sin certificado válido — el comportamiento default sigue siendo HTTPS.
- Variables de entorno para Stripe/MercadoPago (price IDs, secrets de webhook).

## Pendiente antes de un deploy real

Confirmar variables de entorno de producción (DB, JWT secret, SMTP, Stripe/MP), y decidir si el reverse proxy de producción replica el mismo mapeo de rutas que `vite.config.ts` usa en dev (relevante para el bug potencial de `AuditPage.tsx`, ver `modules/Audit.md`).
