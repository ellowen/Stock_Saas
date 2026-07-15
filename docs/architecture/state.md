# State (detalle)

Ver `STATE_MANAGEMENT.md` (raíz) para el contenido completo — este archivo existe por la estructura de carpetas pedida, apunta al documento raíz en vez de duplicar contenido. Resumen: sin Zustand/Redux, Context solo para Auth/Toast/Theme, hooks por módulo para todo el resto, estado de servidor como fuente de verdad (no hay cache client-side tipo React Query/SWR confirmado — cada hook hace su propio fetch y guarda el resultado en `useState`).

## Nota no cubierta antes: sin capa de cache/sincronización

No se confirmó el uso de React Query, SWR, o similar — cada hook de módulo (`useSales`, `useStock`) implementa su propio fetch+loading+error a mano. Esto es consistente en todo el código, pero significa que no hay invalidación de cache automática ni refetch en foco de ventana; cada pantalla debe refrescar manualmente si necesita datos actualizados tras una mutación en otra pestaña/pantalla.
