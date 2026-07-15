# POS — Punto de venta

## Propósito

Pantalla de cobro rápido para cajero: buscar producto (incluyendo scanner de código de barras), armar carrito, aplicar descuentos/promociones, cobrar y emitir recibo.

## Reglas de negocio

El cálculo final (descuentos, promociones automáticas, cupones, total) **siempre se recalcula server-side** al confirmar la venta — el preview que muestra el frontend nunca es la fuente de verdad. `SALES_DISCOUNT`/`SALES_PRICE_OVERRIDE` se agregaron como permisos dedicados en el rediseño de 2026-07-11: antes, cualquier `SELLER` podía aplicar descuentos sin restricción.

## Workflow (4 estados de pantalla)

1. **Búsqueda**: input único acepta tanto texto como `Barcode+ENTER` (el lector de código de barras se comporta como teclado). Match exacto de barcode prioritario sobre búsqueda de texto (fix del rediseño, commit `0010df3`). Resultados rankeados por relevancia.
2. **Carrito**: edición inline de cantidad, descuento por línea (si `SALES_DISCOUNT`), override de precio (si `SALES_PRICE_OVERRIDE`) — todo inline en `CartItem`, sin modales, siguiendo el principio de "inline > panel > modal" (ver `DESIGN_SYSTEM.md`).
3. **Pago**: desde el 2026-07-15, `PaymentPanel` ya **no reemplaza** el carrito — se agrega como sección debajo de la lista de ítems, dentro del mismo panel derecho fijo, así el carrito queda visible durante todo el cobro (antes reemplazaba `PaymentModal`, y luego reemplazaba el área del carrito entera; ambos enfoques hacían perder de vista qué se estaba vendiendo). Soporta métodos `CASH/CARD/MIXED/OTHER/CREDIT` (CREDIT requiere cliente seleccionado, deshabilitado con tooltip si no hay uno).
4. **Completado**: recibo con opción de envío por email o WhatsApp (feature del rediseño).

**Hold/resume**: pausar una venta en curso persiste el carrito server-side como `HeldSale` (JSON snapshot) — deliberadamente no en `localStorage`, para que un cajero pueda retomarla desde otro dispositivo/turno.

## UX / Frontend

Mobile-first real (no solo el layout desktop achicado) — en `<640px` colapsa detalle secundario de línea de carrito detrás de un toggle. Carga inicial de sucursal+inventario en paralelo (optimización del rediseño, antes era secuencial/waterfall).

**Layout de escritorio (2026-07-15)**: hasta esa fecha, el módulo entero — mobile-first incluido — tenía un `max-w-2xl` fijo en el contenedor raíz, así que en pantallas grandes quedaba una columna angosta centrada con mucho espacio muerto al costado, y encima cobrar reemplazaba el carrito por la pantalla de pago (perdiendo de vista qué se estaba vendiendo). Se rediseñó a un layout de dos paneles en `lg+` (1024px): columna izquierda flexible (búsqueda/contexto) + panel derecho fijo de 400px (carrito + pago, siempre visible, nunca se reemplaza). Mobile/tablet sin cambios. Ver `ux/pos-ux.md` y `ROADMAP.md`.

## Navegación

`/app/sales`, ícono `IconShoppingCart`, sin permiso requerido para acceder al módulo en sí (todos los roles venden); los permisos granulares controlan capacidades dentro de la pantalla (descuento, override, anular).

## Permisos

`SALES_DISCOUNT`/`SALES_PRICE_OVERRIDE` chequeados **inline en el controller**, condicionados al contenido del request (una venta sin descuentos no exige ningún permiso especial) — este es el patrón correcto y ya funciona bien, a diferencia de la mayoría de los demás módulos. `SALES_VOID` (anular) y `SALES_HISTORY` (ver historial completo, no solo propio) son permisos separados.

## Tablas / Modelo

`Sale` (`paymentMethod, status, ...montos`), `SaleItem`, `SaleReturn`/`SaleReturnItem`, `HeldSale` (snapshot JSON del carrito pausado).

## Relaciones

Venta a crédito con cliente genera `AccountReceivable` automáticamente (ver `modules/AccountsReceivable.md`). Promociones se calculan vía `PromotionService` (ver `modules/Promotions.md`).

## Mejoras futuras

Este es el módulo con más trabajo de UX ya invertido de toda la app — es la referencia a seguir para el resto. Pendiente: vincular `Sale.documentId` si se decide que una venta debe emitir su comprobante automáticamente (ver `modules/Documents.md`).

## Problemas conocidos

El único encontrado (el layout de escritorio no usaba el ancho de pantalla y el pago tapaba el carrito) fue reportado por el usuario probando la app real y se resolvió el 2026-07-15 — ver arriba. Fuera de eso, ninguno nuevo: el módulo fue auditado exhaustivamente durante su propio rediseño (Fase POS 2026-07-11), a diferencia de la mayoría de los otros módulos que recién se revisaron en la ronda de documentación.

## Preguntas abiertas

Ninguna pendiente de este módulo en particular — es el caso de éxito a replicar en UX para el resto de la app.
