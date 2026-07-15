# Documents — Comprobantes imprimibles

## Propósito

Emitir comprobantes (presupuesto, remito, factura, nota de crédito) con numeración e impresión/PDF, independientes del módulo de Ventas.

## Reglas de negocio

4 tipos: `QUOTE, REMITO, INVOICE, CREDIT_NOTE`. Numeración correlativa por `companyId + type` (cada tipo tiene su propia secuencia). Solo `REMITO`/`INVOICE` afectan inventario (decrementan stock al emitir, lo revierten al cancelar). `QUOTE`/`CREDIT_NOTE` no tocan stock.

**Documents y Sales son independientes**: `Sale.documentId` existe en el schema pero ningún código lo popula — no hay integración real entre ambos módulos hoy pese a la FK.

## Workflow

`create()` siempre pone el documento en `ISSUED` directamente (nunca `DRAFT`, pese a ser el default del schema) → opcionalmente `cancel()` (revierte stock si era REMITO/INVOICE) → un `QUOTE` puede convertirse en `INVOICE` (`/convert-to-invoice`, marca el quote `ACCEPTED`) → una `INVOICE` puede generar una `CREDIT_NOTE` ligada (`/credit-note`, con `relatedDocId`).

**Resuelto 2026-07-15**: `update()` exigía `status==="DRAFT"` para editar, pero como `create()` nunca deja un documento en `DRAFT`, el endpoint siempre fallaba — código inalcanzable. Se relajó el guard para permitir editar `notes`/`dueDate`/`customerId` mientras el documento no esté `CANCELLED` (esos tres campos no afectan totales ni stock, son seguros de tocar en cualquier otro estado). Verificado con script: crear un documento (queda `ISSUED`) y editarlo funciona. **Sigue sin haber ningún botón/formulario en `DocumentsPage.tsx` que llame a este endpoint** — el fix hace que el método sea correcto y usable por API, pero la UI para editarlo no existe todavía (nadie lo pidió como feature, solo se corrigió que el código no fuera lógicamente inalcanzable).

## UX / Frontend

`DocumentsPage.tsx`: tabs lista/nueva, selector de tipo, ítems con descuento por línea. Al crear, abre `DocumentPreviewModal` (toggle "mostrar precios", útil para imprimir un remito sin precios) con botones Imprimir/Descargar PDF. `DocumentTemplate.tsx` + `usePrintDocument.ts` (html2canvas + jsPDF, multi-página) es la plantilla real de impresión — reusable, y de hecho **debería** ser reusada por Purchases, que hoy tiene su propio modal ad-hoc.

## Navegación

`/app/documents`, ícono `IconDocument`, requiere `DOCUMENTS_WRITE`.

## Permisos

`DOCUMENTS_WRITE` gatea el menú y, desde el 2026-07-15, también el backend (`requirePermission` en crear/editar/anular/convertir/nota de crédito). Ver `SECURITY.md`.

## Tablas / Modelo

`Document` (`type, number, status, date, dueDate?, subtotal, taxTotal, discountTotal, total, relatedDocId?`) + `DocumentItem` (`description, quantity, unitPrice, discount, taxConfigId?, taxAmount, totalPrice`). `@@unique([companyId, type, number])`.

## Relaciones

Self-relation `relatedDoc`/`relatedTo` (quote→invoice, invoice→credit note). `customerId` opcional.

## Mejoras futuras

Ver `ROADMAP.md`. Decidir si `Sale.documentId` se implementa de verdad (venta genera su comprobante automáticamente) o se elimina el campo muerto. Unificar impresión con Purchases.

## Problemas conocidos

1. ~~**`update()` es código muerto**~~ — **resuelto 2026-07-15** (ver arriba). Sin UI todavía para usarlo.
2. `POST /` genérico permite crear una `CREDIT_NOTE` suelta, sin `relatedDocId`, sin pasar por el flujo dedicado — pierde trazabilidad a la factura de origen (sin resolver).
3. ~~Sin protección de permiso en backend~~ — **resuelto 2026-07-15**.

## Preguntas abiertas

¿El objetivo de producto es que Sales y Documents converjan (una venta emite su propio comprobante), o son intencionalmente dos flujos separados (venta rápida de mostrador vs. facturación formal)? Esto cambia mucho el diseño futuro de ambos módulos.
