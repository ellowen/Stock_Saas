# PROMPT-FASE3 — Stock Completo

> Referencia de implementación punto a punto. Leer este archivo al inicio de cada sesión de Fase 3.
> Proveedores y Órdenes de Compra ya están implementados (Fase 2). No repetir.

---

## Estado de tareas

| # | Tarea | Estado |
|---|-------|--------|
| 3.1 | Stock mínimo por variante + badge "bajo stock" en UI | ✅ Ya implementado |
| 3.2 | Ajuste de inventario masivo | ✅ Completo |
| 3.3 | Importación masiva CSV de productos | ✅ Completo |
| 3.4 | Inventario físico (sesión de conteo) | ✅ Completo |
| 3.5 | Lotes y vencimientos | ✅ Completo |
| 3.6 | Ubicaciones en sucursal (rack) | ✅ Completo |
| 3.7 | Alertas de stock bajo por email (cron) | ✅ Completo |
| 3.8 | Resumen diario/semanal de ventas por email | ✅ Completo |

Orden elegido: de menor a mayor complejidad, priorizando valor inmediato.

---

## 3.1 — Stock mínimo + badge "bajo stock"

### Objetivo
Que cada variante tenga un `minStock` configurable. Cuando `quantity <= minStock`, mostrar badge rojo en inventario y dashboard.

### Backend
- `ProductVariant`: agregar campo `minStock Int @default(0)`
- Migración: `add_min_stock_to_variant`
- Endpoint `GET /api/inventory/low-stock` → devuelve variantes con `quantity <= minStock` (y `minStock > 0`)
- Endpoint existente de variantes: incluir `minStock` en la respuesta
- Al actualizar una variante (PATCH /api/products/:id/variants/:vId), aceptar `minStock`

### Frontend
- En `InventoryPage` > tab Inventario: columna o badge "Bajo stock" cuando `qty <= minStock`
- En el formulario de variante (modal editar): campo `minStock` (número, min 0)
- Widget en Dashboard: contador de productos bajo stock con link a inventario
- i18n: `inventory.minStock`, `inventory.lowStock`, `inventory.lowStockCount`, `dashboard.lowStockAlert`

---

## 3.2 — Ajuste de inventario masivo

### Objetivo
Pantalla para corregir el stock de múltiples variantes en una sola operación (por ejemplo, después de un conteo rápido).

### Backend
- Endpoint `POST /api/inventory/bulk-adjust`
- Body: `{ branchId, reason: string, adjustments: [{ variantId, newQty }] }`
- Por cada ítem: calcula diferencia, crea `InventoryMovement` de tipo `ADJUSTMENT` (ya existe en el enum), actualiza `Inventory.quantity`
- Todo en una transacción Prisma

### Frontend
- En `InventoryPage` > nuevo tab "Ajuste masivo" o botón en tab Inventario que abre modal
- Tabla editable: buscar variante (por nombre/SKU), ingresar cantidad real
- Campo `reason` obligatorio (texto libre)
- Preview de cambios (muestra diferencia +/- por fila) antes de confirmar
- i18n: `inventory.bulkAdjust`, `inventory.adjustReason`, `inventory.adjustQtyNew`, `inventory.adjustDiff`, `inventory.adjustConfirm`

---

## 3.3 — Importación masiva CSV de productos

### Objetivo
Subir un archivo CSV para crear/actualizar productos y variantes en lote.

### Formato CSV esperado
```
name,sku,barcode,price,attributes,stock,branchCode
Remera Blanca,REM-001,7791234,1500,"Talle:S,Color:Blanco",10,SUC1
Remera Blanca,REM-002,7791235,1500,"Talle:M,Color:Blanco",8,SUC1
```

### Backend
- Endpoint `POST /api/products/import-csv`
- Multipart form-data, campo `file`
- Usar librería `csv-parse` (ya disponible en Node) para parsear
- Por cada fila:
  - Buscar o crear `Product` por `name`
  - Buscar o crear `ProductVariant` por `sku`
  - Parsear `attributes` como pares clave:valor
  - Buscar o crear `Inventory` para la variante + branch (por `branchCode`)
  - Si `stock` está presente, crear movimiento `INITIAL` o `ADJUSTMENT`
