# Database — Detalle de arquitectura

Ver `DATABASE.md` (raíz) para convenciones generales. Este documento agrega el ángulo de arquitectura/riesgo.

## Multi-tenancy sin RLS

El aislamiento entre empresas depende 100% de que cada query Prisma en `application/*` incluya `where: { companyId }`. No hay una capa que lo garantice estructuralmente (ni un wrapper de Prisma Client, ni Row Level Security de MySQL). Es el riesgo arquitectónico más grande del sistema — un solo `findMany` sin ese filtro en un service nuevo sería una fuga de datos entre tenants, y hoy nada lo detectaría antes de producción salvo revisión manual de código.

**Mitigación sugerida a evaluar** (no implementada): un lint rule custom o un wrapper delgado sobre el cliente Prisma que fuerce `companyId` en cada query de un modelo tenant-scoped, para que un olvido sea un error de compilación en vez de un bug silencioso.

## Índices

Confirmados en los modelos de alto volumen de filtrado (`Document`, `AccountReceivable`, `Inventory`, `AuditLog`). No se auditó cobertura de índices en el resto del schema — pendiente si aparecen queries lentas reales.

## Convenciones de Decimal

`Decimal(10,2)` para dinero, `Decimal(10,3)` para cantidades (soporta fracciones). **Encontrado repetidamente**: varios services truncan a entero en la práctica pese al soporte de decimales del schema (ej. recepción de OC, ver `modules/Purchases.md`) — el schema es más flexible que la lógica de negocio que lo usa.

## Numeración correlativa sin secuenciador atómico

`Document` y `PurchaseOrder` calculan su siguiente número con `findFirst orderBy number desc` dentro de una transacción, no con un secuenciador de base de datos dedicado. Bajo alta concurrencia (dos usuarios creando documentos del mismo tipo al mismo tiempo) existe riesgo teórico de colisión de número — no confirmado como bug activo, pero es un patrón fragil a vigilar si el volumen de transacciones concurrentes crece.
