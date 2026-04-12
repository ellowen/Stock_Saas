# Plan Maestro — GIRO v2.0

## Visión
Convertir GIRO de un sistema de stock para ropa en una plataforma **universal de gestión de inventario y punto de venta**, usable por cualquier tipo de negocio (ferretería, pinturería, librería, farmacia, veterinaria, restaurante, etc.), con UI moderna, documentos imprimibles (remitos, facturas, presupuestos) y arquitectura preparada para escalar.

---

## Diagnóstico actual (problemas a resolver)

| Área | Problema |
|------|----------|
| **Producto** | Variantes hardcodeadas a `talle` + `color` (modelo de ropa) |
| **UI/UX** | Pages gigantes (23k+ tokens), 20+ useState por página, sin componentes reutilizables |
| **Documentos** | Solo recibo básico de venta; no hay remitos, facturas, presupuestos |
| **Genérico** | Labels en español fijo ("Talle", "Color"), no configurable por industria |
| **Roles** | Solo 3 roles fijos (OWNER/MANAGER/SELLER), sin granularidad |
| **Facturación** | PlanPage es un esqueleto, sin integración de pagos real |
| **Mobile** | Responsive pero no optimizado para uso en caja registradora móvil |

---

## Fases de implementación

---

### FASE 1 — Base genérica + UI nueva (PRIORITARIA)
> *Objetivo: que cualquier negocio pueda usar la app tal como está, con buena UI*

#### 1.1 Sistema de atributos flexibles (reemplaza talle/color)
- **DB**: Nueva tabla `Attribute` (id, companyId, name, type: TEXT/NUMBER/SELECT, options[])
- **DB**: `ProductVariantAttribute` (variantId, attributeId, value)
- **DB**: Eliminar columnas `size` y `color` de `ProductVariant` (migración)
- Cada empresa define sus propios atributos: una ferretería puede tener "Medida", "Material", "Marca"; una pinturería "Color", "Litros", "Acabado"
- Al crear una empresa, se puede elegir un **perfil de industria** con atributos preconfigurados:
  - Indumentaria: Talle, Color
  - Ferretería: Medida, Material
  - Pinturería: Color, Litros, Acabado
  - Farmacia: Presentación, Dosis, Laboratorio
  - Genérico: sin atributos por defecto

#### 1.2 Rediseño UI completo
- **Design system**: definir paleta, tipografía, espaciados como variables CSS/Tailwind tokens
- **Componentes nuevos reutilizables**:
  - `<Modal>` — wrapper genérico con portal, Escape, scroll lock
  - `<DataTable>` — tabla con sort, filtros, paginación, export integrado
  - `<FormField>` — input + label + error en un solo componente
  - `<PageHeader>` — título + acciones de página consistentes
  - `<StatCard>` — tarjeta de métrica del dashboard
  - `<EmptyState>` — estado vacío ilustrado
  - `<Badge>` — etiquetas de estado (Pendiente, Activo, Bajo stock, etc.)
- **Páginas a refactorizar** (split en sub-componentes):
  - `InventoryPage` → `ProductsTab`, `StockTab`, `MovementsTab`, `ProductForm`, `VariantManager`
  - `SalesPage` → `POSCart`, `ProductSearch`, `PaymentModal`, `SalesHistory`
  - `ReportsPage` → `SalesSummary`, `TopProductsChart`, `MovementReport`, `ExportPanel`
- **AppLayout**: sidebar colapsable, breadcrumbs, header con accesos rápidos
- **Dashboard**: widgets reordenables, selector de período, acceso rápido a POS

#### 1.3 Internacionalización completa
- Completar claves `es.json` / `en.json` para TODAS las pantallas
- Eliminar cualquier texto hardcodeado en español
- Soporte de `es-AR`, `es-MX`, `es-ES`, `en-US` como locales
- Formato de fecha, moneda y número configurable por empresa

---

### FASE 2 — Documentos imprimibles
> *Objetivo: remitos, facturas, presupuestos listos para imprimir o enviar por email*

#### 2.1 Modelos de documento
- **Presupuesto**: cotización sin impacto en stock
- **Remito**: documento de entrega (descuenta stock, sin precio visible opcional)
- **Factura**: documento fiscal con impuestos, datos del cliente, número correlativo
- **Nota de crédito**: anulación/devolución parcial de una factura
- **Orden de compra**: pedido a proveedor (para recepción de mercadería)

#### 2.2 DB nuevas tablas
- `Customer` (id, companyId, name, taxId/CUIT, address, email, phone, type: PERSONA/EMPRESA)
- `Supplier` (id, companyId, name, taxId, address, email, phone)
- `Document` (id, companyId, type: QUOTE/REMITO/INVOICE/CREDIT_NOTE/PO, number, status, customerId/supplierId, branchId, userId, date, dueDate, notes, subtotal, tax, total)
- `DocumentItem` (id, documentId, variantId, description, quantity, unitPrice, discount, totalPrice)
- `TaxConfig` (id, companyId, name: "IVA 21%", rate: 0.21, default: true)

