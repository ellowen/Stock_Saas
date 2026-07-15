# Business Rules — Invoices (Facturas)

Una factura es un `Document` de `type: INVOICE` (ver `modules/Documents.md`) — no hay integración con AFIP/facturación electrónica confirmada en esta investigación (no se encontró ningún servicio de facturación electrónica argentina, CAE, etc.). Es, hoy, un comprobante interno imprimible/PDF, no una factura fiscalmente válida ante AFIP. Si el objetivo de producto incluye facturación electrónica real, es una integración externa completamente nueva a evaluar (WSFE de AFIP u otro proveedor), no una extensión menor del `DocumentService` actual.
