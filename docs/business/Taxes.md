# Business Rules — Taxes

`TaxConfig` (tasa de impuesto) existe como modelo y se aplica por ítem en Documents (`DocumentItem.taxConfigId`/`taxAmount`) y, presumiblemente, en Sales (a confirmar el detalle exacto si se retoma). No se confirmó en esta ronda si hay más de una tasa vigente simultánea por empresa (ej. IVA general + IVA reducido) ni cómo se asigna una tasa a un producto/variante específico — pendiente de profundizar si se necesita documentar el modelo fiscal completo (relevante para el libro IVA de Accounting).
