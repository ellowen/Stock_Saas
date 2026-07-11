# Relevamiento de la aplicación GIRO

Documento de referencia para verificar que la app funcione correctamente. Incluye rutas, API, flujos críticos y checklist de verificación.

---

## 1. Frontend – Rutas

| Ruta | Página | Auth | Descripción |
|------|--------|------|-------------|
| `/` | LandingPage | No | Landing pública, CTA a registro/login |
| `/login` | LoginPage | No | Inicio de sesión |
| `/register` | RegisterPage | No | Registro (empresa → cuenta → confirmación) |
| `/forgot-password` | ForgotPasswordPage | No | Solicitar reset de contraseña |
| `/reset-password` | ResetPasswordPage | No | Nueva contraseña con token |
| `/app` | (redirect) | Sí | Redirige a `/app/dashboard` |
| `/app/dashboard` | DashboardPage | Sí | Resumen, alertas stock bajo |
| `/app/inventory` | InventoryPage | Sí | Productos, stock por sucursal, historial, filtros, reposición |
| `/app/sales` | SalesPage | Sí | POS + historial de ventas |
| `/app/transfers` | TransfersPage | Sí | Traspasos entre sucursales |
| `/app/branches` | BranchesPage | Sí | CRUD sucursales |
| `/app/users` | UsersPage | Sí | CRUD usuarios y roles |
| `/app/reports` | ReportsPage | Sí | Reportes por período, gráficos |
| `/app/plan` | PlanPage | Sí | Plan actual, export, planes disponibles, billing (Stripe/MercadoPago) |
| `/app/settings` | SettingsPage | Sí | Idioma, tema, notificaciones push |
| `/app/customers` | CustomersPage | Sí | CRUD clientes |
| `/app/suppliers` | SuppliersPage | Sí | CRUD proveedores |
| `/app/documents` | DocumentsPage | Sí | Documentos imprimibles (facturas/remitos) |
| `/app/purchases` | PurchaseOrdersPage | Sí | Órdenes de compra |
| `/app/accounts` | AccountsPage | Sí | Cuentas por cobrar |
| `/app/employees` | EmployeesPage | Sí | ABM empleados (Fase 5) |
| `/app/payroll` | PayrollPage | Sí | Liquidación de sueldos (Fase 5) |
| `/app/accounting` | AccountingPage | Sí | Plan de cuentas FACPCE, libro diario, libro IVA, reportes contables (Fase 5) |
| `/app/audit` | AuditPage | Sí | Logs de auditoría |
| `*` | — | — | Redirige a `/` |

---

## 2. Backend – API (base URL según env, ej. `http://localhost:4000`)

### Públicas (sin token)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servidor |
| POST | `/auth/login` | Login (username, password) |
| POST | `/auth/register` | Registro empresa + usuario |
| POST | `/auth/forgot-password` | Enviar email reset |
| POST | `/auth/reset-password` | Nueva contraseña con token |

