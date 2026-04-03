# Prompt — Fase 1: Base genérica + UI nueva

Copiá y pegá este prompt completo en una nueva conversación de Claude Code.

---

## CONTEXTO DEL PROYECTO

Estoy trabajando en **GIRO**, un SaaS de gestión de inventario y punto de venta (POS) construido con:
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS 3 + React Router 7
- **Backend**: Express 5 + TypeScript + Prisma 5 + MySQL
- **Auth**: JWT (access token 15min, refresh 7d)
- **PDF**: jsPDF + html2canvas
- **i18n**: i18next (es/en)

El proyecto está en `C:\Dev\Stock_Saas` con subcarpetas `frontend/` y `backend/`.

Leé el archivo `CLAUDE.md` en la raíz del proyecto antes de empezar.

---

## OBJETIVO DE ESTA FASE

Quiero transformar GIRO de un sistema pensado para **ropa** (con campos hardcodeados "Talle" y "Color") en un sistema **universal** que sirva para cualquier tipo de negocio (ferretería, pinturería, farmacia, librería, etc.), y al mismo tiempo **rediseñar completamente la UI** para que sea moderna, consistente y fácil de usar.

---

## TAREA 1 — Sistema de atributos flexibles (DB + Backend)

El modelo actual tiene `ProductVariant` con campos `size` (talle) y `color`. Necesito reemplazarlos por un sistema flexible.

### 1.1 Modificar el schema de Prisma

Añadir al `schema.prisma`:

```prisma
model Attribute {
  id        String   @id @default(cuid())
  companyId String
  name      String   // ej: "Color", "Talle", "Medida", "Litros"
  type      AttributeType @default(TEXT)
  options   String?  // JSON array de opciones para type=SELECT, ej: '["Rojo","Azul"]'
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  
  company   Company  @relation(fields: [companyId], references: [id])
  values    ProductVariantAttribute[]
  
  @@unique([companyId, name])
}

model ProductVariantAttribute {
  id          String   @id @default(cuid())
  variantId   String
  attributeId String
  value       String
  
  variant     ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  attribute   Attribute      @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  
  @@unique([variantId, attributeId])
}

enum AttributeType {
  TEXT
  NUMBER
  SELECT
}
```

Modificar `ProductVariant`: **eliminar** los campos `size` y `color`, y añadir la relación:
```prisma
attributes ProductVariantAttribute[]
```

Modificar `Company`: añadir campo `industryType String? @default("GENERIC")`.

Crear migración: `npx prisma migrate dev --name flex-attributes`

### 1.2 Perfiles de industria predefinidos

Crear `backend/src/application/attributes/industry-profiles.ts` con perfiles:

```typescript
export const INDUSTRY_PROFILES: Record<string, { name: string; attributes: { name: string; type: string; options?: string[] }[] }> = {
  CLOTHING: {
    name: "Indumentaria / Ropa",
    attributes: [
      { name: "Talle", type: "SELECT", options: ["XS","S","M","L","XL","XXL","XXXL"] },
      { name: "Color", type: "TEXT" },
    ]
  },
  HARDWARE: {
    name: "Ferretería / Construcción",
    attributes: [
      { name: "Medida", type: "TEXT" },
      { name: "Material", type: "SELECT", options: ["Acero","Hierro","Aluminio","PVC","Madera","Plástico"] },
      { name: "Color", type: "TEXT" },
    ]
  },
  PAINT: {
    name: "Pinturería",
    attributes: [
      { name: "Color", type: "TEXT" },
      { name: "Litros", type: "SELECT", options: ["0.25","0.5","1","2","4","10","20"] },
      { name: "Acabado", type: "SELECT", options: ["Mate","Satinado","Brillante","Semibrillante"] },
    ]
  },
  PHARMACY: {
    name: "Farmacia / Salud",
    attributes: [
      { name: "Presentación", type: "SELECT", options: ["Comprimidos","Jarabe","Crema","Inyectable","Gotas","Cápsulas"] },
      { name: "Dosis", type: "TEXT" },
      { name: "Laboratorio", type: "TEXT" },
    ]
  },
  FOOD: {
    name: "Alimentos / Bebidas",
    attributes: [
      { name: "Peso/Volumen", type: "TEXT" },
      { name: "Sabor", type: "TEXT" },
    ]
  },
  STATIONERY: {
    name: "Librería / Papelería",
    attributes: [
      { name: "Color", type: "TEXT" },
      { name: "Tamaño", type: "SELECT", options: ["A4","A5","A3","Carta","Oficio"] },
    ]
  },
  GENERIC: {
    name: "Genérico (sin atributos predefinidos)",
    attributes: []
  }
}
```

### 1.3 Endpoints nuevos para atributos

Crear `backend/src/application/attributes/attribute.service.ts`:
- `listAttributes(companyId)` → lista los atributos de la empresa
- `createAttribute(companyId, data)` → crear nuevo atributo
- `updateAttribute(id, companyId, data)` → editar atributo
- `deleteAttribute(id, companyId)` → eliminar (solo si no tiene valores en uso)
- `applyIndustryProfile(companyId, profileKey)` → crear los atributos del perfil elegido

