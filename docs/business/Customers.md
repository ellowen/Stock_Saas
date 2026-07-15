# Business Rules — Customers

Ver `modules/Customers.md`. Un cliente es opcional en una venta (venta de mostrador anónima es válida) salvo que el método de pago sea `CREDIT`, en cuyo caso el cliente es obligatorio para que se genere la cuenta por cobrar correspondiente (ver `modules/AccountsReceivable.md`). No hay niveles/segmentos de cliente (ej. mayorista vs. minorista con precios distintos) — es un maestro simple sin lógica de pricing diferenciado por cliente.