- Devolver: `{ created: n, updated: n, errors: [{ row, message }] }`

### Frontend
- En `InventoryPage`: botón "Importar CSV" en header
- Modal con:
  - Link para descargar template CSV
  - Input file
  - Botón procesar
  - Tabla de resultados (creados / actualizados / errores)
- i18n: `inventory.importCsv`, `inventory.importTemplate`, `inventory.importResults`, `inventory.importCreated`, `inventory.importUpdated`, `inventory.importErrors`

### Dependencias
- `npm install csv-parse` en backend

---

## 3.4 — Inventario físico (sesión de conteo)

### Objetivo
Crear una sesión de conteo → ingresar cantidades físicas → ver diferencias con el stock del sistema → aprobar para aplicar los ajustes.

### DB nuevas tablas
```prisma
model StockCount {
  id        Int               @id @default(autoincrement())
  companyId Int               @map("company_id")
  branchId  Int               @map("branch_id")
  status    StockCountStatus  @default(OPEN)
  notes     String?
  createdAt DateTime          @default(now()) @map("created_at")
  closedAt  DateTime?         @map("closed_at")
  createdBy Int               @map("created_by")
  items     StockCountItem[]
  company   Company           @relation(fields: [companyId], references: [id])
  branch    Branch            @relation(fields: [branchId], references: [id])
  user      User              @relation(fields: [createdBy], references: [id])
  @@map("stock_counts")
}

model StockCountItem {
  id               Int        @id @default(autoincrement())
  stockCountId     Int        @map("stock_count_id")
  variantId        Int        @map("variant_id")
  systemQty        Int        @map("system_qty")   // snapshot al crear
  countedQty       Int?       @map("counted_qty")  // null = no contado aún
  stockCount       StockCount @relation(fields: [stockCountId], references: [id])
  variant          ProductVariant @relation(fields: [variantId], references: [id])
  @@map("stock_count_items")
}

enum StockCountStatus {
  OPEN
  CLOSED
  APPLIED
}
```

### Backend
- `POST /api/stock-counts` → crea sesión, snapshot del inventario actual de la sucursal como items
- `GET /api/stock-counts` → lista sesiones
- `GET /api/stock-counts/:id` → sesión con items + diff calculado
- `PATCH /api/stock-counts/:id/items` → actualizar `countedQty` de uno o varios items
- `POST /api/stock-counts/:id/apply` → para cada item con `countedQty != null`, aplica ajuste de stock con movimiento `ADJUSTMENT`, cierra sesión (status=APPLIED)
- `DELETE /api/stock-counts/:id` → solo si status=OPEN, cancela

### Frontend
- Nueva sección en `InventoryPage` > tab "Conteo físico"
- Lista de sesiones con estado
- Vista detalle de sesión: tabla con nombre/SKU, stock sistema, contado (input editable), diferencia
- Botón "Aplicar ajustes" solo habilitado si hay al menos un ítem contado
- i18n: `inventory.stockCount`, `inventory.stockCountNew`, `inventory.stockCountItems`, `inventory.systemQty`, `inventory.countedQty`, `inventory.diff`, `inventory.applyCount`

---

## 3.5 — Lotes y vencimientos

### Objetivo
Para industrias que lo necesitan (farmacia, alimentos): cada unidad de stock puede pertenecer a un lote con número y fecha de vencimiento.

### DB
```prisma
model Batch {
  id          Int       @id @default(autoincrement())
  companyId   Int       @map("company_id")
  variantId   Int       @map("variant_id")
  branchId    Int       @map("branch_id")
  batchNumber String    @map("batch_number")
  expiresAt   DateTime? @map("expires_at")
  quantity    Int       @default(0)
  createdAt   DateTime  @default(now()) @map("created_at")
  variant     ProductVariant @relation(fields: [variantId], references: [id])
  branch      Branch    @relation(fields: [branchId], references: [id])
  company     Company   @relation(fields: [companyId], references: [id])
  @@map("batches")
}
```

