# PERFORMANCE — Estado real, no aspiracional

No hubo un trabajo de performance dedicado documentado en el historial del proyecto; lo que sigue son observaciones puntuales encontradas durante la investigación de módulos, no un audit sistemático.

## Puntos calientes conocidos

- **Exportación de reportes** (`ReportsPage.tsx`): `html2canvas` capturando 4 gráficos Recharts como imágenes para armar un PDF multi-página — es trabajo pesado de rendering en el cliente, aceptable para un export manual poco frecuente, pero no escalaría a un flujo de uso continuo.
- **`StockTab` de Inventario**: los botones de exportar CSV/Excel/PDF traen **todo** el inventario de la empresa sin filtros (`GET /inventory` sin query params), incluso si la tabla en pantalla está filtrada — además de ser un bug de UX (ver `modules/Inventory.md`), en una empresa con catálogo grande esto es una descarga innecesariamente pesada.
- **`xlsx` desde CDN**: el paquete de SheetJS se carga desde el CDN oficial (no desde npm, porque la versión de npm está abandonada con CVEs) — esto acopla el build/runtime a la disponibilidad de un CDN externo. Ver `ARCHITECTURE.md`.
- **Reordenamiento client-side** (`useSortable` en varias tablas): el sort de tablas grandes se hace en el array ya traído al cliente, no server-side — razonable mientras las listas sean del tamaño típico de una tienda, revisar si algún listado crece a miles de filas sin paginación real.

## Backend

- Los reportes (`analytics.service.ts`) hacen varios `groupBy`/agregaciones en Prisma más algo de post-procesamiento en JS (ej. `salesByDayLast7` se arma manualmente en JS iterando ventas, en vez de un `groupBy` por día en SQL) — funciona bien al volumen actual, pero es candidato a mover a SQL si el volumen de ventas crece mucho.
- No se confirmó en esta ronda la existencia de caching (Redis o similar) en ningún endpoint — todo es lectura directa a MySQL en cada request.

## Qué falta para tener una postura real de performance

- No hay presupuesto de performance definido (ej. "un listado no debería tardar más de Xms").
- No hay monitoreo de queries lentas en producción (no hay APM configurado, a confirmar).
- No hay tests de carga.

Este documento debería actualizarse con datos reales una vez haya tráfico de producción — hoy es una lista de riesgos observados en el código, no de problemas medidos.
