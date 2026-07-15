# Pagination

`Pagination.tsx` (componente compartido) — patrón simple de Anterior/Siguiente confirmado en Audit y algunos listados de reportes. No se confirmó si todos los listados grandes (Products, Documents, Purchase Orders) están paginados server-side o si algunos traen todo y paginan/ordenan client-side — a auditar módulo por módulo si el volumen de datos crece y aparecen listados lentos. `GET /products` sí confirma `page`/`pageSize` explícitos; otros endpoints no fueron confirmados con el mismo detalle en esta ronda.
