# Business Rules — Suppliers

Ver `modules/Suppliers.md`. Un proveedor se relaciona con el negocio únicamente a través de órdenes de compra — no hay concepto de "cuenta por pagar" (el equivalente, del lado de proveedores, a `AccountReceivable` del lado de clientes). Esto significa que hoy no hay forma de registrar que "le debemos $X a este proveedor" más allá de mirar el estado de sus órdenes de compra recibidas — no hay un módulo de cuentas por pagar.
