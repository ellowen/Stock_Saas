# Clothing Stock SaaS

SaaS de gestión de stock para tiendas de ropa. Multi-tenant (por empresa), con productos, variantes (talle/color), inventario por sucursal, punto de venta, traspasos y analytics.

## Requisitos

- **Node.js** 18+ (recomendado 20+ para el frontend)
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
- Usuario de prueba (después del seed): `owner@example.com` / `password123`

### 2. Frontend (React)

En **otra terminal**:

```bash
cd frontend
npm install
npm run dev
```

- App: **http://localhost:5173**
- Login con `owner@example.com` / `password123`

Si el frontend no arranca por versión de Node (Vite 7 requiere Node 20+), usar Node 18 con:

```bash
cd frontend
npm install vite@5.4.10 @vitejs/plugin-react@4.3.4
npm run dev
```

## Estructura

- **backend**: Express + TypeScript + Prisma + MySQL. Auth JWT, multi-tenant por `companyId`, rutas de productos, inventario, ventas, traspasos, analytics y sucursales.
- **frontend**: React (Vite) + TypeScript + Tailwind. Login, dashboard, inventario (productos + stock), punto de venta (POS), traspasos.

## Postman

En la raíz del repo hay (o podés generar) una **Collection** y un **Environment** para probar todos los endpoints. Seleccionar el environment y usar `Auth - Login` para guardar el token; el resto de requests usan `{{access_token}}`.
