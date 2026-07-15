# Buttons

`Button.tsx` (`components/ui/`) envuelve `.btn-primary`/`.btn-secondary`. Variantes confirmadas: primaria (acción principal de la pantalla, una sola por vista idealmente), secundaria (cancelar, volver). No se confirmó una variante "danger" dedicada de botón (distinta de `ConfirmModal`, que ya cubre el caso destructivo con confirmación) — a verificar si algún flujo necesita un botón destructivo directo sin modal (ej. quitar un ítem de una lista inline).

Ver `ux/color-usage.md` para el problema de qué tono de azul usa el botón primario según la pantalla.