#### 2.3 Plantillas de impresión
- Diseño configurable (logo de empresa, datos fiscales, colores)
- Formato A4 y media carta
- Generación PDF con jsPDF + html2canvas
- Opción de envío por email (Nodemailer)
- Vista previa antes de imprimir

#### 2.4 Flujos documentales
- **Desde el POS**: al finalizar una venta → opción de generar remito o factura
- **Presupuesto → Factura**: convertir un presupuesto en factura con un click
- **Factura → Nota de crédito**: devoluciones parciales o totales
- **Orden de compra → Recepción**: recibir mercadería actualiza el stock automáticamente

---

### FASE 3 — Stock completo
> *Objetivo: gestión de inventario de nivel profesional*

#### 3.1 Proveedores y compras
- ABM de proveedores
- Órdenes de compra con estado (Borrador, Enviada, Recibida, Cancelada)
- Recepción de mercadería → actualiza stock automáticamente con movimiento PURCHASE_RECEIVE
- Comparativo precio de compra vs precio de venta (margen)

#### 3.2 Inventario avanzado
- **Lotes y vencimientos**: para farmacias, alimentos, etc. (lote, fecha vencimiento por ítem de stock)
- **Ubicaciones**: dentro de una sucursal, posición en góndola/estante (código de rack)
- **Importación masiva**: subir CSV/Excel de productos para carga inicial
- **Ajuste de inventario masivo**: corregir múltiples ítems en una sola operación
- **Inventario físico (conteo)**: crear sesión de conteo, ingresar cantidades reales, generar diferencias, aprobar ajuste

#### 3.3 Alertas y notificaciones
- Email automático cuando producto baja del mínimo configurable
- Resumen diario/semanal de ventas por email (cron job)
- Notificaciones push (Web Push API)
- Alertas de vencimiento de lotes (para industrias que lo usan)

---

### FASE 4 — POS avanzado
> *Objetivo: POS profesional para cualquier industria*

#### 4.1 Mejoras del POS
- **Clientes en el POS**: buscar/crear cliente al momento de la venta
- **Descuentos**: por ítem o sobre el total (porcentaje o monto fijo)
- **Devoluciones**: anular o devolver ítems de una venta anterior
- **Cuenta corriente**: ventas en cuenta (crédito), con seguimiento de deuda y pagos
- **Múltiples impuestos**: IVA configurable por producto o categoría
- **Propinas**: para restaurantes y servicios
- **Mesa/turno** (optional): para gastronomía

#### 4.2 Hardware
- **Impresora térmica**: integración con impresora de 80mm vía Web Serial API o backend proxy
- **Lector de código de barras**: ya funciona por teclado; agregar soporte Web HID
- **Cajón de dinero**: señal de apertura tras venta en efectivo

---

### FASE 5 — Empleados, Sueldos y Contabilidad Argentina
> *Objetivo: administración de RRHH y contabilidad completa para cualquier negocio argentino*

#### 5.1 ABM de Empleados
- Datos del empleado: nombre, CUIL, cargo, categoría de convenio, fecha de ingreso, tipo de contrato (tiempo completo / parcial / plazo fijo / período de prueba)
- CBU para transferencias, obra social, sindicato
- Estado: Activo / Inactivo / En licencia
- Historial de cambios de sueldo
- Relación con sucursal

#### 5.2 Liquidación de sueldos (Argentina)
- Cálculo automático de deducciones del empleado:
  - Jubilación ANSES: 11%
  - Obra social: 3%
  - INSSJP (PAMI): 3%
  - Sindicato: configurable (2-3%)
- Cálculo de aportes patronales (costo empresa):
  - Jubilación patronal: 16%
  - INSSJP patronal: 2%
  - Obra social patronal: 6%
  - ART: configurable
- Conceptos adicionales: horas extras (50%/100%), adicional por antigüedad (1% por año), presentismo
- Porcentajes configurables en Settings (pueden cambiar por decreto)
- Liquidación masiva: calcular todos los empleados del mes en un click

#### 5.3 SAC (Aguinaldo), anticipos y liquidación final
- SAC: 50% del mejor sueldo del semestre → pago en junio y diciembre
- Registro de anticipos de sueldo (descuentan del próximo recibo)
- Liquidación final: sueldo proporcional + vacaciones no gozadas + SAC proporcional + indemnización (si aplica)
- Fórmula indemnización: 1 mes por año trabajado (mínimo 2 meses)

#### 5.4 Plan de cuentas (normas FACPCE)
- Plan de cuentas estándar argentino con jerarquía:
  ```
  1. Activo (Caja, Banco, Mercaderías, IVA CF, Deudores)
  2. Pasivo (Proveedores, IVA DF, Sueldos a pagar, Cargas sociales)
  3. Patrimonio neto (Capital, Resultados acumulados)
  4. Ingresos (Ventas, Otros ingresos)
  5. Egresos (CMV, Sueldos, Cargas sociales, Alquiler, Servicios)
  ```
- Se genera automáticamente al crear la empresa
- Personalizable: agregar/editar/desactivar cuentas

