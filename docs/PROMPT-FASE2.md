# Prompt — Fase 2: Documentos imprimibles (Remitos, Facturas, Presupuestos)

Copiá y pegá este prompt completo en una nueva conversación de Claude Code.
**Prerequisito**: La Fase 1 debe estar completada (sistema de atributos flexibles, UI base).

---

## CONTEXTO

Proyecto GIRO — SaaS de gestión de inventario y POS.
Stack: React 19 + Vite + TypeScript + Tailwind / Express 5 + TypeScript + Prisma 5 + MySQL.
Leé `CLAUDE.md` antes de empezar.

---

## OBJETIVO

Implementar un sistema completo de **documentos comerciales imprimibles**:
- **Presupuesto**: cotización sin impacto en stock
- **Remito**: entrega de mercadería (descuenta stock)
- **Factura**: documento fiscal con impuestos y cliente
- **Nota de crédito**: devolución/anulación
- **Orden de compra**: pedido a proveedor

---

## TAREA 1 — DB: Clientes, Proveedores y Documentos

### 1.1 Agregar al schema.prisma

```prisma
model Customer {
  id        String   @id @default(cuid())
  companyId String
  name      String
  taxId     String?  // CUIT, RUC, NIT, DNI, etc.
  taxType   String?  // "CUIT", "DNI", "RUC", etc.
  address   String?
  city      String?
  email     String?
  phone     String?
  notes     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company   Company    @relation(fields: [companyId], references: [id])
  documents Document[]
  sales     Sale[]
  
  @@index([companyId])
}

model Supplier {
  id        String   @id @default(cuid())
  companyId String
  name      String
  taxId     String?
  address   String?
  city      String?
  email     String?
  phone     String?
  notes     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company        Company         @relation(fields: [companyId], references: [id])
  purchaseOrders PurchaseOrder[]
  
  @@index([companyId])
}

model TaxConfig {
  id        String  @id @default(cuid())
  companyId String
  name      String  // ej: "IVA 21%", "IVA 10.5%", "Exento"
  rate      Decimal @db.Decimal(5, 4) // 0.21 = 21%
  isDefault Boolean @default(false)
  isActive  Boolean @default(true)
  
  company   Company        @relation(fields: [companyId], references: [id])
  items     DocumentItem[]
  
  @@unique([companyId, name])
}

model Document {
  id           String       @id @default(cuid())
  companyId    String
  branchId     String
  userId       String
  customerId   String?
  type         DocumentType
  number       Int          // correlativo por empresa+tipo
  status       DocumentStatus @default(DRAFT)
  date         DateTime     @default(now())
  dueDate      DateTime?
  notes        String?
  subtotal     Decimal      @db.Decimal(10, 2) @default(0)
  taxTotal     Decimal      @db.Decimal(10, 2) @default(0)
  discountTotal Decimal     @db.Decimal(10, 2) @default(0)
  total        Decimal      @db.Decimal(10, 2) @default(0)
  relatedDocId String?      // para nota de crédito → factura, factura → presupuesto
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  
  company    Company       @relation(fields: [companyId], references: [id])
  branch     Branch        @relation(fields: [branchId], references: [id])
  user       User          @relation(fields: [userId], references: [id])
  customer   Customer?     @relation(fields: [customerId], references: [id])
  items      DocumentItem[]
  relatedDoc Document?     @relation("RelatedDoc", fields: [relatedDocId], references: [id])
  relatedTo  Document[]    @relation("RelatedDoc")
  
  @@unique([companyId, type, number])
  @@index([companyId, type, status])
}

model DocumentItem {
  id          String   @id @default(cuid())
  documentId  String
  variantId   String?
  description String
  quantity    Decimal  @db.Decimal(10, 3)
  unitPrice   Decimal  @db.Decimal(10, 2)
  discount    Decimal  @db.Decimal(10, 2) @default(0)
  taxConfigId String?
  taxAmount   Decimal  @db.Decimal(10, 2) @default(0)
  totalPrice  Decimal  @db.Decimal(10, 2)
  sortOrder   Int      @default(0)
  
  document    Document    @relation(fields: [documentId], references: [id], onDelete: Cascade)
  variant     ProductVariant? @relation(fields: [variantId], references: [id])
  taxConfig   TaxConfig?  @relation(fields: [taxConfigId], references: [id])
}

model PurchaseOrder {
  id         String              @id @default(cuid())
  companyId  String
  branchId   String
  supplierId String
  userId     String
  number     Int
  status     PurchaseOrderStatus @default(DRAFT)
  date       DateTime            @default(now())
  expectedAt DateTime?
  notes      String?
  total      Decimal             @db.Decimal(10, 2) @default(0)
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt
  
  company  Company             @relation(fields: [companyId], references: [id])
  branch   Branch              @relation(fields: [branchId], references: [id])
  supplier Supplier            @relation(fields: [supplierId], references: [id])
  user     User                @relation(fields: [userId], references: [id])
  items    PurchaseOrderItem[]
  
  @@unique([companyId, number])
}

model PurchaseOrderItem {
  id          String        @id @default(cuid())
  orderId     String
  variantId   String?
  description String
  quantity    Decimal       @db.Decimal(10, 3)
  unitPrice   Decimal       @db.Decimal(10, 2)
  received    Decimal       @db.Decimal(10, 3) @default(0)
  
  order   PurchaseOrder  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant ProductVariant? @relation(fields: [variantId], references: [id])
}

enum DocumentType {
  QUOTE       // Presupuesto
  REMITO      // Remito de entrega
  INVOICE     // Factura
  CREDIT_NOTE // Nota de crédito
}

enum DocumentStatus {
  DRAFT      // Borrador
  ISSUED     // Emitido
  ACCEPTED   // Aceptado (para presupuestos)
  CANCELLED  // Anulado
}

enum PurchaseOrderStatus {
  DRAFT
  SENT
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}
```

