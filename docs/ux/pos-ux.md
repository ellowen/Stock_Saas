# POS UX — Caso de estudio completo

Ver `modules/POS.md` para el detalle funcional. Este documento es el resumen de decisiones de UX tomadas durante el rediseño de 2026-07-11, como referencia para aplicar el mismo criterio a otros módulos.

## Decisiones tomadas y por qué

1. **`PaymentModal` → `PaymentPanel`**: un modal interrumpe demasiado un paso que ocurre en el 100% de las ventas — se reemplazó por un panel in-place. Ver `ux/dialogs-modals.md`.
2. **Hold/resume server-side, no `localStorage`**: para que un cajero pause una venta y la retome desde otro dispositivo o el turno siguiente.
3. **Carga inicial en paralelo** (branch + inventory), no secuencial — reduce el tiempo hasta que el cajero puede empezar a escanear.
4. **Ranking de búsqueda por relevancia**, no alfabético — prioriza lo que el cajero probablemente busca.
5. **Mobile-first real**: se diseñó la versión angosta primero, no se derivó de achicar el desktop — resultó en el patrón de "colapsar detalle secundario detrás de un toggle" que después se generalizó como regla (`ux/responsive-rules.md`).
6. **Permisos inline, no por ruta**: `SALES_DISCOUNT`/`SALES_PRICE_OVERRIDE` se chequean según el contenido del request, no bloqueando toda la pantalla — una venta sin descuento no necesita ningún permiso especial.

## Por qué este documento importa para el resto del proyecto

El POS es, hoy, el único módulo que pasó por un proceso completo de "identificar problema de UX → rediseñar → medir el resultado en código real". Es la plantilla de proceso a repetir si se decide invertir el mismo esfuerzo en otro módulo (Inventory y Purchases son los candidatos más evidentes por volumen de uso diario).
