# Components (detalle)

Ver `COMPONENT_LIBRARY.md` (raíz) para el inventario completo de `components/ui/` y compartidos. Este documento agrega la regla de cuándo un componente sube de "propio de un módulo" a "compartido".

## Regla observada (no escrita antes, inferida del código real)

Un componente nace dentro de `pages/<modulo>/components/`. Sube a `components/ui/` (genérico) o a una carpeta de dominio compartida (ej. `components/documents/`) recién cuando un **segundo** módulo lo necesita — no se generaliza preventivamente. Ejemplo de generalización correcta: `ConfirmModal` nació de una necesidad puntual y hoy es el único patrón de confirmación destructiva en toda la app. Ejemplo de generalización que **no** pasó pese a que debería: `DocumentTemplate`/`usePrintDocument` (sistema de impresión de Documents) no fue reusado por Purchases, que armó su propio modal de impresión ad-hoc con `window.print()` — una oportunidad perdida de compartir, señalada como mejora futura en `modules/Documents.md` y `modules/Purchases.md`.
