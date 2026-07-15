# Reports — Reportes

## Propósito

Análisis de ventas por período, productos top, forma de pago, categorías y detección de productos sin movimiento, con exportación a CSV/PDF/PNG.

## Reglas de negocio

Todos los endpoints (`overview`, `report-detail`, `products-without-movement`, `top-products`, `sales-by-day`) exigen `requireRole(["OWNER","MANAGER"])` — **no** `requirePermission("REPORTS_VIEW")`, pese a que ese permiso existe y el frontend sí lo respeta para el gate de navegación.

## Workflow

Reporte de período: el usuario elige rango (presets 7/30/mes/mes anterior o custom) → se piden **dos** llamadas a `report-detail` (rango actual + rango anterior calculado) para mostrar comparación período a período.

## UX / Frontend

`ReportsPage.tsx` + `useReports.ts` + secciones en `pages/reports/sections/`: `SalesSummary`, `PeriodComparison`, `SalesByDay`, `PaymentBreakdown` (split de `MIXED` en CASH/CARD real usando los montos guardados), `TopProducts`, `NoMovementReport` (filtro por días + sucursal).

Exportación: CSV a mano (`escapeCsvCell` + BOM), PDF con `jsPDF`+`jspdf-autotable` para tablas, y `html2canvas` para capturar los 4 gráficos Recharts como imágenes en un PDF multi-página. Cada gráfico también se exporta individualmente como PNG.

## Navegación

`/app/reports`, ícono `IconChart`, requiere `REPORTS_VIEW`.

## Permisos

Backend: solo rol (`OWNER`/`MANAGER`), ignora `UserPermission` overrides de `REPORTS_VIEW`. Ver `SECURITY.md`.

## Tablas / Modelo

No tiene modelo propio — agrega `Sale`, `SaleItem`, `Inventory`, `InventoryMovement` vía `groupBy` de Prisma + post-procesamiento en JS.

## Mejoras futuras

Cambiar `requireRole` por `requirePermission("REPORTS_VIEW")` para que un override real tenga efecto. Evaluar mover el armado de `salesByDayLast7` (hecho manualmente en JS) a una agregación SQL si el volumen de ventas crece.

## Problemas conocidos

Un OWNER que le revoque `REPORTS_VIEW` a un MANAGER no logra nada — el MANAGER sigue pudiendo pegarle a los 5 endpoints de reportes vía API, porque el middleware solo mira el rol. El frontend sí respeta el permiso (oculta el ítem de menú y redirige), pero es protección cosmética.

## Preguntas abiertas

Ninguna de producto — el módulo está bien pensado funcionalmente; el único pendiente es cerrar la brecha de enforcement de permisos, igual que en el resto del sistema.
