# GIRO — Documentación técnica y de producto

GIRO es un ERP retail multi-tenant para tiendas de indumentaria: inventario con variantes (talle/color), punto de venta, compras a proveedores, cuenta corriente de clientes, traspasos entre sucursales, empleados/sueldos (Argentina), contabilidad (plan de cuentas FACPCE) y reportes. Una sola aplicación web, una sola URL — los módulos se muestran u ocultan según el permiso del usuario logueado.

Esta carpeta es la fuente de verdad técnica y de producto del proyecto. Existe además una carpeta de documentación operativa/comercial en `docs/` (manual de usuario, guía de hosting, landing) que **no** se duplica acá — ver la sección "Otros documentos" abajo.

## Cómo está organizada esta documentación

| Carpeta | Contenido |
|---|---|
| `docs/*.md` (raíz) | Documentos transversales: arquitectura, permisos, navegación, sistema de diseño, estándares de código, roadmap. |
| `docs/modules/` | Un documento por módulo del menú (Dashboard, Inventory, POS, etc.) — qué hace, reglas de negocio, permisos, componentes, problemas conocidos. |
| `docs/architecture/` | Documentación técnica profunda por capa (frontend, backend, base de datos, auth, routing, hooks, deployment). |
| `docs/ux/` | Guías de UX concretas: cuándo usar un modal vs. inline, cómo se comporta la búsqueda, atajos de teclado, soporte de lector de código de barras. |
| `docs/business/` | Reglas de negocio puras, independientes de la implementación (qué es una devolución, cómo se calcula un sueldo, qué es un traspaso). |

## Corrección importante sobre el stack asumido

Si llegaste a este proyecto esperando **Material UI**: no lo usa. El frontend es React 19 + Tailwind CSS 3 con un set propio de componentes (`components/ui/*`, `components/*`) y clases utilitarias reusables (`.input-minimal`, `.btn-primary`, `.btn-secondary`, `.table-modern`). Ver [`architecture/frontend.md`](./architecture/frontend.md) y [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) para el detalle real.

## Stack real (verificado en `package.json`, no asumido)

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS 3, React Router 7, i18next (es/en), Recharts, jsPDF, xlsx (SheetJS vía CDN, no vía npm — ver nota en `architecture/frontend.md`).
- **Backend**: Node.js + Express 5, TypeScript, Prisma 5 ORM, MySQL, Zod (validación), JWT (jsonwebtoken), bcryptjs, Nodemailer, Stripe + MercadoPago, node-cron, web-push.
- **Base de datos**: MySQL relacional, multi-tenant por `companyId` en (casi) cada tabla.
- **Testing**: Jest + Supertest (backend), Vitest + React Testing Library (frontend).

## Por dónde empezar

1. [`PROJECT.md`](./PROJECT.md) — qué es GIRO, modelo de negocio, usuarios objetivo.
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — cómo está armado el monorepo y las capas.
3. [`PERMISSIONS.md`](./PERMISSIONS.md) — el sistema de roles + permisos granulares (la pieza que determina qué ve cada usuario).
4. [`NAVIGATION.md`](./NAVIGATION.md) — el menú real, con las condiciones de visibilidad de cada ítem.
5. [`modules/`](./modules/) — un documento por pantalla del menú.

## Otros documentos existentes (no técnicos / de producto en curso)

Estos ya existían antes de esta estructura y siguen siendo válidos para sus propósitos específicos — no se reemplazan:

- `MANUAL-USUARIO.md` / `manual-usuario.html` — manual para el usuario final de la tienda.
- `HOSTING-RECOMENDACIONES.md` — dónde desplegar (Railway, Render+Vercel).
- `MEJORAS-FUTURAS.md` — backlog de producto con lo ya implementado marcado.
- `LANDING-PLANES-Y-PAGO.md`, `MOSTRAR-A-CLIENTE.md` — materiales de venta/demo.
- `PROMPT-FASE5.md` — bitácora de la implementación de Empleados/Sueldos/Contabilidad.

## Estado de esta documentación

Generada y actualizada por primera vez el 2026-07-11, grounded en el código real del repositorio (no en supuestos). Cuando el código cambie y un documento quede desactualizado, corregilo en el mismo commit que cambia el código — documentación que miente es peor que no tener documentación.
