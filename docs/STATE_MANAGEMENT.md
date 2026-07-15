# STATE_MANAGEMENT — Cómo vive el estado en el frontend

**No hay librería de estado global** (confirmado: `frontend/package.json` no tiene `zustand`, `redux`, `jotai` ni similar). El estado se maneja con tres mecanismos, sin mezclar:

## 1. Context API — solo para lo verdaderamente global

`frontend/src/contexts/`:
- `AuthContext` — usuario logueado, `company`, permisos efectivos (`hasPermission`), `login`/`logout`/`refreshToken`.
- `ToastContext` — cola de notificaciones toast.
- `ThemeContext` — modo claro/oscuro (clase `.dark` en `<html>`).

Regla implícita (no hay un doc que lo diga, pero el código lo respeta): un Context nuevo se justifica solo si el estado lo necesitan módulos no relacionados entre sí. Si el estado es de un solo módulo (ej. el carrito del POS), no es un Context — es un hook local.

## 2. Hooks por módulo — el patrón dominante

Cada página compleja tiene su propio hook de datos en `pages/<modulo>/hooks/` (ej. `useSales`, `useCart`, `useStock`, `useReports`). El hook encapsula: fetch inicial, estado de loading/error, funciones de mutación que llaman a la API y refrescan el estado local. Los componentes de la página consumen el hook, no hacen `fetch` directo (excepción encontrada: `CustomersPage.tsx` y `AuditPage.tsx` hacen `fetch()` crudo en vez de pasar por `authFetch` — ver `ERROR_HANDLING.md`, es una desviación del patrón, no la convención).

## 3. Estado local de componente

`useState`/`useReducer` para todo lo que no necesita sobrevivir a un unmount ni compartirse (inputs de formulario, tabs activos, modales abiertos).

## Persistencia fuera de memoria

- **Ninguna store usa `localStorage` para estado de negocio** salvo casos puntuales explícitos: autosave de borrador de OC (`PurchaseOrdersPage.tsx`, key `oc_draft`) y el token de sesión (JWT access/refresh, manejado por `lib/api.ts`).
- El "hold sale" del POS (pausar una venta) **no** usa `localStorage` — se persiste server-side como `HeldSale` (JSON del carrito), precisamente para que funcione entre dispositivos/turnos. Ver `modules/POS.md`.

## Por qué no hay Zustand/Redux

Es una decisión implícita más que documentada: con Context + hooks por módulo alcanza porque casi todo el estado de negocio vive en el servidor (Prisma/MySQL) y el frontend solo cachea localmente lo que la pantalla actual necesita — no hay un estado "de app" grande que amerite una store centralizada. Si el proyecto crece a necesitar estado compartido entre módulos no relacionados (ej. un carrito que sobrevive navegación entre POS y otra pantalla), ahí valdría reevaluar.
