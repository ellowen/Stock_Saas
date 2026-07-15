# Barcode Scanner UX

Principio de producto: un lector de código de barras se comporta como un teclado que tipea rápido y termina con ENTER. Cualquier campo de búsqueda de producto debería aceptar ese patrón sin configuración especial.

## Implementado

POS: campo de búsqueda único acepta texto o barcode, con **match exacto de barcode priorizado** sobre la búsqueda de texto parcial (fix explícito del rediseño, commit `0010df3` — antes de este fix, un barcode que coincidía parcialmente con el texto de otro producto podía traer el resultado equivocado).

## No confirmado / probablemente pendiente

Inventario (ajuste de stock por escaneo directo), Compras (recepción de mercadería escaneando cada bulto), Conteo físico (`StockCountTab`) — ninguno de estos flujos fue confirmado con soporte de scanner en esta ronda de investigación. Si el objetivo de producto es "scan-first" en toda la app (como plantea el brief original), estos son los candidatos obvios a extender el patrón ya probado en el POS.