Modificar `Sale`: agregar `customerId String?` y `documentId String?`.

Crear migración: `npx prisma migrate dev --name documents-customers-suppliers`

### 1.2 Número correlativo

En `Document`, el campo `number` es un correlativo por `(companyId, type)`. Al crear un documento, calcularlo con:
```sql
SELECT MAX(number) + 1 FROM Document WHERE companyId = ? AND type = ?
```
Hacerlo dentro de una transacción para evitar duplicados.

---

## TAREA 2 — Backend: Servicios y endpoints

### 2.1 `customer.service.ts`
- `list(companyId, search?)` → buscar clientes
- `create(companyId, data)` → crear
- `update(id, companyId, data)` → editar
- `delete(id, companyId)` → soft delete (isActive = false)

### 2.2 `supplier.service.ts`
- `list(companyId, search?)` → buscar proveedores
- `create(companyId, data)` → crear
- `update(id, companyId, data)` → editar
- `delete(id, companyId)` → soft delete

### 2.3 `document.service.ts`
- `create(companyId, branchId, userId, data)`:
  - Tipo REMITO o INVOICE: decrementar stock de los ítems (como una venta)
  - Calcular subtotal, impuestos y total
  - Asignar número correlativo en transacción
- `update(id, companyId, data)` → solo si status = DRAFT
- `cancel(id, companyId)` → si era REMITO/INVOICE, revertir el stock
- `list(companyId, filters)` → filtrar por tipo, estado, fecha, cliente
- `getById(id, companyId)` → con todos los ítems y relaciones
- `convertToInvoice(quoteId, companyId)` → crear INVOICE desde QUOTE
- `createCreditNote(invoiceId, companyId, items?)` → nota de crédito total o parcial

