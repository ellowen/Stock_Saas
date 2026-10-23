# GIRO - tests end-to-end (Playwright)

## Correr

```bash
cd e2e
npm install
npx playwright install chromium
npm test                 # headless
npm run test:headed      # viendo el navegador
npm run report           # reporte HTML del último run
```

Requisitos: MySQL arriba con `backend/.env` configurado y la base sembrada (`cd backend && npm run seed`).
Si backend (4000) y frontend (5173) no están corriendo, Playwright los levanta solo.

Contra el build de producción (PWA):

```bash
cd frontend && NO_SSL=1 npm run demo      # en otra terminal
cd e2e && E2E_BASE_URL=http://localhost:4173 npm test
```

## Qué cubre

| Spec | Qué prueba |
|------|-----------|
| `full-flow.spec.ts` | Registro de empresa nueva, login correcto/incorrecto, sucursal por defecto, alta de encargado y vendedor desde la UI, bloqueo de escalada de privilegios (MANAGER -> OWNER), alta de producto con 2 variantes, carga de stock inicial, venta desde el POS con el vendedor, descuento de stock, historial visible para el encargado, aislamiento multi-tenant entre empresas, logout y rutas protegidas. |
| `smoke.spec.ts` | Los 19 módulos de `/app/*` cargan sin errores JS ni 5xx (empresa del seed) y el menú respeta los roles `vendedor` / `encargado`. |
| `mobile.spec.ts` | En viewport de celular (Pixel 7): menú lateral, venta completa en el POS, sin scroll horizontal. |

Cada corrida crea usuarios con sufijo único, así que se puede repetir sin limpiar la base.
