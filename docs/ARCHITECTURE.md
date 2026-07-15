# ARCHITECTURE — Vista general

Documento de alto nivel. Para profundidad por capa ver [`architecture/`](./architecture/).

## Monorepo

```
Stock_Saas/
├── backend/     Express + TypeScript + Prisma + MySQL
├── frontend/    Vite + React 19 + TypeScript + Tailwind
└── docs/        esta documentación
```

Dos paquetes independientes (`package.json` propio cada uno), sin workspace tool (no hay `pnpm-workspace.yaml` ni `turbo.json`) — se corren y buildean por separado. En desarrollo, Vite proxea al backend (ver `frontend/vite.config.ts`, cada ruta de API tiene su entrada explícita en `server.proxy`).

## Backend: arquitectura en capas

```
backend/src/
├── config/            env vars (config/env.ts), cliente Prisma (config/database/prisma.ts)
├── domain/             tipos/lógica de dominio pura (hoy solo users)
├── application/        casos de uso por feature — AQUÍ VIVE LA LÓGICA DE NEGOCIO
│   ├── sales/          SalesService, HeldSaleService, receipt.service
│   ├── promotions/      PromotionService
│   ├── accounting/     AutoJournalService, account/journal/reports/iva-book services
│   ├── payroll/        PayrollService (cálculo de sueldos, ley argentina)
│   ├── permissions/    PermissionService (roles + overrides)
│   ├── billing/        Stripe/MercadoPago, plan-limits
│   └── ... (una carpeta por feature)
├── infrastructure/
│   ├── http/
│   │   ├── middleware/ authMiddleware, requirePermission, requireRole, checkSubscription
│   │   └── routers/    un router Express por recurso, registrado en app.ts
│   ├── email/          mailer.ts (Nodemailer), sendPasswordResetEmail.ts
│   └── cron/           jobs.ts (node-cron: resumen de ventas diario/semanal)
├── presentation/http/controllers/   parsing+validación (Zod) + llamada al service + mapeo de errores a HTTP
├── app.ts              createApp(): registra middlewares globales y monta cada router
└── server.ts           arranque HTTP + cron
```

**Patrón por feature**: router → controller → service. El router solo define rutas y aplica middleware de permiso; el controller valida el body con Zod y traduce errores del service a códigos HTTP; el service tiene la lógica real y es la única capa que toca Prisma. Ver [`architecture/backend.md`](./architecture/backend.md) para el detalle y las excepciones a este patrón.

## Frontend: estructura

```
frontend/src/
├── pages/           una carpeta o archivo por ruta (sales/, inventory/, accounting/, promotions/...)
│   └── <modulo>/
│       ├── <Modulo>Page.tsx     orquestador de la pantalla
│       ├── tabs/                 si la pantalla tiene tabs
│       ├── components/           componentes propios del módulo
│       └── hooks/                lógica de datos del módulo (useSales, useCart, etc.)
├── components/       componentes compartidos entre módulos (ui/, documents/, Icons.tsx)
├── contexts/         AuthContext, ToastContext, ThemeContext
├── layout/           AppLayout.tsx (sidebar + shell de /app/*)
├── lib/              api.ts (fetch wrapper + token), format.ts, pdf.ts, thermal-printer.ts
├── i18n/locales/     es.json / en.json
└── App.tsx           definición de rutas (React Router)
```

Ver [`architecture/frontend.md`](./architecture/frontend.md), [`architecture/routing.md`](./architecture/routing.md), [`architecture/state.md`](./architecture/state.md).

## Multi-tenancy

Casi todos los modelos Prisma tienen `companyId`. Todo query en `application/*` filtra por `companyId` (viene de `req.auth.companyId`, extraído del JWT en `authMiddleware`). No hay un mecanismo de Row Level Security a nivel de base de datos — el aislamiento es 100% a nivel de código de aplicación. Esto es un riesgo a vigilar: un `findMany` sin `where: { companyId }` filtraría entre tenants. Ver `architecture/database.md` y `SECURITY.md`.

## Autenticación y autorización

- **AuthN**: JWT access token (15 min) + refresh token (7 días), emitidos en `/auth/login`. Ver `architecture/authentication.md`.
- **AuthZ**: rol (`OWNER`/`MANAGER`/`SELLER`) + overrides individuales por permiso (`UserPermission`). Ver [`PERMISSIONS.md`](./PERMISSIONS.md) y `architecture/authorization.md`.

## Integraciones externas

| Servicio | Para qué | Dónde |
|---|---|---|
| Stripe | Suscripción de plan (tarjeta) | `application/billing/` |
| MercadoPago | Suscripción de plan (alternativa LatAm) | `application/billing/mp.service.ts` |
| Nodemailer (SMTP) | Reset de contraseña, recibo de venta, resumen diario/semanal | `infrastructure/email/` |
| web-push | Notificaciones push del navegador | `application/notifications/`, `infrastructure/http/routers/push.router.ts` |
| SheetJS (xlsx) | Import/export de planillas | Frontend, instalado desde el CDN oficial (el paquete de npm está abandonado con CVEs sin parche) |

## Decisiones técnicas ya tomadas (no revertir sin justificación)

| Decisión | Razón |
|---|---|
| Monorepo simple, sin workspace tool | Un solo desarrollador, no vale la complejidad de Turborepo/Nx todavía |
| Prisma + MySQL, no un ORM más liviano | Migraciones tipadas, buen soporte de relaciones, ya probado en producción de otros proyectos del mismo autor |
| Tailwind, no un component library (MUI, Chakra) | Mayor control visual, sin overhead de theming de una librería ajena; el costo es mantener el design system propio (ver `DESIGN_SYSTEM.md`) |
| Permisos granulares por usuario, no solo roles fijos | Un `SELLER` de confianza puede necesitar un permiso puntual sin ascenderlo a `MANAGER` |
| Cálculo de promociones/descuentos server-authoritative | Evitar que un cliente manipulado en el navegador cobre de menos |
