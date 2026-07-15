# UX_GUIDELINES

Ver `DESIGN_SYSTEM.md` para el detalle visual (paleta, clases, componentes). Este documento es sobre *decisiones de interacción*, no de estilo.

## Principios (validados en el rediseño del POS, a extender al resto de la app)

1. **Velocidad y mínimos clics** antes que estética. Un cajero cobrando 40 ventas por turno no debería tener más pasos de los estrictamente necesarios.
2. **Inline > panel in-place > modal**, en ese orden de preferencia (jerarquía real, ver `DESIGN_SYSTEM.md` sección "Patrón de modal vs. inline"). Modal se reserva para confirmaciones destructivas y formularios de alta de entidades secundarias, no para el flujo principal de una pantalla.
3. **El código de barras es un teclado.** Cualquier campo de búsqueda de producto debe aceptar `Barcode+ENTER` como flujo primario, no como agregado — confirmado ya implementado en el POS (commit `0010df3`, match exacto de scanner).
4. **Ocultar vs. deshabilitar un control por falta de permiso**: el patrón dominante hoy es ocultar (más simple), pero deja al usuario sin entender *por qué* no ve una opción. El patrón recomendado, ya usado en `PaymentPanel` para "cuenta corriente sin cliente seleccionado", es **deshabilitar + tooltip explicando qué falta** — más trabajo, mejor experiencia. Adoptar este segundo patrón de forma consistente es una mejora de UX pendiente, no un principio ya cumplido en toda la app.

## Inconsistencias de UX ya encontradas (para no repetir el mismo error en un módulo nuevo)

- **Exportar debería respetar los filtros activos de la pantalla.** Hoy `StockTab` (Inventario) exporta CSV/Excel/PDF ignorando los filtros aplicados en la tabla — un usuario que filtró por sucursal y exporta, espera recibir solo esa sucursal. Al construir un export nuevo, siempre pasar los filtros activos a la query de export.
- **Dos tonos de azul de acento conviviendo** (`indigo-*` vs `primary-*`, ver `DESIGN_SYSTEM.md`) — decidir uno antes de sumar una pantalla nueva.
- **Labels faltantes para valores de enum** (ej. `MOVEMENT_TYPE_LABELS` no traduce 3 de los 8 valores de `InventoryMovementType`) — al agregar un valor a un enum que se muestra en UI, buscar y actualizar el mapa de labels correspondiente en el mismo commit.
- **Fetch crudo sin el wrapper estándar** (`CustomersPage.tsx`, `AuditPage.tsx` no usan `authFetch`) — rompe el manejo uniforme de sesión expirada/suscripción vencida. Toda pantalla nueva debe usar `authFetch`.

## Vacíos, carga y feedback

- Estado vacío: `EmptyState.tsx` (título + descripción + acción opcional), no un `<p>` suelto.
- Loading: `Skeleton.tsx` para listas/tablas en carga inicial, no un spinner genérico centrado que oculte todo el layout.
- Confirmación destructiva: siempre `ConfirmModal`, nunca `window.confirm()`.
- Notificación transitoria: `ToastContext`, no un `alert()`.

## Pendiente de escribir (referenciado desde `DESIGN_SYSTEM.md` pero no creado aún)

`ux/permissions-ux.md`, `ux/dialogs-modals.md`, `ux/responsive-rules.md`, `ux/barcode-scanner-ux.md`, `ux/pos-ux.md` y el resto del set de `/docs/ux/` — se abordan en la siguiente pasada de documentación (ver tarea de `/docs/ux` en el roadmap de este mismo trabajo de documentación).
