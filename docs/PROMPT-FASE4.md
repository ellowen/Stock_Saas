# PROMPT-FASE4 — POS Avanzado

> Referencia de implementación punto a punto. Leer este archivo al inicio de cada sesión de Fase 4.

---

## Estado de tareas

| # | Tarea | Estado |
|---|-------|--------|
| 4.1 | Cliente en el POS (buscar/crear al momento de la venta) | ✅ Hecho |
| 4.2 | Descuentos en el POS (por ítem y sobre el total) | ✅ Hecho |
| 4.3 | Devoluciones / anulación de venta | ✅ Hecho |
| 4.4 | Cuenta corriente (ventas en crédito + registro de pagos) | ✅ Hecho |
| 4.5 | Impresora térmica 80mm (Web Serial API) | ✅ Hecho |

> Propinas y Mesa/turno quedan como opcionales post-fase.
> Lector de barras ya funciona vía teclado — no requiere cambios.
> Cajón de dinero: señal simple vía Web Serial, se puede incluir en 4.5.

Orden: de mayor valor inmediato a más complejo / opcional.

---

## 4.1 — Cliente en el POS

### Objetivo
Al momento de la venta, el SELLER puede buscar un cliente existente o crear uno nuevo. El cliente queda asociado a la venta y al documento generado post-venta.

### Backend
- `Sale` ya tiene campo `customerId Int?` en schema — no requiere migración.
- `POST /api/sales` ya acepta `customerId` opcionalmente. Verificar que el sales controller lo pase.
- `GET /api/customers?search=&page=&pageSize=` — ya existe (Fase 2).

### Frontend — POSTab
- Nuevo componente `CustomerSearchInput` (en `frontend/src/pages/sales/components/`):
  - Input de búsqueda con debounce (300ms)
  - Dropdown con resultados de la API `/customers`
  - Opción "Crear cliente rápido" al final de la lista si no hay match exacto
  - Muestra nombre + taxId del cliente seleccionado
  - Botón para desvincular
- En POSTab: agregar estado `customerId: number | null` y `customerName: string`
- Pasar `customerId` al `onCreateSale`
- En `handleGenerateDocument`: incluir `customerId` en el body del POST `/api/documents`

### Quick-create de cliente
- Modal simple (nombre + taxId opcional) que hace `POST /api/customers`
- Al crear, selecciona automáticamente el cliente recién creado

### i18n
`sales.customerLabel`, `sales.customerSearch`, `sales.customerPlaceholder`,
`sales.customerDetach`, `sales.customerCreate`, `sales.customerQuickCreate`,
`sales.customerQuickCreateTitle`, `sales.customerName`, `sales.customerTaxId`

---

## 4.2 — Descuentos en el POS

### Objetivo
- **Por ítem**: campo de descuento en `CartItem` (% o monto fijo)
- **Global**: descuento sobre el total del carrito antes de cobrar

### DB
- `SaleItem`: agregar `discount Decimal? @default(0) @map("discount")` — monto descontado por unidad
- `Sale`: agregar `discountTotal Decimal? @default(0) @map("discount_total")` — descuento global
- Migración: `add_discounts`

### Backend
- `SaleItemInput`: agregar `discount?: number`
- `CreateSaleInput`: agregar `discountTotal?: number`
- En `createSale`: al calcular `totalAmount`, restar descuentos. Guardar en `SaleItem.discount` y `Sale.discountTotal`.

### Frontend
- `CartItem`: agregar botón/input para descuento (toggle entre % y monto)
- `PaymentModal`: mostrar subtotal, descuento global (input), total final
- Total del carrito: `(precio * qty - descuentoItem) sumados - descuentoGlobal`
- Recibo: mostrar línea de descuento si hay descuento

### i18n
`sales.discount`, `sales.discountPct`, `sales.discountFixed`, `sales.discountGlobal`,
`sales.discountGlobalLabel`, `sales.subtotal`

---

## 4.3 — Devoluciones / anulación de venta

### Objetivo
Desde el historial de ventas, poder:
- **Anular** una venta completa (reversa todos los movimientos de stock, marca Sale como CANCELLED)
- **Devolver ítems** parciales (seleccionar ítems y cantidades, genera movimiento de entrada de stock)

### DB
- `Sale`: ya tiene `SaleStatus` enum. Agregar valor `REFUNDED` si no existe.
- Nueva tabla `SaleReturn`:
  ```prisma
  model SaleReturn {
    id        Int      @id @default(autoincrement())
    saleId    Int      @map("sale_id")
    companyId Int      @map("company_id")
    userId    Int      @map("user_id")
    reason    String?
    total     Decimal  @db.Decimal(10,2)
    createdAt DateTime @default(now()) @map("created_at")
    items     SaleReturnItem[]
    sale      Sale     @relation(...)
    user      User     @relation(...)
    company   Company  @relation(...)
    @@map("sale_returns")
  }
  model SaleReturnItem {
    id         Int   @id @default(autoincrement())
    returnId   Int   @map("return_id")
    variantId  Int   @map("variant_id")
    quantity   Int
    unitPrice  Decimal @db.Decimal(10,2) @map("unit_price")
    saleReturn SaleReturn @relation(...)
    variant    ProductVariant @relation(...)
    @@map("sale_return_items")
  }
  ```
