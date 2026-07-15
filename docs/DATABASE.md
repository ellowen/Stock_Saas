# DATABASE — Convenciones reales del schema Prisma

Fuente de verdad: `backend/prisma/schema.prisma` (MySQL, `provider = "mysql"`).

## Convenciones confirmadas (por inspección directa del schema)

- **Naming**: modelos en PascalCase singular (`Product`, `PurchaseOrder`), columnas en camelCase en Prisma pero mapeadas a snake_case en la tabla real vía `@map` (ej. `companyId` → `company_id`), tablas mapeadas a snake_case plural vía `@@map` (ej. `model PurchaseOrder` → `@@map("purchase_orders")`).
- **Multi-tenancy**: casi todo modelo de negocio tiene `companyId Int @map("company_id")` con índice (`@@index([companyId])` o compuesto). No hay excepción encontrada en los modelos investigados.
- **Soft delete generalizado**: `isActive Boolean @default(true)` en vez de borrado físico — confirmado en `Product`, `ProductVariant`, `Customer`, `Supplier`, `Branch`, `User`. Ningún service investigado hace `prisma.<modelo>.delete()` sobre estas entidades; todos hacen `update({isActive:false})`. Excepción: `StockCount` sí se puede cancelar/borrar de verdad si está `OPEN` (no es la misma clase de entidad — es una sesión de trabajo, no un registro maestro).
- **Dinero**: siempre `Decimal @db.Decimal(10,2)`, nunca `Float` — correcto para evitar errores de redondeo. Cantidades de stock/ítems usan `Decimal(10,3)` (soportan fracciones), aunque varios servicios truncan a entero en la práctica (ver bug en `modules/Purchases.md`).
- **Numeración correlativa por tenant**: `Document` y `PurchaseOrder` calculan su propio número secuencial por `companyId` (+ `type` en el caso de `Document`) vía `findFirst orderBy number desc` dentro de la misma transacción — no un secuenciador atómico de base de datos. Riesgo de colisión bajo alta concurrencia, documentado como hallazgo en `modules/Purchases.md` y `modules/Documents.md`.
- **Auditoría de cambios (`before`/`after` JSON)**: existe el modelo genérico `AuditLog`, pero solo 5 puntos del código lo usan realmente (login, CRUD de `User`, creación de `Sale`) — ver `modules/Audit.md`. No es un audit trail completo pese a que el modelo lo permitiría.

## Índices

Los modelos de alto volumen de lectura filtrada (`Document`, `AccountReceivable`, `Sale`) tienen índices compuestos pensados para los filtros reales de sus pantallas (ej. `Document`: `@@index([companyId, type, status])`; `AccountReceivable`: `@@index([companyId, customerId])` y `@@index([companyId, status])`). No se auditó cobertura de índices en esta ronda para *todos* los modelos — pendiente si aparecen queries lentas en producción.

## Migraciones

`backend/prisma/migrations/` — flujo estándar de Prisma Migrate. No se investigó en esta ronda si hay algún migration script de datos (backfill) además de los cambios de schema — a confirmar si se necesita.

## Riesgo conocido, no técnica de la base en sí

No hay Row Level Security a nivel de MySQL — el aislamiento multi-tenant depende 100% de que cada query en `application/*` incluya `companyId` en su `where`. Ver `SECURITY.md`.