#### 5.5 Asientos contables (Libro Diario)
- Asientos manuales: el usuario carga débitos y créditos (valida partida doble)
- Asientos automáticos generados por:
  - Cada **venta**: Caja/Banco (D) — Ventas (H) — IVA Débito Fiscal (H)
  - Cada **compra recibida**: Mercaderías (D) — IVA CF (D) — Proveedores (H)
  - Cada **pago de sueldo**: Sueldos (D) — Sueldos a pagar (H) — Cargas sociales (H)
- Estado: Borrador → Confirmado (al confirmar, actualiza saldos de cuentas)
- Toggle en Settings para activar/desactivar generación automática

#### 5.6 Libro IVA (Ventas y Compras)
- Registro legal para presentación ante AFIP
- Libro IVA Ventas: fecha, comprobante, cliente (CUIT), neto gravado, IVA 21%, IVA 10.5%, exento, total
- Libro IVA Compras: fecha, proveedor (CUIT), neto, IVA Crédito Fiscal, total
- Balance IVA del período: Débito Fiscal - Crédito Fiscal = saldo a pagar/a favor
- Exportar a CSV (compatible con AFIP / Contaplus / Tango)

#### 5.7 Reportes contables
- **Balance de Sumas y Saldos**: todas las cuentas con débitos, créditos y saldo del período
- **Libro Mayor**: movimientos detallados por cuenta con saldo progresivo
- **Estado de Resultados**: Ingresos vs Egresos → resultado del período (ganancia/pérdida)
- Todos exportables a CSV e imprimibles

---

### FASE 6 — Roles, permisos y auditoría
> *Objetivo: control granular de acceso*

#### 6.1 Sistema de permisos granular
- Tabla `Permission` con todas las acciones posibles del sistema
- Tabla `RolePermission` (roleId, permissionId)
- Roles personalizables por empresa (además de OWNER/MANAGER/SELLER)
- UI de configuración de permisos (matriz de roles x permisos)
- Límites por plan (FREE: 1 sucursal, 3 usuarios; PRO: 5 sucursales, usuarios ilimitados; ENTERPRISE: sin límite)

#### 6.2 Logs de auditoría
- Tabla `AuditLog` (userId, action, entity, entityId, before, after, ip, timestamp)
- Registrar: login, cambio de contraseña, eliminar producto, modificar precio, cambiar rol
- UI de audit trail filtrable por usuario, acción y fecha

---

### FASE 7 — Facturación y monetización
> *Objetivo: cobrar por el uso del software*

- Integración **Stripe** (tarjeta de crédito internacional)
- Integración **MercadoPago** (para Argentina/Latinoamérica)
- Planes con límites reales enforced en el backend
- Portal de cliente (cambiar plan, ver facturas, actualizar método de pago)
- Webhooks de Stripe para sincronizar estado de suscripción

---

## Resumen de cambios en la DB

```
TABLAS YA IMPLEMENTADAS (Fases 1-4):
+ Attribute, ProductVariantAttribute
+ Customer, Supplier
+ Document, DocumentItem, TaxConfig
+ PurchaseOrder, PurchaseOrderItem
+ StockCount, StockCountItem
+ Batch
+ SaleReturn, SaleReturnItem
+ AccountReceivable, ARPayment

FASE 5 — nuevas tablas:
+ Employee              (datos laborales del empleado)
+ Payroll               (liquidación mensual de sueldo)
+ PayrollAdvance        (anticipos de sueldo)
+ Account               (plan de cuentas: Activo, Pasivo, PN, Ingresos, Egresos)
+ JournalEntry          (asientos contables — Libro Diario)
+ JournalLine           (líneas de cada asiento — débito/crédito)

FASE 5 — modificaciones:
~ Company               (agregar artRate, unionRate para % aportes configurables)
~ Inventory             (location, lastAlertAt — ya en fases anteriores)

FASE 6 — nuevas tablas:
+ AuditLog
+ Permission
+ RolePermission

FASE 7 — sin tablas nuevas (integración externa Stripe/MP)
```

---

## Stack tecnológico (sin cambios disruptivos)

| Capa | Tecnología actual | Mantener |
|------|-------------------|----------|
| Frontend | React 19 + Vite + Tailwind | ✅ Sí |
| Backend | Express 5 + TypeScript | ✅ Sí |
| DB | MySQL + Prisma | ✅ Sí |
| Auth | JWT | ✅ Sí |
| PDF | jsPDF + html2canvas | ✅ Sí |
| Email | Nodemailer | ✅ Sí |
| Pagos | — | ➕ Stripe + MercadoPago (Fase 7) |
| WebSockets | — | ➕ Socket.io (stock en tiempo real, futuro) |

---

## Estado de avance

| Fase | Descripción | Estado | Complejidad |
|------|-------------|--------|-------------|
| 1 | Base genérica + UI nueva | ✅ Completa | Alta |
| 2 | Documentos imprimibles | ✅ Completa | Alta |
| 3 | Stock completo | ✅ Completa | Media |
| 4 | POS avanzado | ✅ Completa | Media |
| 5 | Empleados + Contabilidad Argentina | 🔄 En curso | Alta |
| 6 | Roles, permisos y auditoría | ⬜ Pendiente | Media |
| 7 | Facturación/monetización | ⬜ Pendiente | Alta |