### Protegidas (Bearer token; algunas requieren rol OWNER/MANAGER)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/protected/me` | Usuario actual (para validar token) |
| GET | `/products` | Listado productos (paginado, filtros) |
| GET | `/products/categories` | Listado categorías |
| GET | `/products/brands` | Listado marcas |
| POST | `/products` | Crear producto con variantes |
| GET | `/inventory` | Listado inventario (filtros, paginado) |
| GET | `/inventory/movements` | Historial movimientos |
| PATCH | `/inventory/quantity` | Set cantidad (y minStock) |
| POST | `/inventory/adjust` | Ajuste delta |
| GET | `/sales` | Listado ventas |
| POST | `/sales` | Crear venta |
| GET | `/stock-transfers` | Listado traspasos |
| POST | `/stock-transfers` | Crear traspaso |
| POST | `/stock-transfers/complete` | Completar traspaso |
| GET | `/branches` | Listado sucursales |
| POST | `/branches` | Crear sucursal (OWNER/MANAGER) |
| DELETE | `/branches/:id` | Eliminar sucursal (OWNER/MANAGER) |
| GET | `/users` | Listado usuarios (OWNER/MANAGER) |
| POST | `/users` | Crear usuario (OWNER/MANAGER) |
| PUT | `/users/:id` | Editar usuario (OWNER/MANAGER) |
| DELETE | `/users/:id` | Eliminar usuario (OWNER/MANAGER) |
| GET | `/analytics/dashboard` | Métricas dashboard |
| GET | `/analytics/overview` | Overview reportes (OWNER/MANAGER) |
| GET | `/analytics/report-detail` | Detalle por fechas |
| GET | `/analytics/products-without-movement` | Productos sin movimiento |
| GET | `/analytics/top-products` | Top productos |
| GET | `/analytics/sales-by-day` | Ventas por día |
| GET/POST/PUT/DELETE | `/customers` | CRUD clientes |
| GET/POST/PUT/DELETE | `/suppliers` | CRUD proveedores |
| GET/POST | `/documents` | Documentos imprimibles |
| GET/POST/PUT/DELETE | `/purchase-orders` | Órdenes de compra |
| GET/POST | `/accounts-receivable` | Cuentas por cobrar |
| GET/POST/PATCH | `/stock-counts` | Conteos de stock |
| GET/POST | `/batches` | Lotes de inventario |
| GET/POST | `/attributes` | Atributos de producto (talle/color) |
| GET/POST | `/tax-configs` | Configuración de impuestos |
| GET | `/permissions` | Permisos por rol |
| GET | `/audit-logs` | Logs de auditoría |
| GET/POST | `/billing` | Suscripción (Stripe/MercadoPago), límites por plan |
| GET/POST/DELETE | `/push` | Web Push: vapid-public-key, subscribe, unsubscribe |
| GET/POST/PUT/DELETE | `/employees` | ABM empleados (Fase 5) |
| GET/POST/PATCH/DELETE | `/payrolls` | Liquidación de sueldos, anticipos (Fase 5) |
| GET/POST/PUT | `/accounts-chart` | Plan de cuentas FACPCE (Fase 5) |
| GET/POST | `/journal` | Libro diario: asientos manuales/automáticos, confirmar, anular (Fase 5) |
| GET | `/iva-book` | Libro IVA ventas/compras/balance (Fase 5) |
| GET | `/accounting-reports` | Balance de sumas y saldos, libro mayor, estado de resultados (Fase 5) |

---

## 3. Flujos críticos a verificar

- **Login**: usuario/contraseña → token → redirección a `/app/dashboard`.
- **Registro**: 3 pasos (empresa, cuenta, confirmación) → trial 3 meses → redirección a login o app.
- **Inventario**: listar productos/stock, filtros (categoría, marca, stock bajo, precio), crear producto, editar cantidad, export CSV/Excel/PDF, etiquetas.
- **Ventas**: elegir sucursal, agregar ítems (búsqueda/SKU/barras), cobrar, recibo descargable.
- **Traspasos**: crear (origen, destino, ítems), completar en destino.
- **Sucursales**: listar, crear, eliminar.
- **Usuarios**: listar, crear, editar (rol, sucursal), eliminar.
- **Reportes**: rango de fechas, gráficos, tablas, productos sin movimiento.
- **Plan**: ver plan actual, export backup, modal planes (mock pago).
- **Olvidé contraseña**: email → link reset → nueva contraseña.
- **Modo oscuro**: toggle en páginas públicas y persistencia al cargar.
- **i18n**: cambio de idioma (es/en) en pantallas traducidas.
- **Empleados (Fase 5)**: alta con sueldo bruto y fecha de ingreso, baja. ✅ Verificado 2026-07-11.
- **Payroll (Fase 5)**: "Calcular todos" genera borradores del período, confirmar, marcar pagado (dispara asiento automático si `accountingEnabled`). ✅ Verificado 2026-07-11.
- **Contabilidad (Fase 5)**: generar plan de cuentas FACPCE, asiento manual, confirmar asiento, balance de sumas y saldos. ✅ Verificado 2026-07-11. Libro IVA y libro mayor/estado de resultados: pendiente de probar con datos reales.

