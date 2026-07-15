# Frontend — Detalle de arquitectura

Ver `ARCHITECTURE.md` para el árbol general y `STATE_MANAGEMENT.md` para el manejo de estado.

## Estructura por página

`pages/<modulo>/<Modulo>Page.tsx` orquesta la pantalla; `tabs/` si tiene tabs (ej. Inventory con 5 tabs, Settings con 5 tabs); `components/` para piezas propias del módulo que no se comparten; `hooks/` para el hook de datos del módulo (`useSales`, `useStock`, `useReports`, etc.).

## Wrapper de API (`lib/api.ts`)

`authFetch()` es el estándar: agrega el JWT, maneja refresh de token en 401, redirige a `/login` o `/app/plan` según el código de error. **No todas las páginas lo usan** — `CustomersPage.tsx` y `AuditPage.tsx` hacen `fetch()` crudo (ver `ERROR_HANDLING.md`), rompiendo el manejo uniforme de sesión en esas dos pantallas específicamente.

## Otras utilidades de `lib/`

`format.ts` (formato de moneda/fecha), `pdf.ts` (wrapper de jsPDF, usado por Reports y Documents), `thermal-printer.ts` (Web Bluetooth/Serial para impresora térmica, sin persistencia backend).

## Sin librería de estado global

Ver `STATE_MANAGEMENT.md` — Context solo para lo verdaderamente transversal (Auth, Toast, Theme), hooks por módulo para todo lo demás.

## Enums del backend reflejados a mano en el frontend

Varios `enum` de Prisma tienen su contraparte de labels/traducciones en TypeScript del frontend (ej. `MOVEMENT_TYPE_LABELS` para `InventoryMovementType`, `ROLE_DEFAULT_PERMISSIONS` en `AuthContext.tsx` como espejo de `ROLE_DEFAULTS` del backend). **No hay generación automática** de estos espejos desde el schema — cada vez que se agrega un valor a un enum backend, hay que recordar actualizar manualmente su contraparte de frontend. Confirmado que esto ya falló al menos una vez: `MOVEMENT_TYPE_LABELS` le faltan 3 de 8 valores (ver `modules/Inventory.md`).

## Riesgo a vigilar

Cualquier cambio a un enum de Prisma debería venir acompañado de un grep del mismo valor en el frontend para encontrar el mapa de labels correspondiente — no hay hoy una verificación automática (tipo test) que garantice que ambos lados están sincronizados.