Crear router en `backend/src/infrastructure/http/routers/attributes.router.ts`:
- `GET /attributes` → lista
- `POST /attributes` → crear
- `PUT /attributes/:id` → editar
- `DELETE /attributes/:id` → eliminar
- `POST /attributes/apply-profile` → aplicar perfil

Registrar el router en `app.ts`.

### 1.4 Actualizar `product.service.ts`

- En `createProductWithVariants` y `updateProduct`: las variantes ya no reciben `size`/`color`, sino un array de `attributes: [{attributeId, value}]`
- Al listar productos y variantes, incluir siempre `attributes` con el nombre del atributo y su valor
- En queries de `analytics.service.ts`: reemplazar referencias a `size`/`color` por los atributos de la variante como pares clave-valor

### 1.5 Migración de datos existentes

Crear script `backend/prisma/migrate-attributes.ts`:
- Para cada empresa con datos existentes, crear atributos "Talle" y "Color"
- Para cada `ProductVariant` que tenga `size` o `color`, crear los `ProductVariantAttribute` correspondientes
- Ejecutar después de la migración de schema

---

## TAREA 2 — Rediseño UI: Design System

### 2.1 Tokens de diseño en Tailwind

Actualizar `frontend/tailwind.config.cjs` para agregar un design system consistente:

```javascript
theme: {
  extend: {
    colors: {
      primary: { 50: '...', 100: '...', ..., 900: '...' },  // azul corporativo
      surface: { DEFAULT: '#ffffff', dark: '#1e1e2e' },
      muted: { DEFAULT: '#6b7280', dark: '#9ca3af' },
    },
    borderRadius: {
      card: '12px',
      modal: '16px',
    },
    boxShadow: {
      card: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
      modal: '0 20px 60px -10px rgba(0,0,0,0.3)',
    }
  }
}
```

### 2.2 Componentes UI reutilizables

Crear en `frontend/src/components/ui/`:

**`Modal.tsx`** — Modal genérico con portal y trap focus:
- Props: `open`, `onClose`, `title`, `size` (sm/md/lg/xl/full), `children`, `footer`
- Overlay con blur, cierre con Escape, scroll lock del body
- Animación de entrada/salida con CSS transition

**`DataTable.tsx`** — Tabla de datos con:
- Props: `columns`, `data`, `loading`, `empty`, `pagination`, `onSort`, `onExport`
- Skeleton rows mientras carga
- Estado vacío ilustrado con ícono y mensaje
- Export integrado (CSV)

**`FormField.tsx`** — Campo de formulario:
- Props: `label`, `error`, `hint`, `required`, `children`
- Estilos consistentes para label, input, error message

**`Badge.tsx`** — Etiqueta de estado:
- Variantes: `success`, `warning`, `danger`, `info`, `neutral`
- Tamaños: `sm`, `md`

**`Button.tsx`** — Botón con variantes:
- Variantes: `primary`, `secondary`, `ghost`, `danger`
- Tamaños: `sm`, `md`, `lg`
- Estado `loading` con spinner integrado
- Estado `disabled`

**`PageHeader.tsx`** — Header de página:
- Props: `title`, `subtitle`, `actions` (ReactNode), `breadcrumb`
- Consistente en todas las páginas

**`StatCard.tsx`** — Tarjeta de métrica:
- Props: `title`, `value`, `icon`, `trend` (up/down/neutral), `color`

**`EmptyState.tsx`** — Estado vacío:
- Props: `icon`, `title`, `description`, `action` (botón opcional)

**`SearchInput.tsx`** — Input de búsqueda con debounce:
- Props: `value`, `onChange`, `placeholder`, `debounce` (ms)
- Ícono de lupa, botón X para limpiar

**`Select.tsx`** — Select mejorado:
- Props: `options`, `value`, `onChange`, `placeholder`, `loading`
- Compatible con modo oscuro

### 2.3 AppLayout renovado

Rediseñar `frontend/src/layout/AppLayout.tsx`:
- **Sidebar**: colapsable (modo icono solamente), smooth transition
- **Header**: logo, nombre de empresa, nombre de usuario, switch de tema, selector de idioma, botón de logout
- **Breadcrumbs**: ruta actual navegable
- **Indicador de sucursal activa**: badge en header o sidebar
- **Acceso rápido**: botón "Nueva venta" siempre visible en el header
- Responsive: sidebar como drawer en mobile

---

## TAREA 3 — Refactorizar páginas grandes

### 3.1 InventoryPage → sub-componentes

Leer el archivo actual completo y dividirlo en:

```
frontend/src/pages/inventory/
├── InventoryPage.tsx          (orquestador, solo estado global y tabs)
├── tabs/
│   ├── ProductsTab.tsx        (tabla de productos con search/filter)
│   ├── StockTab.tsx           (tabla de stock por sucursal)
│   └── MovementsTab.tsx       (historial de movimientos)
├── modals/
│   ├── ProductFormModal.tsx   (crear/editar producto)
│   ├── VariantManager.tsx     (gestión de variantes con atributos flex)
│   ├── StockEditModal.tsx     (ajuste de cantidad)
│   └── LabelPrintModal.tsx    (vista previa e impresión de etiquetas)
└── hooks/
    ├── useProducts.ts         (fetch, CRUD de productos)
    ├── useStock.ts            (fetch, ajuste de stock)
    └── useMovements.ts        (fetch del historial)
```

