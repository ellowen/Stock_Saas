# Loading States

`Skeleton.tsx` para listas/tablas en carga inicial — preferido sobre un spinner centrado que oculte todo el layout (permite al usuario anticipar la forma del contenido). Confirmado en uso en al menos las tablas con sorting (commit `57914ff "feat: hover actions, sorting y skeletons en tablas"`). No confirmado si todos los módulos migraron a este patrón o si alguno todavía usa un spinner genérico — a verificar módulo por módulo.
