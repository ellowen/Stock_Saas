# Business Rules — Returns (Devoluciones)

`SaleReturn`/`SaleReturnItem` existen en el schema para devoluciones de venta (repone stock de los ítems devueltos). No se auditó en profundidad en esta ronda el efecto contable de una devolución (¿genera un asiento de reversa si `accountingEnabled`? — no confirmado, ver pregunta abierta en `modules/Sales.md`) ni si hay un límite de tiempo o condición para aceptar una devolución (política de negocio, no modelada explícitamente en el schema hasta donde se investigó).