### Backend
- `POST /api/batches` → crear lote al recibir mercadería
- `GET /api/batches?branchId=&variantId=&expiresBefore=` → listar lotes, filtro por vencimiento próximo
- `PATCH /api/batches/:id` → actualizar cantidad o fecha
- `DELETE /api/batches/:id` → eliminar si qty=0

### Frontend
- En `InventoryPage` > tab Inventario: columna "Lotes" con badge si hay vencimientos próximos (< 30 días)
- Modal de detalle de variante: lista de lotes con qty y fecha de vencimiento
- Botón para agregar lote manualmente
- Widget en Dashboard: "X lotes por vencer en 30 días"
- i18n: `inventory.batches`, `inventory.batchNumber`, `inventory.expiresAt`, `inventory.expiringSoon`

---

## 3.6 — Ubicaciones en sucursal (rack)

### Objetivo
Cada ítem de inventario puede tener un código de ubicación (góndola, rack, estante).

### DB
- `Inventory`: agregar campo `location String? @map("location")`
- No requiere nueva tabla, es un campo de texto libre en el registro de inventario

### Backend
- `PATCH /api/inventory/:branchId/:variantId` → acepta `location` en el body
- `GET /api/inventory` → incluye `location` en la respuesta

### Frontend
- En `InventoryPage` > tab Inventario: columna "Ubicación" (editable inline o en modal)
- Filtro por ubicación en la tabla
- i18n: `inventory.location`, `inventory.locationPlaceholder`

---

## 3.7 — Alertas de stock bajo por email

### Objetivo
Cuando el stock de una variante cae por debajo de `minStock`, enviar email al OWNER de la empresa.

### Backend
- Función `checkLowStockAndNotify(companyId)` en `inventory.service.ts`
- Llamar esta función DESPUÉS de cada venta (en `sales.service.ts`) y después de cada ajuste
- Solo notificar si no se envió alerta en las últimas 24h (usar campo `lastAlertAt` en `Inventory` o cache simple en memoria)
- Email: lista de productos bajo stock con qty actual y mínimo
- Template de email en `infrastructure/email/`

### DB
- `Inventory`: agregar campo `lastAlertAt DateTime? @map("last_alert_at")`

### Frontend
- En SettingsPage: toggle "Alertas de stock por email" (guardar en Company)
- i18n: `settings.lowStockAlerts`, `settings.lowStockAlertsDesc`

---

## 3.8 — Resumen de ventas por email (cron)

### Objetivo
Enviar un resumen diario o semanal de ventas al OWNER por email.

### Backend
- Usar `node-cron` para scheduling
- Cron diario: cada día a las 20:00 → resumen del día
- Cron semanal: cada lunes a las 8:00 → resumen de la semana anterior
- Para cada empresa con la opción activa: consultar ventas del período, formatear email con total, cantidad de ventas, top 5 productos
- Instalar: `npm install node-cron @types/node-cron`

### DB / Settings
- `Company`: agregar `salesReportFrequency String? @default("NONE")` (valores: NONE / DAILY / WEEKLY)

### Frontend
- En SettingsPage: selector de frecuencia (Desactivado / Diario / Semanal)
- i18n: `settings.salesReport`, `settings.salesReportFreq`, `settings.salesReportNone`, `settings.salesReportDaily`, `settings.salesReportWeekly`

---

## Notas generales

- Cada tarea es independiente y puede hacerse en una sola sesión
- Empezar siempre por el backend (schema → migración → service → router) y luego el frontend
- Todas las nuevas rutas van en `protected.router.ts` o en su propio archivo de router
- Tests: no requeridos en esta fase, prioridad es funcionalidad
- i18n: agregar keys en `es.json` y `en.json` en cada tarea