**Importante**: el `VariantManager` debe usar el nuevo sistema de atributos flexibles. Mostrar los atributos de la empresa para completar por variante, con la opción de agregar variantes rápidamente.

### 3.2 SalesPage → sub-componentes

```
frontend/src/pages/sales/
├── SalesPage.tsx              (orquestador con tabs)
├── tabs/
│   ├── POSTab.tsx             (punto de venta)
│   └── SalesHistoryTab.tsx    (historial)
├── components/
│   ├── ProductSearch.tsx      (búsqueda con autocomplete)
│   ├── CartItem.tsx           (ítem del carrito)
│   ├── PaymentModal.tsx       (cobro con métodos de pago)
│   └── ReceiptView.tsx        (recibo post-venta)
└── hooks/
    ├── useCart.ts             (estado del carrito)
    └── useSales.ts            (fetch historial, crear venta)
```

### 3.3 ReportsPage → sub-componentes

```
frontend/src/pages/reports/
├── ReportsPage.tsx
├── sections/
│   ├── SalesSummary.tsx
│   ├── TopProducts.tsx
│   ├── SalesByDay.tsx
│   ├── PaymentBreakdown.tsx
│   ├── PeriodComparison.tsx
│   └── NoMovementReport.tsx
└── hooks/
    └── useReports.ts
```

---

## TAREA 4 — i18n completo

### 4.1 Completar archivos de traducción

Actualizar `frontend/src/i18n/locales/es.json` y `en.json` con claves para TODAS las pantallas que no están traducidas aún:

- Inventario: todos los labels de tabla, modales, filtros, exports
- Ventas: POS, carrito, métodos de pago, recibo, historial
- Traspasos: formulario, tabla, estados
- Reportes: métricas, gráficos, exports
- Sucursales: formulario, tabla
- Usuarios: formulario, roles, tabla
- Atributos: nuevo módulo (gestión de atributos de la empresa)
- Errores: mensajes de error del backend traducidos

### 4.2 Eliminar textos hardcodeados

Reemplazar TODOS los strings en español hardcodeados en los componentes por llamadas `t('clave')`. No debe quedar ningún texto visible al usuario que no sea una clave de traducción.

---

## TAREA 5 — Pantalla de configuración de empresa (nueva)

Crear `frontend/src/pages/settings/SettingsPage.tsx` con tabs:

**Tab "Empresa"**:
- Editar nombre, tipo de industria, CUIT/RUC/NIT, dirección, teléfono, email
- Subir logo (base64 en DB por ahora, o URL)
- Selector de moneda (ARS, USD, MXN, CLP, COP, EUR, etc.)
- Zona horaria

**Tab "Atributos de variantes"**:
- Lista de atributos de la empresa (nombre, tipo, opciones)
- Agregar/editar/eliminar atributos
- Botón "Usar perfil de industria" → seleccionar perfil predefinido y aplicar atributos

**Tab "Facturación"** (preparado pero funcional):
- Ver plan actual
- Enlace a PlanPage

Agregar ruta `/app/settings` y entrada en el sidebar (ícono de engranaje).

---

## GUÍA DE IMPLEMENTACIÓN

1. **Empezar por la DB** (Tarea 1.1): hacer la migración primero porque todo lo demás depende de ella
2. Implementar los endpoints de backend (Tareas 1.2-1.4)
3. Construir los componentes UI base (Tarea 2.2) antes de refactorizar páginas
4. Refactorizar páginas una por una (Tarea 3), empezando por InventoryPage
5. Completar i18n al final (Tarea 4), cuando los componentes ya estén estables
6. Crear la pantalla de Settings (Tarea 5)

## CRITERIOS DE ÉXITO

- ✅ Una empresa de ferretería puede crear variantes con atributos "Medida" y "Material" sin ver ni una mención a "Talle" o "Color"
- ✅ Ningún texto visible al usuario está hardcodeado en el código (todo usa `t()`)
- ✅ Todos los componentes UI usan el design system consistente
- ✅ InventoryPage, SalesPage y ReportsPage están divididas en sub-componentes de menos de 300 líneas c/u
- ✅ La pantalla de Settings permite configurar los atributos de la empresa
- ✅ El perfil de industria puede aplicarse al crear la empresa o desde Settings

---

## NOTAS IMPORTANTES

- Mantener compatibilidad hacia atrás: las empresas existentes con datos de "Talle"/"Color" deben seguir funcionando después del migration script
- No tocar la lógica de autenticación ni el sistema de refresh tokens
- No modificar el sistema de sucursales ni de traspasos en esta fase
- Usar los componentes `ui/` nuevos en todo código nuevo, no Tailwind directo en páginas
