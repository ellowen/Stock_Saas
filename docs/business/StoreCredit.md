# Business Rules — Store Credit (Crédito a favor del cliente)

**No implementado como concepto distinto de la cuenta corriente.** `AccountReceivable` modela deuda del cliente hacia la tienda, no al revés — no hay un mecanismo para registrar que la tienda le debe saldo a un cliente (ej. por una devolución sin reembolso en efectivo, a cambio de crédito para una compra futura). Si el negocio lo necesita, es conceptualmente el espejo de `AccountsReceivable` y podría diseñarse de forma simétrica, pero no existe hoy ni parcialmente.