---

## 4. Checklist de verificación manual (resumen)

- [ ] Landing carga y enlaces a login/registro.
- [ ] Login con usuario válido e inválido; “Olvidé contraseña” visible.
- [ ] Registro completo 3 pasos y mensaje de confirmación.
- [ ] Dashboard muestra métricas y alertas de stock bajo.
- [ ] Inventario: pestañas Productos / Stock / Historial; filtros (categoría, marca, stock bajo, precio); crear producto; editar cantidad; export y etiquetas.
- [ ] Ventas: selección sucursal, búsqueda ítems, cobro, recibo.
- [ ] Traspasos: crear y completar.
- [ ] Sucursales: crear y listar (eliminar si aplica).
- [ ] Usuarios: listar, crear, editar, eliminar (según rol).
- [ ] Reportes: fechas y datos coherentes.
- [ ] Plan: pantalla y export backup.
- [ ] Rutas protegidas redirigen a login sin token; con token cargan bien.
- [ ] Rate limiting: muchas peticiones seguidas reciben 429.
- [ ] Modo oscuro y i18n según implementación.
- [x] Empleados: alta y baja. (2026-07-11)
- [x] Payroll: calcular todos, confirmar, marcar pagado. (2026-07-11)
- [x] Contabilidad: plan de cuentas, asiento manual, confirmar, balance de sumas y saldos. (2026-07-11)
- [ ] Contabilidad: libro IVA, libro mayor, estado de resultados, auto-journal automático (ventas/compras/sueldos con `accountingEnabled`).

---

## 5. Tests automatizados

### Backend (API) – Jest + supertest

- Ubicación: `backend/src/__tests__/*.test.ts`
- Comando: `npm test` (desde `backend/`). Requiere `.env` con `DATABASE_URL` y `JWT_SECRET`.
- Incluye: GET /health (200), POST /auth/login validación (400/401), rutas protegidas sin token o con token inválido (401).

### Frontend – Vitest + React Testing Library

- Ubicación: `frontend/src/**/*.test.tsx` (o `.test.ts`)
- Comando: `npm test` (desde `frontend/`)
- Incluye: renderizado de App en /, /login, redirección de rutas desconocidas; setup en `src/test/setup.ts`.

### Ejecutar todos los tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

## 6. Acceso en red local (LAN) y HTTPS

El frontend en desarrollo está configurado para:

- **Escuchar en toda la red**: `host: true` en Vite, así otros dispositivos en la misma red pueden abrir la app.
- **HTTPS**: certificado autofirmado (plugin `@vitejs/plugin-basic-ssl`). La primera vez el navegador mostrará una advertencia; hay que aceptar (p. ej. "Avanzado" → "Continuar a ...") para cargar la página.

**Pasos para que un compañero acceda:**

1. En la PC donde corre el proyecto: levantar backend (`cd backend && npm run dev`) y frontend (`cd frontend && npm run dev`).
2. En la consola del frontend, Vite mostrará algo como `https://192.168.x.x:5173` (y también `https://localhost:5173`). La IP es la de tu PC en la red local.
3. Desde el otro equipo (misma Wi‑Fi o red): abrir en el navegador **https://TU_IP:5173** (ej. `https://192.168.1.10:5173`).
4. Aceptar la advertencia del certificado autofirmado si aparece.
5. Las llamadas a la API se hacen contra la misma PC que sirve el frontend (proxy a `localhost:4000`), por lo que el backend debe estar corriendo ahí.

---

## 7. Variables de entorno

- **Backend**: ver `backend/.env.example` (DB, JWT, nodemailer, etc.).
- **Frontend**: ver `frontend/.env.example` (ej. `VITE_API_URL` para producción).

Actualizado 2026-07-11: rutas y endpoints de Fase 5 (empleados, payroll, contabilidad) y de los módulos de clientes/proveedores/documentos/compras/facturación agregados a las tablas; antes solo cubrían el MVP inicial.