### 2.4 `purchase-order.service.ts`
- `create(companyId, branchId, supplierId, userId, data)` → crear OC
- `update(id, companyId, data)` → editar
- `receive(id, companyId, items)` → recibir mercadería:
  - Para cada ítem, actualizar stock (`PURCHASE_RECEIVE` en InventoryMovement)
  - Actualizar `received` en los ítems
  - Si todo recibido → status = RECEIVED, sino → PARTIALLY_RECEIVED
- `list(companyId, filters)` → con filtros de estado, proveedor, fecha
- `cancel(id, companyId)` → solo si DRAFT o SENT

### 2.5 Endpoints REST

```
# Clientes
GET    /customers              (list, search)
POST   /customers              (create)
PUT    /customers/:id          (update)
DELETE /customers/:id          (soft delete)

# Proveedores
GET    /suppliers              (list, search)
POST   /suppliers              (create)
PUT    /suppliers/:id          (update)
DELETE /suppliers/:id          (soft delete)

# Documentos
GET    /documents              (list, filtros)
GET    /documents/:id          (detalle)
POST   /documents              (crear)
PUT    /documents/:id          (editar, solo DRAFT)
POST   /documents/:id/cancel   (anular)
POST   /documents/:id/convert-to-invoice
POST   /documents/:id/credit-note

# Órdenes de compra
GET    /purchase-orders
GET    /purchase-orders/:id
POST   /purchase-orders
PUT    /purchase-orders/:id
POST   /purchase-orders/:id/receive
POST   /purchase-orders/:id/cancel

# Configuración de impuestos
GET    /tax-configs
POST   /tax-configs
PUT    /tax-configs/:id
DELETE /tax-configs/:id
```

Registrar todos en `app.ts`.

---

## TAREA 3 — Plantilla de impresión de documentos

### 3.1 Componente `DocumentTemplate.tsx`

Crear `frontend/src/components/documents/DocumentTemplate.tsx`:

Un componente React que recibe un documento completo y lo renderiza como HTML imprimible. Debe funcionar tanto para vista previa en modal como para generación PDF.

Diseño del documento (A4):
```
┌─────────────────────────────────────────────────────┐
│  [LOGO]    NOMBRE DE EMPRESA                        │
│            CUIT: XX-XXXXXXXX-X                      │
│            Dirección • Tel • Email                  │
├─────────────────────────────────────────────────────┤
│  FACTURA / REMITO / PRESUPUESTO    N° 0001-00000001 │
│  Fecha: DD/MM/YYYY    Vence: DD/MM/YYYY             │
├─────────────────────────────────────────────────────┤
│  CLIENTE / DESTINATARIO:                            │
│  Nombre: ___________  CUIT/DNI: ___________        │
│  Dirección: ___________                             │
├─────────────────────────────────────────────────────┤
│  CANT │ DESCRIPCIÓN        │ P.UNIT │ DTO │ TOTAL   │
│  ─────┼────────────────────┼────────┼─────┼────────  │
│  1    │ Producto X (M, Rojo│ $1.000 │  0% │ $1.000  │
│  2    │ Producto Y         │ $500   │ 10% │ $900    │
├─────────────────────────────────────────────────────┤
│                          SUBTOTAL:     $1.900       │
│                          IVA 21%:        $399       │
│                          TOTAL:        $2.299       │
└─────────────────────────────────────────────────────┘
│  Notas: ___________                                 │
│  Generado por GIRO — Condición de venta: Contado    │
└─────────────────────────────────────────────────────┘
```

Props:
```typescript
interface DocumentTemplateProps {
  document: DocumentWithItems
  company: CompanyInfo
  showPrices?: boolean   // false para remitos sin precio
  showTaxes?: boolean
  language?: 'es' | 'en'
}
```

### 3.2 `usePrintDocument.ts` hook

```typescript
// Genera PDF y abre diálogo de impresión
const { printDocument, downloadPDF, isGenerating } = usePrintDocument()

await printDocument(documentData, companyInfo)
await downloadPDF(documentData, companyInfo, 'factura-0001.pdf')
```

