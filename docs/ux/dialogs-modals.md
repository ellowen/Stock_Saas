# Dialogs / Modals

Ver `DESIGN_SYSTEM.md` sección "Patrón de modal vs. inline" para la jerarquía completa (inline > panel in-place > modal). Este documento agrega el detalle de implementación.

## Componentes

`Modal.tsx` es la base (usada directamente para formularios de alta/edición de entidad secundaria: nuevo proveedor, nueva promoción). `ConfirmModal.tsx` es una capa sobre `Modal` especializada en confirmación destructiva (`variant: danger/warning/default`) — es el único patrón de confirmación en toda la app, nunca usar `window.confirm()`.

## Caso de estudio: `PaymentModal` → `PaymentPanel`

El rediseño del POS reemplazó explícitamente un modal de pago flotante por un panel in-place que reemplaza el área del carrito sin taparlo con un overlay — la razón fue que el pago es el paso más frecuente del flujo completo (cada venta pasa por ahí), y un modal interrumpe visualmente más de lo que un flujo de alta frecuencia debería tolerar. Es el ejemplo de referencia para decidir "¿este modal debería ser un panel in-place?": si la acción ocurre en la mayoría de las interacciones del módulo, probablemente sí.

## Accesibilidad de modales (no confirmada, ver `ACCESSIBILITY.md`)

No se auditó si `Modal.tsx` implementa focus trap y `aria-modal` — pendiente antes de dar por buena la accesibilidad de este patrón.
