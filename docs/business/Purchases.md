# Business Rules — Purchases

Ver `modules/Purchases.md`. Una orden de compra representa la intención de comprar a un proveedor; solo al **recibir** mercadería (total o parcialmente) se afecta inventario y contabilidad. Esto separa claramente "comprometido" de "efectivamente en stock" — una OC en `DRAFT`/`SENT` no reserva ni promete stock de ninguna forma (no hay concepto de "stock comprometido en camino" visible en reportes, sería una extensión posible si se necesita planificación de reposición más fina, complementaria al módulo de sugerencias de reposición que ya existe en Inventory).
