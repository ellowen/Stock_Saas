# Plan de mejoras – Clothing Stock SaaS

## Estado

| # | Mejora | Estado |
|---|--------|--------|
| 1 | Confirmación antes de borrar (sucursales, usuarios) | Hecho |
| 2 | Filtros y búsqueda en Inventario | Ya existía (búsqueda, categoría, sucursal) |
| 3 | Filtros en Ventas (rango, sucursal) | Pendiente (sucursal ya en Punto de venta) |
| 4 | Paginación en listados grandes | Ya existe en Inventario |
| 5 | Refresco Dashboard (botón Actualizar) | Hecho |
| 6 | Exportar inventario CSV/Excel | Hecho (CSV, Excel .xlsx, PDF en Productos y Stock) |
| 7 | Gráficos en Dashboard | Hecho (Ingresos + Operaciones por día, últimos 7 días) |
| 8 | Modo oscuro con toggle y persistencia | Hecho |

## Detalle por ítem

- **Confirmación borrar**: Modal reutilizable `ConfirmModal`; endpoints DELETE en backend para sucursales y usuarios; botones "Eliminar" con confirmación. Productos: opcional (soft-delete o no permitir si hay ventas).
- **Filtros Ventas**: Añadir filtros por rango de fechas y por sucursal en la página de Ventas.
- **Refresco Dashboard**: Botón "Actualizar" que vuelve a cargar datos; opcional: auto-refresh cada N minutos.
- **Modo oscuro**: Contexto o clase en `html`, toggle en header/layout, guardar preferencia en `localStorage`.

## Implementado en esta sesión

1. **Confirmación al borrar**: Componente `ConfirmModal`; DELETE en backend para sucursales (soft-delete) y usuarios (soft-delete, no se puede eliminar el único OWNER); botones "Eliminar" con confirmación en Sucursales y Usuarios.
2. **Refresco Dashboard**: Botón "Actualizar" en el header del panel que recarga los datos; estado "Actualizando…" y botón "Reintentar" en caso de error.
3. **Modo oscuro**: `ThemeContext` con persistencia en `localStorage` (clave `giro-theme`); toggle sol/luna en el header del layout; clases `dark:` en sidebar, header, Dashboard; aplicación del tema en `main.tsx` antes del primer paint.
4. **Filtros en Ventas / Historial**: Backend `listSales` acepta `from` y `to` (YYYY-MM-DD); pestaña "Historial" en Ventas con filtros sucursal, desde, hasta y tabla de ventas (fecha, sucursal, total, ítems, pago, vendedor).
5. **Inventario – filtros**: Debounce 400 ms en búsqueda (productos y stock); etiquetas "Nombre o SKU", "Categoría", "Sucursal"; Enter dispara búsqueda con el valor actual; modo oscuro en filtros, tablas y botones.
6. **Modo oscuro en más páginas**: Inventario (filtros, tablas, botones), Reportes (sección hoy, reporte por período, inputs), Ventas (tabs, historial, carrito, inputs).
7. **Exportar inventario a Excel**: Botones "Exportar Excel" en pestañas Productos y Stock por sucursal; descarga .xlsx con la misma información que CSV (productos: nombre, categoría, marca, talle, color, SKU, código de barras, precio, costo; stock: sucursal, código, producto, categoría, talle, color, SKU, cantidad). Librería `xlsx` (SheetJS).
8. **Gráficos en Dashboard**: Dos gráficos en grid (2 columnas en desktop): "Ingresos (últimos 7 días)" (AreaChart) y "Operaciones por día (últimos 7 días)" (BarChart con cantidad de ventas por día).

## Mejoras adicionales (criterio)

- **Historial de ventas**: Fechas por defecto “Desde” = primer día del mes actual, “Hasta” = hoy; mensaje cuando no hay resultados: “Probá otro rango de fechas o sucursal.”
- **Reportes**: Validación “Desde” ≤ “Hasta”; mensaje “La fecha Desde debe ser anterior o igual a Hasta” y botón “Ver reporte” deshabilitado cuando el rango es inválido.
- **Título del documento**: `document.title` se actualiza por ruta (ej. “Inicio - GIRO”, “Inventario - GIRO”) en el layout.
- **Sesión expirada (401)**: Helper `authFetch()` en `api.ts` que ante 401 limpia el token y redirige a `/login`. Usado en Dashboard, Reportes, Ventas (branches, historial), Inventario (branches, categories, products, inventory).

## Mejoras futuras y despliegue

Para ideas de **mejoras futuras** (POS, inventario, reportes, PWA, etc.) y **dónde subir la app a la nube** (Vercel, Render, PlanetScale, etc.) con opciones gratuitas o de bajo costo, ver **[MEJORAS-FUTURAS.md](./MEJORAS-FUTURAS.md)**.
