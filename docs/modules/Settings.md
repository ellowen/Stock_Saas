# Settings — Configuración de la empresa

## Propósito

Centralizar configuración que no encaja en un módulo de negocio propio: datos de empresa, atributos de variante, plan (stub), impresora térmica, parámetros de sueldos.

## Reglas de negocio

Exactamente 5 tabs: Company, Attributes, Billing, Printer, Payroll. Solo `Company`/`Payroll` (mismo `PUT /protected/company`) y `Attributes` tienen backend real — `Billing` es un stub que remite a `/app/plan`, `Printer` no persiste nada server-side (estado solo en memoria del navegador, vía Web Bluetooth/Serial).

## Workflow

`Company`: editar datos fiscales/moneda/rubro + alertas de stock bajo + frecuencia de reporte + notificaciones push → Guardar (`PUT /protected/company`, exige `role==="OWNER"` en el backend). `Attributes`: crear/editar atributos de variante (TEXT/NUMBER/SELECT) o aplicar un perfil de industria predefinido. `Payroll` (tab "Sueldos"): tasas configurables (ART patronal, cuota sindical) + checkbox de asientos contables automáticos — reusa el mismo save de Company.

## UX / Frontend

`SettingsPage.tsx`. Accesible desde un ícono aparte del avatar/header, **no está en el sidebar principal** (ver `NAVIGATION.md`). Bug de UX menor: los inputs del tab Company no tienen `disabled` para no-OWNER, solo el botón Guardar está condicionado — un no-OWNER puede escribir en los campos y recién al guardar se entera de que no tenía permiso.

## Navegación

`/app/settings`, sin ítem de sidebar — acceso vía header/avatar.

## Permisos

`PUT /protected/company` exige `role==="OWNER"` explícito (no `SETTINGS_MANAGE`). `attributes.router.ts` **no tiene ninguna protección más allá de `authMiddleware`** — la UI oculta los botones de gestión con `isOwner`, pero el servidor no lo verifica.

## Tablas / Modelo

Campos de `Company` (moneda, tipo de industria, `lowStockAlerts`, `salesReportFreq`, `artRate`, `unionRate`, `accountingEnabled`). `Attribute` (`name, type, options?, sortOrder`).

## Mejoras futuras

Agregar `requirePermission`/chequeo de rol real en `attributes.router.ts`. Deshabilitar los inputs de Company para no-OWNER, no solo el botón. Decidir si el tab Billing debería eliminarse (es redundante con `PlanPage.tsx`) o completarse con contenido propio.

## Problemas conocidos

1. Tab "Billing" es un stub redundante — toda la gestión real de plan vive en `/app/plan`, no acá.
2. `attributes.router.ts` sin protección de backend pese a que la UI sugiere que solo el OWNER gestiona atributos.
3. Settings no está en el sidebar principal — para un usuario nuevo no es obvio dónde configurar la empresa (ya señalado en `NAVIGATION.md`).

## Preguntas abiertas

¿El tab Billing debería eliminarse directamente, dado que es 100% redundante con `PlanPage.tsx`? Mantenerlo como está hoy (un texto + link) no aporta nada que el ítem de menú "Plan" no dé ya.