- Migración: `add_sale_returns`

### Backend
- `POST /api/sales/:id/cancel` → anula venta (solo si status=COMPLETED), restaura stock con movimiento `SALE_RETURN`
- `POST /api/sales/:id/return` → devuelve ítems parciales, crea `SaleReturn`, restaura stock
- Nuevo `InventoryMovementType`: `SALE_RETURN`

### Frontend
- En `SalesPage` > tab Historial: botón "Anular" y "Devolver" por venta
- Modal de devolución: lista de ítems de la venta, input de cantidad a devolver por ítem, campo motivo
- Mostrar ventas anuladas con badge "Anulada" en el historial

### i18n
`sales.cancel`, `sales.cancelConfirm`, `sales.cancelled`, `sales.return`,
`sales.returnTitle`, `sales.returnReason`, `sales.returnQty`, `sales.returnConfirm`,
`sales.returnSuccess`, `sales.statusCANCELLED`, `sales.statusREFUNDED`

---

## 4.4 — Cuenta corriente

### Objetivo
Ventas "en cuenta" (crédito): el cliente no paga en el momento. Se registra la deuda y se puede saldar parcial o totalmente después.

### DB
```prisma
model AccountReceivable {
  id          Int      @id @default(autoincrement())
  companyId   Int      @map("company_id")
  customerId  Int      @map("customer_id")
  saleId      Int?     @map("sale_id")
  amount      Decimal  @db.Decimal(10,2)
  paid        Decimal  @default(0) @db.Decimal(10,2)
  dueDate     DateTime? @map("due_date")
  status      ARStatus @default(PENDING)
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")
  payments    ARPayment[]
  ...relations
  @@map("accounts_receivable")
}
model ARPayment {
  id             Int      @id @default(autoincrement())
  receivableId   Int      @map("receivable_id")
  amount         Decimal  @db.Decimal(10,2)
  method         PaymentMethod
  notes          String?
  createdAt      DateTime @default(now()) @map("created_at")
  receivable     AccountReceivable @relation(...)
  @@map("ar_payments")
}
enum ARStatus { PENDING PARTIAL PAID OVERDUE }
```

### Backend
- `POST /api/sales` acepta `paymentMethod: "CREDIT"` — crea venta + `AccountReceivable`
- `GET /api/accounts-receivable?customerId=&status=` — lista deudas
- `POST /api/accounts-receivable/:id/pay` — registra pago parcial o total

### Frontend
- En PaymentModal: agregar método "En cuenta" (solo si hay cliente seleccionado)
- Nueva sección en CustomersPage o página independiente `/app/accounts` para ver y gestionar cuentas corrientes
- Widget en Dashboard: total de deuda pendiente

### i18n
`sales.paymentCredit`, `accounts.title`, `accounts.balance`, `accounts.pay`, etc.

---

## 4.5 — Impresora térmica 80mm (Web Serial API)

### Objetivo
Imprimir el recibo directamente en una impresora térmica de 80mm compatible con ESC/POS.

### Implementación
- Módulo `frontend/src/lib/thermal-printer.ts`:
  - `connect()` → `navigator.serial.requestPort()`, abre el puerto
  - `printReceipt(data: ReceiptPrintData)` → genera bytes ESC/POS:
    - Initialize printer (`ESC @`)
    - Center + bold para nombre de empresa
    - Normal text para ítems, totales
    - Cut paper (`GS V 0`)
  - `disconnect()`
- Detectar soporte: `'serial' in navigator`
- En SettingsPage: botón "Conectar impresora" (solo si Web Serial disponible)
- En POSTab: tras venta exitosa, si hay impresora conectada → imprimir automáticamente

### ESC/POS básico (bytes)
```
ESC @ = [0x1B, 0x40]         // Initialize
ESC a 1 = [0x1B, 0x61, 0x01] // Center align
ESC E 1 = [0x1B, 0x45, 0x01] // Bold on
ESC E 0 = [0x1B, 0x45, 0x00] // Bold off
GS V 0 = [0x1D, 0x56, 0x00]  // Full cut
LF = [0x0A]                   // Line feed
```

### i18n
`settings.thermalPrinter`, `settings.thermalConnect`, `settings.thermalDisconnect`,
`settings.thermalConnected`, `settings.thermalNotSupported`

---

## Notas generales

- Ejecutar en orden: 4.1 → 4.2 → 4.3 → 4.4 → 4.5
- 4.1 y 4.2 no requieren migración de DB (4.1 usa campos existentes)
- 4.3 y 4.4 requieren migración
- 4.5 es puramente frontend, sin backend