Implementar con:
- `html2canvas` para capturar el template renderizado
- `jsPDF` para crear el PDF
- `window.print()` como fallback

### 3.3 Modal de vista previa

Crear `frontend/src/components/documents/DocumentPreviewModal.tsx`:
- Muestra `DocumentTemplate` dentro de un modal grande (tamaño A4 escalado)
- Botones: "Imprimir", "Descargar PDF", "Enviar por email" (placeholder), "Cerrar"
- Toggle: "Mostrar precios" (para remitos)

---

## TAREA 4 — Páginas nuevas

### 4.1 `CustomersPage.tsx`

Ruta: `/app/customers`

- Tabla de clientes: nombre, CUIT/DNI, teléfono, email, ciudad, estado (activo/inactivo)
- Búsqueda en tiempo real
- Modal crear/editar cliente
- Botón desactivar (soft delete)
- Al hacer click en un cliente: ver sus documentos relacionados

### 4.2 `SuppliersPage.tsx`

Ruta: `/app/suppliers`

- Igual que clientes pero para proveedores
- Con acceso a sus órdenes de compra

### 4.3 `DocumentsPage.tsx`

Ruta: `/app/documents`

Tabs:
- **"Documentos"**: lista de presupuestos, remitos, facturas, notas de crédito
  - Filtros: tipo, estado, cliente, rango de fechas
  - Columnas: N°, tipo, cliente, fecha, total, estado, acciones
  - Acciones por fila: ver/imprimir, convertir (quote→invoice), anular
- **"Nueva factura / remito / presupuesto"**: formulario con:
  - Selector de tipo (con ícono y descripción)
  - Búsqueda de cliente (o crear nuevo inline)
  - Sucursal
  - Tabla de ítems: buscar producto por nombre/SKU, agregar líneas libres (sin producto), editar cantidad/precio/descuento
  - Configuración de impuestos por ítem
  - Totales automáticos
  - Notas
  - Vista previa antes de emitir

### 4.4 `PurchaseOrdersPage.tsx`

Ruta: `/app/purchases`

Tabs:
- **"Órdenes"**: lista de órdenes con filtros de estado y proveedor
- **"Nueva orden"**: formulario de OC con proveedor, ítems, fecha esperada
- Al recibir una OC: modal de recepción con cantidades recibidas por ítem → actualiza stock

---

## TAREA 5 — Integrar con POS

Modificar `PaymentModal.tsx` (Fase 1) para que después de una venta exitosa ofrezca:

```
✅ Venta confirmada
Vuelto: $X

¿Querés generar un comprobante?
[Remito]  [Factura]  [Solo recibo simple]
```

Al elegir Remito o Factura:
- Si hay cliente seleccionado en el POS → pre-llenado
- Si no → opción de buscar/crear cliente
- Abrir `DocumentPreviewModal` con el documento ya generado

---

## TAREA 6 — Sidebar actualizado

Agregar en el sidebar de `AppLayout.tsx` (visible para OWNER y MANAGER):
- 👥 **Clientes** → `/app/customers`
- 🏭 **Proveedores** → `/app/suppliers`
- 📄 **Documentos** → `/app/documents`
- 📦 **Compras** → `/app/purchases`

---

## CRITERIOS DE ÉXITO

- ✅ Se puede crear un presupuesto, convertirlo a factura, e imprimir/descargar PDF
- ✅ Se puede crear un remito que descuente stock automáticamente
- ✅ Se puede crear una OC, enviarla, y al recibir la mercadería actualiza el inventario
- ✅ Los documentos tienen número correlativo único por empresa y tipo
- ✅ La plantilla imprime correctamente en A4 (márgenes, fuentes, tablas)
- ✅ Desde el POS se puede generar remito o factura post-venta
- ✅ Las notas de crédito revierten el stock correctamente
