# GIRO — Clothing Stock SaaS

SaaS de gestión de stock para tiendas de ropa. Multi-tenant (por empresa), con productos, variantes (talle/color), inventario por sucursal, punto de venta, traspasos, empleados/sueldos, contabilidad argentina y analytics.

## Requisitos

- **Node.js** 20.19+ o 22.12+ (requerido por Vite 8 en el frontend)
- **MySQL** con base de datos creada
- Cuenta con `root` o usuario con permisos

## Base de datos

Crear la base en MySQL:

```sql
CREATE DATABASE clothing_stock_saas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Configurar en `backend/.env`:

- `DATABASE_URL="mysql://USUARIO:PASSWORD@localhost:3306/clothing_stock_saas"`
- `JWT_SECRET` (y opcionalmente `JWT_REFRESH_SECRET`)

## Cómo correr el proyecto

### 1. Backend (API)

```bash
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

- API: **http://localhost:4000**
- Health: http://localhost:4000/health
- Usuario de prueba (después del seed): usuario `owner`, contraseña `password123` (login por username, no por email)

### 2. Frontend (React)

En **otra terminal**:

```bash
cd frontend
npm install
npm run dev
```

- App: **https://localhost:5173** (certificado autofirmado — el navegador va a pedir aceptar la excepción de seguridad)
- Login con usuario `owner` / `password123`

Si necesitás correr el dev server sin HTTPS (por ejemplo para probarlo con una herramienta que no acepta certificados autofirmados), usá:

```bash
cd frontend
NO_SSL=1 npm run dev
```

## Estructura

- **backend**: Express + TypeScript + Prisma + MySQL. Auth JWT, multi-tenant por `companyId`, rutas de productos, inventario, ventas, traspasos, analytics, sucursales, empleados/sueldos y contabilidad.
- **frontend**: React (Vite) + TypeScript + Tailwind. Login, dashboard, inventario (productos + stock), punto de venta (POS), traspasos, empleados, liquidación de sueldos, plan de cuentas/libro diario/libro IVA.

## Postman

En la raíz del repo hay (o podés generar) una **Collection** y un **Environment** para probar todos los endpoints. Seleccionar el environment y usar `Auth - Login` para guardar el token; el resto de requests usan `{{access_token}}`.
